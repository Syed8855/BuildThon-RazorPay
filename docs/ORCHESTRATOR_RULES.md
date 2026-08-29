# Recovery Orchestrator — rules

The orchestrator is the rules layer wrapping the ML model. Rules decide
**whether/when** a retry is attempted; the model (see `docs/MODEL_SPEC.md`)
only decides **how confident** we are it will succeed, within the bounds
these rules set. This keeps the system bounded and safe even if the model is
wrong or undertrained.

## Rule set

| Rule | Value | Reason |
|---|---|---|
| Max retry attempts | 3-4 total per transaction | mirrors real dunning cycles; excessive retries hurt customer trust and can trigger issuer fraud flags |
| Minimum spacing between attempts | 6-24 hours | prevents issuer/card-network rate-limit or fraud flagging from rapid repeated charges |
| Hard-fail short-circuit | never retry `card_expired`, `card_stolen`, `account_closed` | route straight to "needs customer action" instead of wasting a retry |
| Escalating backoff schedule | attempt 1 → 6h, attempt 2 → 24h, attempt 3 → 72h | mimics real dunning cadence; acts as the fallback/baseline the timing-optimization enhancement can later override |
| Total recovery cycle cutoff | 7-14 days from first failure | bounds the whole recovery window; after this, mark churned/lost regardless of model confidence |
| Confidence threshold gate | model may only skip a scheduled retry if confidence > 85% | protects against an undertrained or wrong model; below threshold, defer to the backoff schedule |

## Evaluation order (pseudocode)

```
def orchestrate(transaction, attempt_history):
    if transaction.is_hard_fail:
        return Decision("no_retry", reason="hard_fail",
                         action="route_to_customer_action")

    if len(attempt_history) >= MAX_ATTEMPTS:
        return Decision("no_retry", reason="max_attempts_reached")

    if days_since(transaction.first_failure_timestamp) > CYCLE_CUTOFF_DAYS:
        return Decision("no_retry", reason="cycle_cutoff", status="churned")

    next_attempt_number = len(attempt_history) + 1
    scheduled_delay = BACKOFF_SCHEDULE[next_attempt_number]
    earliest_allowed = last_attempt_time + MIN_SPACING_HOURS

    if now() < earliest_allowed:
        return Decision("wait", retry_at=max(scheduled_delay_time, earliest_allowed))

    probability = model.predict(transaction, attempt_history)

    if probability_confidence(probability) > CONFIDENCE_THRESHOLD and probability < LOW_THRESHOLD:
        return Decision("skip_retry", reason="model_high_confidence_low_success",
                         probability=probability)

    return Decision("retry_now", probability=probability,
                     channel=select_channel(transaction, next_attempt_number))
```

`select_channel` is the rule-based channel recommendation — see
`docs/DIFFERENTIATORS.md`.

## Why rules-first, not model-first

This order (rules evaluated before the model is even consulted) is
deliberate — it means the system degrades gracefully. A rules-only version of
this orchestrator is fully functional on its own; the ML model only adds
confidence-aware skipping on top. This is also what the rules-vs-ML
comparison feature in the Simulation Playground demonstrates directly — see
`docs/DIFFERENTIATORS.md`.

## Exposing decisions in the UI

Every orchestrator decision must be shown to the user in plain language, not
just applied silently — e.g. "Retry scheduled in 24hrs (backoff rule)" or
"Hard-fail — routed to customer action." This is a deliberate explainability
choice: rules explain the flow-level decision, SHAP explains the
model-level score. See `docs/screens/transaction-feed.md`.
