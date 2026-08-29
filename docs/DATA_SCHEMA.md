# Data schema

## Approach

Hybrid data. The core dataset — the retry/dunning event log — is fully
synthetic, with full control over its schema so it actually matches the
problem (no public dataset has retry-sequence data). Transaction-level realism
is enriched using patterns/distributions borrowed from real payments/fraud
datasets and published decline-code taxonomies, so numbers aren't arbitrary.

## Entities

### Transaction

| Field | Type | Notes |
|---|---|---|
| `transaction_id` | string | unique |
| `customer_id` | string | FK to Customer |
| `amount` | float | |
| `currency` | string | e.g. INR |
| `failure_reason` | enum | see taxonomy below |
| `is_hard_fail` | bool | derived: true for card_expired, card_stolen, account_closed |
| `first_failure_timestamp` | datetime | |
| `payment_method` | enum | card, upi, netbanking |
| `is_recurring` | bool | subscription payment vs one-time |
| `merchant_category` | enum | saas, d2c_subscription, ecommerce_one_time |

### Retry Attempt (event log — one row per attempt)

| Field | Type | Notes |
|---|---|---|
| `attempt_id` | string | unique |
| `transaction_id` | string | FK |
| `attempt_number` | int | 1, 2, 3... |
| `attempt_timestamp` | datetime | |
| `time_since_last_attempt` | float (hours) | derived |
| `time_since_first_failure` | float (hours) | derived |
| `is_near_payday` | bool | derived from attempt_timestamp, e.g. days 1 or 28-31 of month |
| `outcome` | enum | success, fail, not_attempted |
| `channel` | enum | auto_retry, email_prompt, sms_prompt (rule-assigned, see DIFFERENTIATORS.md) |

### Customer

| Field | Type | Notes |
|---|---|---|
| `customer_id` | string | unique |
| `segment` | enum | new, returning, high_value |
| `historical_failure_rate` | float | derived from past transactions |

## Label

Per Retry Attempt row: `success` (1/0) — the ML model's prediction target.
`not_attempted` rows (hard-fails, or attempts beyond the guardrail cap) are
excluded from training.

## Decline-code taxonomy (failure_reason values)

Based on real Razorpay/Stripe/card-network published decline codes:

- `insufficient_funds` — transient, time-sensitive (payday effect)
- `card_expired` — hard fail, never retry
- `issuer_declined` — transient, low base recovery
- `do_not_honor` — transient, low base recovery
- `processing_error` — transient, gateway-side, retries well
- `network_timeout` — transient, random, retries well quickly
- `card_stolen` — hard fail, never retry
- `account_closed` — hard fail, never retry

## Generation logic

Every attempt's success probability is a function of named, justifiable
factors — never a raw random number:

```
base_probability = f(failure_reason)
  # e.g. insufficient_funds: 0.35, network_timeout: 0.65, issuer_declined: 0.20

attempt_modifier = diminishing_returns(attempt_number)
  # each subsequent attempt slightly less likely to succeed (customer fatigue)

timing_modifier = f(time_since_last_attempt, failure_reason)
  # too soon = no change; sweet spot after ~24-72h; too long = customer may have churned

payday_modifier = +boost if is_near_payday and failure_reason == insufficient_funds

segment_modifier = f(customer.segment)
  # high_value recovers better (faster card updates, more attention)

final_probability = clamp(
  base_probability
  * attempt_modifier
  * timing_modifier
  * payday_modifier
  * segment_modifier
  + noise,   # small random noise, keeps data from looking too clean
  0, 1
)

outcome = bernoulli(final_probability)
```

Hard-fail failure reasons (`card_expired`, `card_stolen`, `account_closed`)
skip this entirely — `outcome` is always `not_attempted`, only one row is
generated, and no retry sequence follows.

## Validation of the generator itself

Before training on this data, sanity-check the generated distributions:
- recovery rate should be higher for `network_timeout`/`processing_error`
  than for `issuer_declined`/`do_not_honor`
- recovery rate should decline with `attempt_number`
- `insufficient_funds` recovery rate should visibly bump near payday

If these don't hold in the generated data, fix the generator before moving to
model training — see `docs/MODEL_SPEC.md` for how this data is later used to
validate the *model* (a separate, later check).
