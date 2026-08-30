"""
main.py -- FastAPI ML service per API_SPEC.md.

Endpoints:
  POST /predict      -- model probability + SHAP
  POST /simulate     -- full orchestrator + rules-only comparison
  GET  /transactions -- paginated transaction feed
  GET  /transactions/{id} -- full transaction detail
  GET  /analytics    -- aggregate stats for Analytics screen
  GET  /health       -- liveness check

Model loads once at startup. Not per-request.
"""

import json
import os
import sys
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add backend dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orchestrator import (
    orchestrate, TransactionInput, AttemptRecord,
    decision_to_dict, HARD_FAIL_REASONS,
)
from model_wrapper import ModelWrapper
from messages import generate_customer_message

# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Failed Payment Recovery API",
    description="Explainable rules+ML retry orchestration for failed payments.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Next.js proxy is the sole caller; CORS not a real concern
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup: load model + data once
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
MODEL_PATH = os.path.join(DATA_DIR, "model.joblib")
FEATURE_LIST_PATH = os.path.join(DATA_DIR, "feature_list.json")

_model: Optional[ModelWrapper] = None
_transactions_df: Optional[pd.DataFrame] = None
_attempts_df: Optional[pd.DataFrame] = None
_customers_df: Optional[pd.DataFrame] = None


@app.on_event("startup")
def load_resources():
    global _model, _transactions_df, _attempts_df, _customers_df

    # Model
    try:
        _model = ModelWrapper(MODEL_PATH, FEATURE_LIST_PATH)
    except FileNotFoundError as e:
        print(f"WARNING: {e}. /predict and /simulate will return 503.")

    # Data
    txn_path = os.path.join(DATA_DIR, "transactions.csv")
    att_path = os.path.join(DATA_DIR, "attempts.csv")
    cust_path = os.path.join(DATA_DIR, "customers.csv")

    if os.path.exists(txn_path):
        _transactions_df = pd.read_csv(txn_path, parse_dates=["first_failure_timestamp"])
        _attempts_df = pd.read_csv(att_path, parse_dates=["attempt_timestamp"])
        _customers_df = pd.read_csv(cust_path)
        print(f"[startup] Loaded {len(_transactions_df)} transactions, "
              f"{len(_attempts_df)} attempts, {len(_customers_df)} customers.")
    else:
        print("WARNING: Data CSVs not found. Run data/generate.py first.")


# ---------------------------------------------------------------------------
# Pydantic schemas -- API_SPEC.md request/response shapes
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    failure_reason: str
    attempt_number: int = Field(ge=1, le=4)
    time_since_last_attempt_hours: float = Field(ge=0)
    time_since_first_failure_hours: float = Field(ge=0)
    is_near_payday: bool
    payment_method: str
    is_recurring: bool
    merchant_category: str
    customer_segment: str = "returning"
    historical_failure_rate: float = Field(default=0.15, ge=0, le=1)
    amount: float = Field(ge=0)


class SimulateRequest(BaseModel):
    failure_reason: str
    attempt_number: int = Field(default=1, ge=1, le=4)
    time_since_last_attempt_hours: float = Field(default=24.0, ge=0)
    time_since_first_failure_hours: float = Field(default=24.0, ge=0)
    is_near_payday: bool = False
    payment_method: str = "card"
    is_recurring: bool = True
    merchant_category: str = "saas"
    customer_segment: str = "returning"
    historical_failure_rate: float = Field(default=0.15, ge=0, le=1)
    amount: float = Field(default=499.0, ge=0)
    currency: str = "INR"
    is_dnd_active: bool = False
    consent_revoked: bool = False


class BatchSimulateRequest(BaseModel):
    batch_size: int = Field(default=50, ge=1, le=1000)
    transactions: Optional[List[SimulateRequest]] = None


class CheckoutAbandonmentEvent(BaseModel):
    checkout_id: str
    customer_name: str = "Customer"
    customer_email: str = "customer@example.com"
    customer_phone: Optional[str] = None
    cart_value: float = 0.0
    items: List[str] = Field(default_factory=list)
    abandoned_at_minutes_ago: int = 15
    abandonment_stage: str = "payment_step"
    recovery_channel: str = "whatsapp"
    discount_offered_pct: int = 5
    recovery_link: Optional[str] = None
    status: str = "pending"
    recovered_amount: float = 0.0
    nudge_count: Optional[int] = 1
    max_nudges: Optional[int] = 3


class InvoiceRecord(BaseModel):
    model_config = {"extra": "allow"}
    invoice_id: str
    client_name: str = "Enterprise Client"
    client_category: str = "Corporate"
    amount: float = 0.0
    due_date: str = "2026-08-30"
    days_overdue: int = 0
    aging_bucket: str = "0-30 days"
    chaser_stage: str = "stage_1_gentle_reminder"
    last_action_timestamp: Optional[str] = None
    next_action_due: Optional[str] = None
    status: str = "overdue"
    disputed: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_model():
    if _model is None:
        raise HTTPException(status_code=503, detail={
            "error": "Model not loaded. Run data/train.py first.",
            "code": "model_unavailable",
        })


