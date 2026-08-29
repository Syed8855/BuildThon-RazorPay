"""
orchestrator.py -- Recovery Orchestrator rules engine.

Implements ORCHESTRATOR_RULES.md exactly:
  - Hard-fail short-circuit
  - Max retry attempts check (3-4 total)
  - Cycle cutoff (7-14 days)
  - Minimum spacing enforcement (6-24h)
  - Escalating backoff schedule (6h, 24h, 72h)
  - Confidence-gate: model may only skip a retry if confidence > 85%
  - Rule-based channel recommendation per DIFFERENTIATORS.md

This module is intentionally independent of the ML model -- it is fully
testable and demoable on its own. The model is injected via the predict_fn
parameter. If predict_fn is None, the orchestrator behaves as a rules-only
system (the rules-vs-ML comparison baseline).
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Callable, List, Dict, Any


# ---------------------------------------------------------------------------
# Constants -- ORCHESTRATOR_RULES.md
# ---------------------------------------------------------------------------

MAX_ATTEMPTS = 4                  # 3-4 total per transaction
MIN_SPACING_HOURS = 6             # minimum hours between attempts
CYCLE_CUTOFF_DAYS = 14            # days from first failure before marking churned
CONFIDENCE_THRESHOLD = 0.85       # model must be this confident to skip a retry
LOW_SUCCESS_THRESHOLD = 0.20      # probability below this triggers model skip

# Backoff schedule: attempt_number -> hours after FIRST failure timestamp
# ORCHESTRATOR_RULES.md: attempt 1 -> 6h, attempt 2 -> 24h, attempt 3 -> 72h
BACKOFF_HOURS: Dict[int, float] = {1: 6.0, 2: 24.0, 3: 72.0, 4: 168.0}

HARD_FAIL_REASONS = frozenset({"card_expired", "card_stolen", "account_closed"})


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class AttemptRecord:
    """Represents one historical retry attempt."""
    attempt_number: int
    attempt_timestamp: datetime
    outcome: str           # "success", "fail", "not_attempted"
    channel: str


@dataclass
class TransactionInput:
    """All fields the orchestrator needs about a transaction."""
    transaction_id: str
    failure_reason: str
    is_hard_fail: bool
    first_failure_timestamp: datetime
    payment_method: str
    is_recurring: bool
    merchant_category: str
    amount: float
    currency: str = "INR"


@dataclass
class Decision:
    """Orchestrator output -- everything the UI needs to show."""
    action: str                          # "no_retry" | "wait" | "retry_now" | "skip_retry"
    reason: str                          # machine-readable reason code
    plain_english: str                   # ORCHESTRATOR_RULES.md: always show plain language
    channel: Optional[str] = None        # auto_retry | email_prompt | sms_prompt
    retry_at: Optional[datetime] = None  # when to retry if action == "wait"
    probability: Optional[float] = None  # model probability (if consulted)
    shap_contributions: Optional[List[Dict]] = None
    status: Optional[str] = None         # "churned" if cycle cutoff reached
    rules_only: bool = False             # True when predict_fn is None (baseline mode)


# ---------------------------------------------------------------------------
# Channel recommendation -- DIFFERENTIATORS.md rule-based logic
# ---------------------------------------------------------------------------

def select_channel(transaction: TransactionInput, attempt_number: int) -> str:
    """
    Rule-based channel recommendation per DIFFERENTIATORS.md.
    attempt 1 -> auto_retry
    attempt 2 -> email_prompt
    attempt 3+ -> sms_prompt
    """
    if attempt_number == 1:
        return "auto_retry"
    elif attempt_number == 2:
        return "email_prompt"
    else:
        return "sms_prompt"


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def orchestrate(
    transaction: TransactionInput,
    attempt_history: List[AttemptRecord],
    now: Optional[datetime] = None,
    predict_fn: Optional[Callable] = None,
) -> Decision:
    """
    ORCHESTRATOR_RULES.md pseudocode implemented exactly.

    predict_fn: callable(transaction, attempt_history) -> (probability, shap_contributions)
                If None, acts as rules-only system (no model consulted).

    Evaluation order (must not be reordered):
    1. Hard-fail short-circuit
    2. Max attempts check
    3. Cycle cutoff check
    4. Minimum spacing / next scheduled time
    5. [Optional] Model confidence gate
    6. Retry now
    """
    if now is None:
        now = datetime.utcnow()

    # ---- 1. Hard-fail short-circuit ----
    if transaction.is_hard_fail or transaction.failure_reason in HARD_FAIL_REASONS:
        return Decision(
            action="no_retry",
            reason="hard_fail",
            plain_english=(
                f"Hard-fail ({transaction.failure_reason}) -- "
                "routed to customer action. No automatic retry."
            ),
            channel=_hard_fail_channel(transaction),
            rules_only=(predict_fn is None),
        )

    # ---- 2. Max attempts check ----
    completed = [a for a in attempt_history if a.outcome in ("success", "fail")]
    if len(completed) >= MAX_ATTEMPTS:
        return Decision(
            action="no_retry",
            reason="max_attempts_reached",
            plain_english=(
                f"Maximum retry attempts ({MAX_ATTEMPTS}) reached. "
                "No further automatic retries."
            ),
            rules_only=(predict_fn is None),
        )

    # ---- 3. Cycle cutoff check ----
    days_since = (now - transaction.first_failure_timestamp).total_seconds() / 86400
    if days_since > CYCLE_CUTOFF_DAYS:
        return Decision(
            action="no_retry",
            reason="cycle_cutoff",
            plain_english=(
                f"Recovery window expired ({CYCLE_CUTOFF_DAYS} days). "
                "Transaction marked as churned/lost."
            ),
            status="churned",
            rules_only=(predict_fn is None),
        )

    # ---- 4. Minimum spacing / backoff schedule ----
    next_attempt_number = len(completed) + 1
    scheduled_delay_hours = BACKOFF_HOURS.get(next_attempt_number, 168.0)

    if completed:
        last_attempt_time = completed[-1].attempt_timestamp
        earliest_allowed = last_attempt_time + timedelta(hours=MIN_SPACING_HOURS)
    else:
        # No prior attempts -- schedule from first failure
        earliest_allowed = transaction.first_failure_timestamp + timedelta(
            hours=MIN_SPACING_HOURS
        )

    scheduled_retry_at = transaction.first_failure_timestamp + timedelta(
        hours=scheduled_delay_hours
    )
    # Retry at whichever is later: the backoff time or the minimum spacing
    retry_at = max(scheduled_retry_at, earliest_allowed)

    if now < retry_at:
        wait_hours = (retry_at - now).total_seconds() / 3600
        return Decision(
            action="wait",
            reason="backoff_schedule",
            plain_english=(
                f"Next retry scheduled in {_format_duration(wait_hours)} "
                f"(backoff rule -- attempt {next_attempt_number} "
                f"requires {scheduled_delay_hours:.0f}h gap)."
            ),
            retry_at=retry_at,
            rules_only=(predict_fn is None),
        )

    # ---- 5. Model confidence gate (only if predict_fn provided) ----
    probability = None
    shap_contributions = None

    if predict_fn is not None:
        try:
            result = predict_fn(transaction, attempt_history)
            probability = result.get("success_probability")
            shap_contributions = result.get("shap_contributions")

            # "probability_confidence" = distance from 0.5 (how certain the model is)
            confidence = abs(probability - 0.5) * 2   # 0..1

            if confidence > CONFIDENCE_THRESHOLD and probability < LOW_SUCCESS_THRESHOLD:
                return Decision(
                    action="skip_retry",
                    reason="model_high_confidence_low_success",
                    plain_english=(
                        f"Model predicts low success probability ({probability:.0%}) "
                        f"with high confidence ({confidence:.0%}). "
                        "Retry skipped to avoid issuer fraud flags."
                    ),
                    probability=probability,
                    shap_contributions=shap_contributions,
                    channel=select_channel(transaction, next_attempt_number),
                    rules_only=False,
                )
        except Exception as exc:
            # Fail-safe: if model call fails, fall through to rules-based retry
            probability = None
            shap_contributions = None

    # ---- 6. Retry now ----
    channel = select_channel(transaction, next_attempt_number)
    channel_label = {"auto_retry": "auto-retry", "email_prompt": "email", "sms_prompt": "SMS"}
    prob_str = f" (success probability: {probability:.0%})" if probability is not None else ""

    return Decision(
        action="retry_now",
        reason="within_retry_window",
        plain_english=(
            f"Retry now via {channel_label.get(channel, channel)}{prob_str}. "
            f"Attempt {next_attempt_number} of {MAX_ATTEMPTS}."
        ),
        channel=channel,
        probability=probability,
        shap_contributions=shap_contributions,
        rules_only=(predict_fn is None),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hard_fail_channel(transaction: TransactionInput) -> str:
    """
    For hard-fails, recommend a customer-action channel rather than auto-retry.
    card_expired/account_closed -> email (needs card update)
    card_stolen -> no outbound (fraud sensitivity)
    """
    if transaction.failure_reason == "card_stolen":
        return "no_outbound"
    return "email_prompt"


def _format_duration(hours: float) -> str:
    """Human-readable duration: '6 hours', '1 day', '3 days'."""
    if hours < 1:
        return f"{int(hours * 60)} minutes"
    elif hours < 24:
        return f"{int(hours)} hour{'s' if hours != 1 else ''}"
    else:
        days = hours / 24
        return f"{days:.0f} day{'s' if days != 1 else ''}"


def decision_to_dict(d: Decision) -> dict:
    """Serialize a Decision to a JSON-safe dict for the API."""
    return {
        "action": d.action,
        "reason": d.reason,
        "plain_english": d.plain_english,
        "channel": d.channel,
        "retry_at": d.retry_at.isoformat() if d.retry_at else None,
        "probability": round(d.probability, 4) if d.probability is not None else None,
        "shap_contributions": d.shap_contributions,
        "status": d.status,
        "rules_only": d.rules_only,
    }
