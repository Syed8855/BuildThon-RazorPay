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