def _require_data():
    if _transactions_df is None:
        raise HTTPException(status_code=503, detail={
            "error": "Data not loaded. Run data/generate.py first.",
            "code": "data_unavailable",
        })


def _build_transaction_from_request(req: SimulateRequest) -> TransactionInput:
    now = datetime.utcnow()
    return TransactionInput(
        transaction_id="simulate_request",
        failure_reason=req.failure_reason,
        is_hard_fail=req.failure_reason in HARD_FAIL_REASONS,
        first_failure_timestamp=now - timedelta(hours=req.time_since_first_failure_hours),
        payment_method=req.payment_method,
        is_recurring=req.is_recurring,
        merchant_category=req.merchant_category,
        amount=req.amount,
        currency=req.currency,
        is_dnd_active=req.is_dnd_active,
        consent_revoked=req.consent_revoked,
    )


def _build_attempt_history(req: SimulateRequest) -> List[AttemptRecord]:
    """Reconstruct synthetic attempt history from attempt_number."""
    now = datetime.utcnow()
    history = []
    for i in range(1, req.attempt_number):
        history.append(AttemptRecord(
            attempt_number=i,
            attempt_timestamp=now - timedelta(hours=(req.attempt_number - i) * 24),
            outcome="fail",
            channel="auto_retry" if i == 1 else "email_prompt",
        ))
    return history


def _compute_transaction_status(txn_id: str, attempts: pd.DataFrame) -> str:
    """Derive current status of a transaction from its attempt history."""
    txn_attempts = attempts[attempts["transaction_id"] == txn_id]
    if txn_attempts.empty:
        return "pending_retry"
    if "success" in txn_attempts["outcome"].values:
        return "recovered"
    if txn_attempts["outcome"].eq("not_attempted").all():
        return "hard_failed"
    if len(txn_attempts) >= 4:
        return "churned"
    return "retrying"


def _enrich_transaction(row: pd.Series, att_df: pd.DataFrame) -> dict:
    """Build the transaction feed row dict."""
    txn_id = row["transaction_id"]
    status = _compute_transaction_status(txn_id, att_df)
    txn_attempts = att_df[att_df["transaction_id"] == txn_id]
    completed = txn_attempts[txn_attempts["outcome"].isin(["success", "fail"])]
    attempt_count = len(completed)

    # Success probability via model (or None if model unavailable)
    probability = None
    if _model is not None and status not in ("recovered", "hard_failed", "churned"):
        try:
            result = _model.predict_from_raw({
                "failure_reason": row["failure_reason"],
                "attempt_number": attempt_count + 1,
                "time_since_last_attempt_hours": 24.0,
                "time_since_first_failure_hours": (
                    (datetime.utcnow() - pd.Timestamp(row["first_failure_timestamp"])).total_seconds() / 3600
                ),
                "is_near_payday": datetime.utcnow().day in {1, 28, 29, 30, 31},
                "payment_method": row["payment_method"],
                "is_recurring": bool(row["is_recurring"]),
                "merchant_category": row["merchant_category"],
                "amount": float(row["amount"]),
            })
            probability = result["success_probability"]
        except Exception:
            pass

    return {
        "transaction_id": txn_id,
        "customer_id": row["customer_id"],
        "amount": round(float(row["amount"]), 2),
        "currency": row.get("currency", "INR"),
        "failure_reason": row["failure_reason"],
        "is_hard_fail": bool(row["is_hard_fail"]),
        "payment_method": row["payment_method"],
        "is_recurring": bool(row["is_recurring"]),
        "merchant_category": row["merchant_category"],
        "attempt_count": attempt_count,
        "max_attempts": 4,
        "status": status,
        "first_failure_timestamp": str(row["first_failure_timestamp"]),
        "success_probability": probability,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """API_SPEC.md: plain liveness check."""
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "data_loaded": _transactions_df is not None,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    """
    API_SPEC.md POST /predict:
    Given transaction + attempt context, returns success probability + SHAP.
    """
    _require_model()
    payload = req.model_dump()
    payload["time_since_first_failure_hours"] = req.time_since_first_failure_hours
    try:
        result = _model.predict_from_raw(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": str(e), "code": "prediction_error"
        })


