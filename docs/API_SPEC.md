# API spec

## Architecture

Next.js (Vercel) is the only public-facing surface. Its API routes call the
FastAPI ML service server-side (never from the browser). This avoids CORS
entirely and keeps the model server off the public internet. See
`docs/PROJECT_OVERVIEW.md`.

```
Browser --> /api/* (Next.js, server-side) --> FastAPI service --> response
```

## FastAPI endpoints (backend)

### `POST /predict`

Given a transaction + attempt history, returns the model's success
probability and SHAP explanation.

Request:
```json
{
  "failure_reason": "insufficient_funds",
  "attempt_number": 2,
  "time_since_last_attempt_hours": 26,
  "is_near_payday": true,
  "payment_method": "card",
  "is_recurring": true,
  "merchant_category": "d2c_subscription",
  "customer_segment": "returning",
  "historical_failure_rate": 0.18,
  "amount": 499
}
```

Response:
```json
{
  "success_probability": 0.71,
  "shap_contributions": [
    {"feature": "is_near_payday", "impact": 0.12},
    {"feature": "attempt_number", "impact": -0.05},
    {"feature": "customer_segment", "impact": 0.04}
  ]
}
```

### `POST /simulate`

Runs the full orchestrator (rules + model) for a hypothetical input, and
additionally returns what a rules-only system would have done, for the
rules-vs-ML comparison feature.

Request: same shape as `/predict`, plus attempt history if simulating a
later attempt.

Response:
```json
{
  "orchestrator_decision": {
    "action": "retry_now",
    "reason": "within_retry_window",
    "channel": "email_prompt"
  },
  "rules_only_decision": {
    "action": "retry_now",
    "reason": "backoff_schedule"
  },
  "model_output": {
    "success_probability": 0.71,
    "shap_contributions": [ /* ... */ ]
  },
  "customer_message": "Your payment didn't go through — update your card to keep your subscription active."
}
```

### `GET /transactions`

Returns the transaction feed (paginated), each with current status, latest
attempt info, and success probability.

### `GET /transactions/{id}`

Returns full detail for one transaction: attempt timeline, current
orchestrator decision, SHAP breakdown, customer-message text.

### `GET /analytics`

Returns aggregate data for the Analytics screen: funnel counts, recovery
rate over time, global feature importance.

### `GET /health`

Plain health check — used for the keep-alive ping to avoid cold-start
latency on free-tier hosting. Returns `{"status": "ok"}`.

## Next.js API routes (proxy layer)

Mirror the FastAPI endpoints 1:1 under `/api/*` in Next.js (e.g.
`/api/predict`, `/api/simulate`, `/api/transactions`). Each route does a
server-side `fetch` to the FastAPI service using an internal-only base URL
(env var, never exposed to the client bundle) and passes the response
through. No business logic lives in these routes — they are a thin pass-
through only.

## Error handling

All endpoints return errors as:
```json
{ "error": "message", "code": "machine_readable_code" }
```
Next.js proxy routes should pass FastAPI error responses through unchanged,
not swallow or reformat them.
