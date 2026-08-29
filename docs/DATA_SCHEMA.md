# Data schema

## Approach

Hybrid data. The core dataset — the retry/dunning event log — is fully
synthetic; no public dataset has retry-sequence/dunning data, so this part
must be generated from scratch to match the problem shape.

Transaction-level realism is enriched using a real reference dataset:
**Kaggle "Online Payments Fraud Detection Dataset"**
(https://www.kaggle.com/datasets/rupakroy/online-payments-fraud-detection-dataset).

What is pulled from the Kaggle dataset:
- `amount` distribution shape — sample/fit a distribution (e.g. log-normal)
  from the real `amount` column instead of inventing an arbitrary range, so
  transaction amounts look statistically realistic.
- Transaction `type` proportions (e.g. CASH_OUT, PAYMENT, TRANSFER) — used
  loosely to inform realistic `payment_method` proportions, not mapped 1:1
  (the Kaggle schema doesn't have card/UPI/netbanking directly, so this is a
  realism reference, not a direct field copy).

What is NOT pulled from Kaggle (fully synthetic, generated per the rules
below):
- `failure_reason` — Kaggle's dataset has no decline-code field; this uses
  the real Razorpay/card-network decline-code taxonomy listed below instead.
- Retry Attempt entity entirely (attempt_number, timestamps, outcomes,
  channel) — this is the core problem-specific data with no public
  equivalent, fully synthetic per the generation logic below.
- Customer entity (segment, historical_failure_rate) — fully synthetic.

In short: Kaggle data informs *statistical realism of amounts/volume*, not
the actual retry/dunning logic, which is the project's real contribution and
must stay fully controlled/synthetic.

## Entities

### Transaction

| Field | Type | Notes |
|---|---|---|
| `transaction_id` | string | unique |
| `customer_id` | string | FK to Customer |
| `amount` | float | sampled from Kaggle-fitted distribution, see Approach above |
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

## Combination mechanism

1. Load the Kaggle dataset, extract the `amount` column.
2. Fit a distribution to it (e.g. log-normal via scipy.stats.lognorm.fit).
3. When generating each synthetic Transaction, sample `amount` from this
   fitted distribution instead of a hand-picked range.
4. All other fields (failure_reason, retry attempts, customer segment,
   outcomes) are generated independently using the rules below — Kaggle
   data is not used for anything beyond the amount distribution (and
   optionally transaction-type proportions, as noted above).
5. Document this clearly in code comments and in the write-up: "amount
   distributions are calibrated against a real payments dataset; retry/
   dunning behavior is fully synthetic, as no public dataset for this
   exists."

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
- `amount` distribution should visibly resemble the Kaggle reference
  distribution's shape (e.g. compare histograms or summary statistics)

If these don't hold in the generated data, fix the generator before moving to
model training — see `docs/MODEL_SPEC.md` for how this data is later used to
validate the *model* (a separate, later check).