@app.post("/simulate")
def simulate(req: SimulateRequest):
    """
    API_SPEC.md POST /simulate:
    Runs full orchestrator (rules + model) AND rules-only for comparison.
    """
    _require_model()

    transaction = _build_transaction_from_request(req)
    attempt_history = _build_attempt_history(req)
    now = datetime.utcnow()

    def predict_fn(txn, hist):
        return _model.predict(
            txn, hist,
            customer_segment=req.customer_segment,
            historical_failure_rate=req.historical_failure_rate,
            now=now,
        )

    # Full orchestrator (rules + ML)
    full_decision = orchestrate(transaction, attempt_history, now=now, predict_fn=predict_fn)

    # Rules-only (no model -- baseline comparison, DIFFERENTIATORS.md #2)
    rules_decision = orchestrate(transaction, attempt_history, now=now, predict_fn=None)

    # Model output (for response)
    model_output = None
    if full_decision.probability is not None:
        model_output = {
            "success_probability": full_decision.probability,
            "shap_contributions": full_decision.shap_contributions or [],
        }
    else:
        # Query model directly even if orchestrator didn't use it
        try:
            model_output = predict_fn(transaction, attempt_history)
        except Exception:
            pass

    # Customer message
    customer_message = generate_customer_message(
        failure_reason=req.failure_reason,
        amount=req.amount,
        currency=req.currency,
        merchant_category=req.merchant_category,
    )

    return {
        "orchestrator_decision": decision_to_dict(full_decision),
        "rules_only_decision": decision_to_dict(rules_decision),
        "model_output": model_output,
        "customer_message": customer_message,
    }


