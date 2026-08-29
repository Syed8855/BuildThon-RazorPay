# Differentiator features

Four features chosen specifically to separate this submission from a typical
single-model ML demo. Each is a standalone spec so it doesn't get lost or
under-built during implementation.

## 1. "Money left on the table" live counter

**What:** a prominent, real-time-feeling counter on the Dashboard showing
total revenue currently at risk — failed, not yet recovered.

**Calculation:**
```
at_risk_revenue = sum(
  transaction.amount
  for transaction in transactions
  if transaction.status in ("pending_retry", "retrying")
  and not transaction.is_hard_fail
)
```
Hard-failed transactions are excluded (they're routed to customer action, a
different bucket) and recovered/churned transactions are excluded (resolved,
one way or the other).

**Update cadence:** recompute on each dashboard load / data refresh — no
need for a websocket/true real-time feed for a demo; a periodic refresh
(e.g. every 10-30s) reads as "live" without the engineering overhead.

**Why it matters:** turns the recovery story from abstract charts into a
visceral, dollar-denominated number — this is the number a business
stakeholder actually cares about.

## 2. Rules-only vs ML-enhanced comparison

See `docs/screens/playground.md` and `docs/ORCHESTRATOR_RULES.md` for full
detail. Summary: the Simulation Playground shows, side by side, what a
pure-rules backoff system would decide vs what the actual rules+ML
orchestrator decides for the same hypothetical input. This is the concrete
proof that the ML layer adds measurable value over rules alone.

## 3. "Explain like I'm the customer" mode

**What:** a toggle in the transaction detail panel that generates the
actual customer-facing message for a given failure/retry state, not just
internal model reasoning.

**Generation approach:** template-based, not a separate ML model — keep this
simple and reliable given timeline constraints.

```
templates = {
  "insufficient_funds": "Your payment of {amount} didn't go through — please make sure your account has sufficient balance and we'll retry automatically.",
  "card_expired": "Your card has expired. Update your payment method to keep your {merchant_category} subscription active.",
  "issuer_declined": "Your bank declined this payment. Please contact your bank or try a different payment method.",
  "network_timeout": "There was a temporary issue processing your payment. We'll retry shortly.",
  # ... one entry per failure_reason in docs/DATA_SCHEMA.md taxonomy
}

message = templates[failure_reason].format(amount=..., merchant_category=...)
```

**Why it matters:** bridges ML/orchestrator output to actual UX — most
technical submissions stop at showing internal model output and skip this
translation step entirely.

## 4. In-app Design Decisions page

See `docs/screens/design-decisions-page.md` and `docs/DESIGN_DECISIONS.md`.
Summary: surfaces the reasoning behind every major technical choice
in-app, not buried in a README — signals maturity of thinking directly in
the product experience, which is what a project-based hiring evaluation
rewards.

## Build order among these four

If time is short, prioritize in this order: #2 (rules-vs-ML comparison) >
#1 (money-at-risk counter) > #4 (Design Decisions page) > #3 (customer
message mode). #2 is the strongest proof of ML value; #3 is the most
droppable since it's UX polish rather than a proof point.
