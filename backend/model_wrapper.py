"""
model_wrapper.py -- Loads the serialized model and exposes a predict_fn
compatible with orchestrator.py's interface.

Loaded once at process startup (not per-request) per PROJECT_OVERVIEW.md.
"""

import json
import os
from typing import List, Dict, Any, Optional

import numpy as np
import joblib
import shap

from orchestrator import TransactionInput, AttemptRecord

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
MODEL_PATH = os.path.join(DATA_DIR, "model.joblib")
FEATURE_LIST_PATH = os.path.join(DATA_DIR, "feature_list.json")

# Failure reasons that are transient (model is meaningful for these)
HARD_FAIL_REASONS = frozenset({"card_expired", "card_stolen", "account_closed"})


class ModelWrapper:
    """
    Loads model + feature metadata once, exposes predict() matching
    orchestrator.py's predict_fn signature.
    """

    def __init__(self, model_path: str = MODEL_PATH, feature_list_path: str = FEATURE_LIST_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Run `python data/train.py` first."
            )
        self.model = joblib.load(model_path)
        with open(feature_list_path) as f:
            meta = json.load(f)

        self.feature_cols: List[str] = meta["feature_cols"]
        self.cat_cols: List[str] = meta["cat_cols"]
        self.label_encoder_classes: Dict[str, List[str]] = meta["label_encoders"]
        self.model_type: str = meta.get("model_type", "xgboost")

        # Build label encoder lookup: col -> {class_str: int_code}
        self._le: Dict[str, Dict[str, int]] = {
            col: {cls: i for i, cls in enumerate(classes)}
            for col, classes in self.label_encoder_classes.items()
        }
        # Default code for unseen categories
        self._le_default: Dict[str, int] = {
            col: 0 for col in self.cat_cols
        }

        # SHAP explainer (fitted once)
        self._explainer = shap.TreeExplainer(self.model)

        print(f"[ModelWrapper] Loaded model from {model_path}")
        print(f"[ModelWrapper] Features: {self.feature_cols}")

    def _encode_cat(self, col: str, val: str) -> int:
        return self._le[col].get(str(val), self._le_default[col])

    def _build_feature_row(
        self,
        transaction: TransactionInput,
        attempt_history: List[AttemptRecord],
        attempt_number: int,
        time_since_last_attempt: float,
        time_since_first_failure: float,
        is_near_payday: bool,
        customer_segment: str = "returning",
        historical_failure_rate: float = 0.15,
    ) -> np.ndarray:
        """
        Build a single feature row in the same column order as training.
        MODEL_SPEC.md features (exact order from feature_list.json):
          attempt_number, time_since_last_attempt, time_since_first_failure,
          failure_reason, is_near_payday, payment_method, is_recurring,
          merchant_category, customer_segment, customer_historical_failure_rate, amount
        """
        row = {}
        row["attempt_number"] = float(attempt_number)
        row["time_since_last_attempt"] = float(time_since_last_attempt)
        row["time_since_first_failure"] = float(time_since_first_failure)
        row["failure_reason"] = self._encode_cat("failure_reason", transaction.failure_reason)
        row["is_near_payday"] = float(int(is_near_payday))
        row["payment_method"] = self._encode_cat("payment_method", transaction.payment_method)
        row["is_recurring"] = float(int(transaction.is_recurring))
        row["merchant_category"] = self._encode_cat("merchant_category", transaction.merchant_category)
        row["customer_segment"] = self._encode_cat("customer_segment", customer_segment)
        row["customer_historical_failure_rate"] = float(historical_failure_rate)
        row["amount"] = float(transaction.amount)

        return np.array([row[col] for col in self.feature_cols], dtype=np.float32).reshape(1, -1)

    def predict(
        self,
        transaction: TransactionInput,
        attempt_history: List[AttemptRecord],
        customer_segment: str = "returning",
        historical_failure_rate: float = 0.15,
        now=None,
        compute_shap: bool = True,
    ) -> Dict[str, Any]:
        """
        predict_fn interface for orchestrator.py.
        Returns {"success_probability": float, "shap_contributions": list}
        """
        from datetime import datetime
        if now is None:
            now = datetime.utcnow()

        completed = [a for a in attempt_history if a.outcome in ("success", "fail")]
        attempt_number = len(completed) + 1

        # time_since_last_attempt
        if completed:
            last_ts = completed[-1].attempt_timestamp
            time_since_last = (now - last_ts).total_seconds() / 3600
        else:
            time_since_last = (now - transaction.first_failure_timestamp).total_seconds() / 3600

        time_since_first = (now - transaction.first_failure_timestamp).total_seconds() / 3600

        # is_near_payday based on current time
        is_near_payday = now.day in {1, 28, 29, 30, 31}

        X = self._build_feature_row(
            transaction=transaction,
            attempt_history=attempt_history,
            attempt_number=attempt_number,
            time_since_last_attempt=time_since_last,
            time_since_first_failure=time_since_first,
            is_near_payday=is_near_payday,
            customer_segment=customer_segment,
            historical_failure_rate=historical_failure_rate,
        )

        # Probability
        prob = float(self.model.predict_proba(X)[0, 1])

        contributions = []
        if compute_shap:
            # SHAP -- top 4 features per MODEL_SPEC.md
            shap_vals = self._explainer.shap_values(X)
            if isinstance(shap_vals, list):
                shap_vals = shap_vals[1]
            sv = shap_vals[0]  # shape: (n_features,)

            top_idx = np.argsort(np.abs(sv))[::-1][:4]
            contributions = [
                {
                    "feature": self.feature_cols[i],
                    "impact": round(float(sv[i]), 4),
                }
                for i in top_idx
            ]

        return {
            "success_probability": round(prob, 4),
            "shap_contributions": contributions,
        }

    def predict_from_raw(self, payload: dict) -> dict:
        """
        Convenience method for the /predict endpoint.
        Accepts the raw API request payload (API_SPEC.md shape).
        """
        from datetime import datetime, timedelta

        # Build minimal TransactionInput from flat payload
        transaction = TransactionInput(
            transaction_id="api_request",
            failure_reason=payload["failure_reason"],
            is_hard_fail=payload["failure_reason"] in HARD_FAIL_REASONS,
            first_failure_timestamp=datetime.utcnow() - timedelta(
                hours=payload.get("time_since_first_failure_hours", 24)
            ),
            payment_method=payload["payment_method"],
            is_recurring=payload.get("is_recurring", True),
            merchant_category=payload.get("merchant_category", "saas"),
            amount=payload.get("amount", 500.0),
        )
        attempt_history = []  # empty -- attempt_number comes from payload

        # Override attempt_number via a synthetic completed history
        attempt_number = payload.get("attempt_number", 1)
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        for i in range(1, attempt_number):
            attempt_history.append(AttemptRecord(
                attempt_number=i,
                attempt_timestamp=now - timedelta(hours=(attempt_number - i) * 24),
                outcome="fail",
                channel="auto_retry",
            ))

        return self.predict(
            transaction=transaction,
            attempt_history=attempt_history,
            customer_segment=payload.get("customer_segment", "returning"),
            historical_failure_rate=payload.get("historical_failure_rate", 0.15),
            now=now,
        )