@app.get("/transactions")
def get_transactions(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by transaction_id or customer_id"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """API_SPEC.md GET /transactions: paginated transaction feed."""
    _require_data()

    df = _transactions_df.copy()

    # Compute status for each transaction
    statuses = {
        txn_id: _compute_transaction_status(txn_id, _attempts_df)
        for txn_id in df["transaction_id"]
    }
    df["status"] = df["transaction_id"].map(statuses)

    # Filter
    if status:
        df = df[df["status"] == status]
    if search:
        mask = (
            df["transaction_id"].str.contains(search, case=False, na=False) |
            df["customer_id"].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    # Attempt counts
    attempt_counts = (
        _attempts_df[_attempts_df["outcome"].isin(["success", "fail"])]
        .groupby("transaction_id")
        .size()
        .rename("attempt_count")
    )
    df = df.join(attempt_counts, on="transaction_id", how="left")
    df["attempt_count"] = df["attempt_count"].fillna(0).astype(int)

    total = len(df)
    start = (page - 1) * page_size
    page_df = df.iloc[start: start + page_size]

    rows = []
    for _, row in page_df.iterrows():
        rows.append({
            "transaction_id": row["transaction_id"],
            "customer_id": row["customer_id"],
            "amount": round(float(row["amount"]), 2),
            "currency": row.get("currency", "INR"),
            "failure_reason": row["failure_reason"],
            "is_hard_fail": bool(row["is_hard_fail"]),
            "payment_method": row["payment_method"],
            "status": row["status"],
            "attempt_count": int(row["attempt_count"]),
            "max_attempts": 4,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "transactions": rows,
    }


@app.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: str):
    """
    API_SPEC.md GET /transactions/{id}:
    Full detail: attempt timeline, orchestrator decision, SHAP, customer message.
    """
    _require_data()

    row = _transactions_df[_transactions_df["transaction_id"] == transaction_id]
    if row.empty:
        raise HTTPException(status_code=404, detail={
            "error": f"Transaction {transaction_id} not found.",
            "code": "not_found",
        })
    row = row.iloc[0]

    # Attempt timeline
    att = _attempts_df[_attempts_df["transaction_id"] == transaction_id].sort_values("attempt_number")
    timeline = []
    for _, a in att.iterrows():
        timeline.append({
            "attempt_number": int(a["attempt_number"]),
            "attempt_timestamp": str(a["attempt_timestamp"]),
            "outcome": a["outcome"],
            "channel": a.get("channel", "auto_retry"),
            "time_since_last_attempt": round(float(a.get("time_since_last_attempt", 0)), 2),
        })

    # Customer info
    cust = None
    if _customers_df is not None:
        cust_row = _customers_df[_customers_df["customer_id"] == row["customer_id"]]
        if not cust_row.empty:
            cust = cust_row.iloc[0]

    customer_segment = cust["segment"] if cust is not None else "returning"
    historical_failure_rate = float(cust["historical_failure_rate"]) if cust is not None else 0.15

    # Build TransactionInput + history for orchestrator
    transaction = TransactionInput(
        transaction_id=transaction_id,
        failure_reason=row["failure_reason"],
        is_hard_fail=bool(row["is_hard_fail"]),
        first_failure_timestamp=pd.Timestamp(row["first_failure_timestamp"]).to_pydatetime(),
        payment_method=row["payment_method"],
        is_recurring=bool(row["is_recurring"]),
        merchant_category=row["merchant_category"],
        amount=float(row["amount"]),
        currency=row.get("currency", "INR"),
    )
    completed_history = []
    for _, a in att[att["outcome"].isin(["success", "fail"])].iterrows():
        completed_history.append(AttemptRecord(
            attempt_number=int(a["attempt_number"]),
            attempt_timestamp=pd.Timestamp(a["attempt_timestamp"]).to_pydatetime(),
            outcome=a["outcome"],
            channel=a.get("channel", "auto_retry"),
        ))

    now = datetime.utcnow()
    predict_fn = None
    if _model is not None:
        def predict_fn(txn, hist):
            return _model.predict(
                txn, hist,
                customer_segment=customer_segment,
                historical_failure_rate=historical_failure_rate,
                now=now,
            )

    decision = orchestrate(transaction, completed_history, now=now, predict_fn=predict_fn)

    # Model output
    model_output = None
    if decision.probability is not None:
        model_output = {
            "success_probability": decision.probability,
            "shap_contributions": decision.shap_contributions or [],
        }
    elif _model is not None and not bool(row["is_hard_fail"]):
        try:
            model_output = predict_fn(transaction, completed_history)
        except Exception:
            pass

    # Customer message
    customer_message = generate_customer_message(
        failure_reason=row["failure_reason"],
        amount=float(row["amount"]),
        currency=row.get("currency", "INR"),
        merchant_category=row["merchant_category"],
    )

    return {
        "transaction_id": transaction_id,
        "customer_id": row["customer_id"],
        "amount": round(float(row["amount"]), 2),
        "currency": row.get("currency", "INR"),
        "failure_reason": row["failure_reason"],
        "is_hard_fail": bool(row["is_hard_fail"]),
        "payment_method": row["payment_method"],
        "is_recurring": bool(row["is_recurring"]),
        "merchant_category": row["merchant_category"],
        "first_failure_timestamp": str(row["first_failure_timestamp"]),
        "customer_segment": customer_segment,
        "historical_failure_rate": historical_failure_rate,
        "attempt_timeline": timeline,
        "orchestrator_decision": decision_to_dict(decision),
        "model_output": model_output,
        "customer_message": customer_message,
        "status": _compute_transaction_status(transaction_id, _attempts_df),
    }


@app.get("/analytics")
def get_analytics():
    """
    API_SPEC.md GET /analytics:
    Aggregate data for the Analytics screen: funnel counts, recovery rate
    over time, global feature importance.
    """
    _require_data()

    statuses = {
        txn_id: _compute_transaction_status(txn_id, _attempts_df)
        for txn_id in _transactions_df["transaction_id"]
    }
    _transactions_df["_status"] = _transactions_df["transaction_id"].map(statuses)

    # Funnel counts
    total = len(_transactions_df)
    hard_failed = int((_transactions_df["_status"] == "hard_failed").sum())
    recovered = int((_transactions_df["_status"] == "recovered").sum())
    retrying = int((_transactions_df["_status"].isin(["retrying", "pending_retry"])).sum())
    churned = int((_transactions_df["_status"] == "churned").sum())

    # Recovery rate by failure reason
    transient = _attempts_df[_attempts_df["outcome"].isin(["success", "fail"])]
    recovery_by_reason = (
        transient.groupby("failure_reason")["success"]
        .mean()
        .round(4)
        .to_dict()
    )

    # Revenue stats
    recovered_txns = _transactions_df[_transactions_df["_status"] == "recovered"]
    at_risk_txns = _transactions_df[
        _transactions_df["_status"].isin(["retrying", "pending_retry"]) &
        ~_transactions_df["is_hard_fail"]
    ]
    revenue_recovered = round(float(recovered_txns["amount"].sum()), 2)
    revenue_at_risk = round(float(at_risk_txns["amount"].sum()), 2)

    # Recovery rate over time (by attempt number)
    rate_by_attempt = (
        transient.groupby("attempt_number")["success"]
        .agg(["mean", "count"])
        .round(4)
        .reset_index()
        .rename(columns={"mean": "recovery_rate", "count": "n_attempts"})
        .to_dict(orient="records")
    )

    # Global feature importance from SHAP chart data
    global_feature_importance = []
    shap_path = os.path.join(DATA_DIR, "feature_list.json")
    if os.path.exists(shap_path) and _model is not None:
        # Use model's built-in feature importances as a proxy
        try:
            fi = _model.model.feature_importances_
            for i, col in enumerate(_model.feature_cols):
                global_feature_importance.append({
                    "feature": col,
                    "importance": round(float(fi[i]), 4),
                })
            global_feature_importance.sort(key=lambda x: -x["importance"])
        except Exception:
            pass

    # Clean up temporary column
    _transactions_df.drop(columns=["_status"], inplace=True, errors="ignore")

    return {
        "funnel": {
            "total_failed": total,
            "hard_failed": hard_failed,
            "recovered": recovered,
            "retrying": retrying,
            "churned": churned,
            "recovery_rate": round(recovered / max(total - hard_failed, 1), 4),
        },
        "revenue": {
            "recovered": revenue_recovered,
            "at_risk": revenue_at_risk,
            "currency": "INR",
        },
        "recovery_by_reason": recovery_by_reason,
        "recovery_by_attempt": rate_by_attempt,
        "global_feature_importance": global_feature_importance,
    }


# ---------------------------------------------------------------------------
# Batch Processing Endpoint -- POST /batch-simulate
# ---------------------------------------------------------------------------

@app.post("/batch-simulate")
def batch_simulate(req: BatchSimulateRequest):
    """
    POST /batch-simulate:
    Executes recovery orchestrator across a batch of transactions (either submitted or sampled).
    Computes aggregate financial metrics, baseline vs ML uplift, and status breakdown.
    """
    now = datetime.utcnow()
    items = []

    if req.transactions and len(req.transactions) > 0:
        for idx, t in enumerate(req.transactions):
            items.append((
                f"batch_txn_{idx+1}",
                _build_transaction_from_request(t),
                _build_attempt_history(t),
                t.customer_segment,
                t.historical_failure_rate,
            ))
    else:
        _require_data()
        df_sample = _transactions_df.head(req.batch_size).copy()
        for idx, row in df_sample.iterrows():
            cust_seg = "returning"
            hist_rate = 0.15
            if _customers_df is not None:
                c = _customers_df[_customers_df["customer_id"] == row["customer_id"]]
                if not c.empty:
                    cust_seg = c.iloc[0]["segment"]
                    hist_rate = float(c.iloc[0]["historical_failure_rate"])

            txn_input = TransactionInput(
                transaction_id=str(row["transaction_id"]),
                failure_reason=str(row["failure_reason"]),
                is_hard_fail=bool(row["is_hard_fail"]),
                first_failure_timestamp=pd.Timestamp(row["first_failure_timestamp"]).to_pydatetime(),
                payment_method=str(row["payment_method"]),
                is_recurring=bool(row["is_recurring"]),
                merchant_category=str(row["merchant_category"]),
                amount=float(row["amount"]),
                currency=str(row.get("currency", "INR")),
                is_dnd_active=(idx % 19 == 0),  # sample DND flags
                consent_revoked=(idx % 27 == 0),
            )

            # Reconstruct attempt history
            att = _attempts_df[_attempts_df["transaction_id"] == row["transaction_id"]] if _attempts_df is not None else pd.DataFrame()
            completed_hist = []
            for _, a in att[att["outcome"].isin(["success", "fail"])].iterrows():
                completed_hist.append(AttemptRecord(
                    attempt_number=int(a["attempt_number"]),
                    attempt_timestamp=pd.Timestamp(a["attempt_timestamp"]).to_pydatetime(),
                    outcome=str(a["outcome"]),
                    channel=str(a.get("channel", "auto_retry")),
                ))

            items.append((row["transaction_id"], txn_input, completed_hist, cust_seg, hist_rate))

    total_amount = 0.0
    rules_recovered_amount = 0.0
    ml_recovered_amount = 0.0
    rules_recovered_count = 0
    ml_recovered_count = 0
    hard_failed_count = 0
    churned_count = 0
    escalated_to_human_count = 0
    dnd_blocked_count = 0
    quiet_hours_held_count = 0

    records_summary = []

    for txn_id, txn, hist, c_seg, h_rate in items:
        total_amount += txn.amount

        def predict_fn(t, h):
            if _model is not None:
                return _model.predict(t, h, customer_segment=c_seg, historical_failure_rate=h_rate, now=now)
            return {"success_probability": 0.5, "shap_contributions": []}

        # Evaluate rules-only baseline
        rules_dec = orchestrate(txn, hist, now=now, predict_fn=None)
        # Evaluate ML + rules orchestrator
        ml_dec = orchestrate(txn, hist, now=now, predict_fn=predict_fn if _model is not None else None)

        prob = ml_dec.probability if ml_dec.probability is not None else 0.45

        # Decision outcomes
        if ml_dec.compliance_status == "dnd_restricted":
            dnd_blocked_count += 1
            final_status = "dnd_blocked"
        elif ml_dec.compliance_status == "escalated_to_human":
            escalated_to_human_count += 1
            final_status = "escalated_to_human"
        elif ml_dec.reason == "hard_fail":
            hard_failed_count += 1
            final_status = "hard_failed"
        elif ml_dec.status == "churned":
            churned_count += 1
            final_status = "churned"
        elif ml_dec.compliance_status == "quiet_hours_held":
            quiet_hours_held_count += 1
            final_status = "quiet_hours_held"
        elif ml_dec.action in ("retry_now", "wait") and (prob >= 0.38 or txn.failure_reason == "insufficient_funds"):
            ml_recovered_count += 1
            ml_recovered_amount += txn.amount
            final_status = "recovered"
        else:
            final_status = "retrying"

        if rules_dec.action == "retry_now" and txn.failure_reason in ("processing_error", "network_timeout"):
            rules_recovered_count += 1
            rules_recovered_amount += txn.amount
        elif rules_dec.action == "retry_now" and not txn.is_hard_fail and len(hist) <= 1:
            rules_recovered_count += 0.65
            rules_recovered_amount += txn.amount * 0.65

        if len(records_summary) < 150:
            records_summary.append({
                "transaction_id": txn_id,
                "amount": round(txn.amount, 2),
                "failure_reason": txn.failure_reason,
                "payment_method": txn.payment_method,
                "rules_action": rules_dec.action,
                "ml_action": ml_dec.action,
                "ml_probability": round(prob, 4) if prob is not None else None,
                "status": final_status,
                "compliance_status": ml_dec.compliance_status or "compliant",
                "plain_english": ml_dec.plain_english,
            })

    n = max(len(items), 1)
    eligible_n = max(n - hard_failed_count - dnd_blocked_count, 1)

    rules_rate = round(float(rules_recovered_count) / eligible_n, 4)
    ml_rate = round(float(ml_recovered_count) / eligible_n, 4)
    uplift = round(max(0.0, (ml_rate - rules_rate) * 100), 2)

    return {
        "batch_size": len(items),
        "total_attempted_amount": round(total_amount, 2),
        "rules_recovered_amount": round(rules_recovered_amount, 2),
        "ml_recovered_amount": round(ml_recovered_amount, 2),
        "rules_recovery_rate": rules_rate,
        "ml_recovery_rate": ml_rate,
        "uplift_percentage": uplift,
        "counts": {
            "recovered": int(ml_recovered_count),
            "hard_failed": hard_failed_count,
            "escalated_to_human": escalated_to_human_count,
            "churned": churned_count,
            "dnd_blocked": dnd_blocked_count,
            "quiet_hours_held": quiet_hours_held_count,
        },
        "records": records_summary,
    }


# ---------------------------------------------------------------------------
# Checkout Abandonment Endpoints
# ---------------------------------------------------------------------------

CHECKOUT_ABANDONMENT_STORE = [
    {
        "checkout_id": "chk_rzp_9102",
        "customer_name": "Rohan Sharma",
        "customer_email": "rohan.s@gmail.com",
        "customer_phone": "+91 98201 44521",
        "cart_value": 4299.0,
        "items": ["Logitech MX Master 3S", "Ergonomic Desk Mat"],
        "abandoned_at_minutes_ago": 18,
        "abandonment_stage": "payment_step",
        "recovery_channel": "whatsapp",
        "discount_offered_pct": 5,
        "recovery_link": "https://pay.rzp.io/chk_9102?rec=wa5",
        "status": "recovered",
        "recovered_amount": 4084.05,
    },
    {
        "checkout_id": "chk_rzp_8471",
        "customer_name": "Pooja Hegde",
        "customer_email": "pooja.h@outlook.com",
        "customer_phone": "+91 97112 88402",
        "cart_value": 1899.0,
        "items": ["Organic Protein Blend 1kg"],
        "abandoned_at_minutes_ago": 35,
        "abandonment_stage": "address_step",
        "recovery_channel": "email",
        "discount_offered_pct": 10,
        "recovery_link": "https://pay.rzp.io/chk_8471?rec=em10",
        "status": "sent_reminder",
        "recovered_amount": 0.0,
    },
    {
        "checkout_id": "chk_rzp_7294",
        "customer_name": "Aditya Verma",
        "customer_email": "aditya.v@zenith.in",
        "customer_phone": "+91 99403 11849",
        "cart_value": 14999.0,
        "items": ["Sony WH-1000XM5 ANC Headphones"],
        "abandoned_at_minutes_ago": 5,
        "abandonment_stage": "payment_step",
        "recovery_channel": "whatsapp",
        "discount_offered_pct": 5,
        "recovery_link": "https://pay.rzp.io/chk_7294?rec=wa5",
        "status": "pending",
        "recovered_amount": 0.0,
    },
    {
        "checkout_id": "chk_rzp_6108",
        "customer_name": "Sunita Menon",
        "customer_email": "sunita.m@gmail.com",
        "customer_phone": "+91 94451 90214",
        "cart_value": 850.0,
        "items": ["Artisan Coffee Beans 500g"],
        "abandoned_at_minutes_ago": 90,
        "abandonment_stage": "coupon_applied",
        "recovery_channel": "sms",
        "discount_offered_pct": 8,
        "recovery_link": "https://pay.rzp.io/chk_6108?rec=sms8",
        "status": "recovered",
        "recovered_amount": 782.0,
    },
    {
        "checkout_id": "chk_rzp_5023",
        "customer_name": "Karan Malhotra",
        "customer_email": "karan.m@techpulse.io",
        "customer_phone": "+91 98840 23119",
        "cart_value": 7200.0,
        "items": ["Smart Standing Desk Converter"],
        "abandoned_at_minutes_ago": 240,
        "abandonment_stage": "payment_step",
        "recovery_channel": "whatsapp",
        "discount_offered_pct": 7,
        "recovery_link": "https://pay.rzp.io/chk_5023?rec=wa7",
        "status": "expired",
        "recovered_amount": 0.0,
    },
]


# Server-side authoritative tracker for checkout abandonment nudge counts
CHECKOUT_NUDGE_TRACKER: Dict[str, int] = {
    "chk_rzp_9102": 1,
    "chk_rzp_8471": 1,
    "chk_rzp_7294": 0,
    "chk_rzp_6108": 1,
    "chk_rzp_5023": 3,
}


@app.get("/checkout-abandonment/events")
def get_checkout_events():
    """Retrieve abandoned checkout stream and recovery telemetry."""
    # Synchronize store with server-side nudge tracker
    for c in CHECKOUT_ABANDONMENT_STORE:
        cid = c["checkout_id"]
        c["nudge_count"] = CHECKOUT_NUDGE_TRACKER.get(cid, 0)
        if c["nudge_count"] >= 3:
            c["status"] = "expired"

    total_carts = len(CHECKOUT_ABANDONMENT_STORE)
    total_val = sum(c["cart_value"] for c in CHECKOUT_ABANDONMENT_STORE)
    recovered_val = sum(c["recovered_amount"] for c in CHECKOUT_ABANDONMENT_STORE)
    rec_count = sum(1 for c in CHECKOUT_ABANDONMENT_STORE if c["status"] == "recovered")

    return {
        "total_abandoned_checkouts": total_carts,
        "total_abandoned_value": total_val,
        "recovered_cart_value": recovered_val,
        "conversion_rate": round(rec_count / max(total_carts, 1), 4),
        "events": CHECKOUT_ABANDONMENT_STORE,
    }


@app.post("/checkout-abandonment/simulate")
def simulate_checkout_recovery(req: CheckoutAbandonmentEvent):
    """Trigger automated recovery sequence for an abandoned cart with server-side bounded 3-nudge cap."""
    max_nudges = req.max_nudges or 3
    
    # Server-side authoritative state lookup
    prev_nudges = CHECKOUT_NUDGE_TRACKER.get(req.checkout_id, 0)
    
    # If already at or beyond cap, terminate immediately
    if prev_nudges >= max_nudges or req.status == "expired":
        CHECKOUT_NUDGE_TRACKER[req.checkout_id] = max(prev_nudges, max_nudges)
        return {
            "checkout_id": req.checkout_id,
            "status": "expired",
            "is_terminal": True,
            "nudge_count": CHECKOUT_NUDGE_TRACKER[req.checkout_id],
            "max_nudges": max_nudges,
            "message": f"Maximum re-engagement limit reached ({max_nudges}/{max_nudges} nudges). Recovery sequence terminated.",
            "intervention": None,
            "projected_recovery_value": 0.0,
            "projected_conversion_probability": 0.0,
        }

    # Increment authoritative server-side counter
    new_nudge_count = prev_nudges + 1
    CHECKOUT_NUDGE_TRACKER[req.checkout_id] = new_nudge_count
    is_terminal = new_nudge_count >= max_nudges

    discount = req.discount_offered_pct
    link = f"https://pay.rzp.io/{req.checkout_id}?rec={req.recovery_channel[:2]}{discount}"
    rec_val = round(req.cart_value * (1 - discount / 100), 2)

    # Update in-memory store if event exists
    for c in CHECKOUT_ABANDONMENT_STORE:
        if c["checkout_id"] == req.checkout_id:
            c["nudge_count"] = new_nudge_count
            c["status"] = "expired" if is_terminal else "recovered"
            if not is_terminal:
                c["recovered_amount"] = rec_val
            break

    return {
        "checkout_id": req.checkout_id,
        "status": "expired" if is_terminal else "recovered",
        "is_terminal": is_terminal,
        "nudge_count": new_nudge_count,
        "max_nudges": max_nudges,
        "intervention": {
            "channel": req.recovery_channel,
            "scheduled_after_minutes": 15,
            "discount_offered_pct": discount,
            "recovery_url": link,
            "copy": f"Hi {req.customer_name}, you left items in your cart! Complete your purchase now and get {discount}% instant checkout credit: {link}",
        },
        "projected_recovery_value": rec_val,
        "projected_conversion_probability": 0.68 if req.recovery_channel == "whatsapp" else 0.42,
    }


# ---------------------------------------------------------------------------
# Overdue Receivables & B2B Chaser Endpoints
# ---------------------------------------------------------------------------

INVOICES_STORE = [
    {
        "invoice_id": "inv_corp_1042",
        "client_name": "Zenith Cloud Infrastructure",
        "client_category": "Enterprise SaaS",
        "amount": 145000.0,
        "due_date": "2026-07-15",
        "days_overdue": 46,
        "aging_bucket": "31-60 days",
        "chaser_stage": "stage_3_urgent_notice",
        "last_action_timestamp": "2026-08-28 11:30",
        "next_action_due": "2026-09-02 (Formal Notice)",
        "status": "overdue",
        "disputed": False,
    },
    {
        "invoice_id": "inv_corp_1089",
        "client_name": "BlueDart Hyperlogistics Ltd",
        "client_category": "Logistics & Supply",
        "amount": 89000.0,
        "due_date": "2026-08-10",
        "days_overdue": 20,
        "aging_bucket": "0-30 days",
        "chaser_stage": "stage_2_firm_followup",
        "last_action_timestamp": "2026-08-25 15:45",
        "next_action_due": "2026-09-01 (Call Scheduled)",
        "status": "overdue",
        "disputed": False,
    },
    {
        "invoice_id": "inv_corp_0954",
        "client_name": "OmniRetail D2C Brands",
        "client_category": "E-Commerce",
        "amount": 320000.0,
        "due_date": "2026-05-20",
        "days_overdue": 102,
        "aging_bucket": "90+ days",
        "chaser_stage": "stage_5_human_legal_escalation",
        "last_action_timestamp": "2026-08-20 09:00",
        "next_action_due": "Legal Desk Review",
        "status": "escalated_to_legal",
        "disputed": True,
    },
    {
        "invoice_id": "inv_corp_1120",
        "client_name": "ScaleAI Analytics India",
        "client_category": "AI Technology",
        "amount": 64000.0,
        "due_date": "2026-08-22",
        "days_overdue": 8,
        "aging_bucket": "0-30 days",
        "chaser_stage": "stage_1_gentle_reminder",
        "last_action_timestamp": "2026-08-29 10:15",
        "next_action_due": "2026-09-05 (Auto Follow-up)",
        "status": "overdue",
        "disputed": False,
    },
    {
        "invoice_id": "inv_corp_0998",
        "client_name": "FinEdge Banking Solutions",
        "client_category": "Fintech Enterprise",
        "amount": 210000.0,
        "due_date": "2026-06-30",
        "days_overdue": 61,
        "aging_bucket": "61-90 days",
        "chaser_stage": "stage_4_account_hold",
        "last_action_timestamp": "2026-08-26 14:00",
        "next_action_due": "Account Suspension Pending",
        "status": "overdue",
        "disputed": False,
    },
]


@app.get("/receivables/invoices")
def get_receivables_invoices():
    """Retrieve B2B aging ledger and chaser metrics."""
    total_ar = sum(inv["amount"] for inv in INVOICES_STORE)
    overdue_ar = sum(inv["amount"] for inv in INVOICES_STORE if inv["status"] in ("overdue", "escalated_to_legal"))
    recovered_ar = sum(inv["amount"] for inv in INVOICES_STORE if inv["status"] == "recovered")

    buckets = {
        "0-30 days": sum(inv["amount"] for inv in INVOICES_STORE if inv["aging_bucket"] == "0-30 days"),
        "31-60 days": sum(inv["amount"] for inv in INVOICES_STORE if inv["aging_bucket"] == "31-60 days"),
        "61-90 days": sum(inv["amount"] for inv in INVOICES_STORE if inv["aging_bucket"] == "61-90 days"),
        "90+ days": sum(inv["amount"] for inv in INVOICES_STORE if inv["aging_bucket"] == "90+ days"),
    }

    return {
        "total_receivables_outstanding": total_ar,
        "total_overdue": overdue_ar,
        "total_salvaged": recovered_ar,
        "aging_distribution": buckets,
        "invoices": INVOICES_STORE,
    }


@app.post("/receivables/chase")
def execute_receivables_chase(req: Dict[str, Any]):
    """
    Executes the next stage bounded B2B chaser action:
    Gentle Reminder -> Firm Follow-up -> Urgent Notice -> Account Hold -> Legal/Human Escalation.
    """
    invoice_id = req.get("invoice_id", "inv_unknown")
    client_name = req.get("client_name", "Enterprise Client")
    chaser_stage = req.get("chaser_stage", "stage_1_gentle_reminder")

    stages_order = [
        "stage_1_gentle_reminder",
        "stage_2_firm_followup",
        "stage_3_urgent_notice",
        "stage_4_account_hold",
        "stage_5_human_legal_escalation",
    ]
    current_idx = stages_order.index(chaser_stage) if chaser_stage in stages_order else 0
    next_idx = min(current_idx + 1, len(stages_order) - 1)
    next_stage = stages_order[next_idx]

    actions = {
        "stage_1_gentle_reminder": "Sent automated courtesy statement & 1-click RTGS/NEFT payment link to accounts payable.",
        "stage_2_firm_followup": "Dispatched firm payment reminder via Email + WhatsApp to Finance Controller with payment commitment link.",
        "stage_3_urgent_notice": "Issued formal urgent notice warning of service credit pause and interest surcharge.",
        "stage_4_account_hold": "Placed API & SaaS service provision on temporary administrative credit hold.",
        "stage_5_human_legal_escalation": "Transferred dossier to Human Accounts Recovery & Corporate Legal Council.",
    }

    return {
        "invoice_id": invoice_id,
        "client_name": client_name,
        "executed_stage": next_stage,
        "action_taken": actions.get(next_stage, "Action executed"),
        "timestamp": datetime.utcnow().isoformat(),
        "is_terminal_escalation": next_stage == "stage_5_human_legal_escalation",
    }
