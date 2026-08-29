# Design decisions

Source content for `docs/screens/design-decisions-page.md`. Each decision
follows: what was chosen, why, and what was rejected instead.

## 1. Data: hybrid synthetic vs Kaggle

**Decision:** hybrid — a fully synthetic retry/dunning event log as the core
dataset, with transaction-level realism enriched using patterns from real
payments/fraud datasets and published decline-code taxonomies.

**Why:** no public dataset contains retry-sequence/dunning data. Building
the schema from scratch means it can actually match the problem — decline
reasons, retry history, timing, customer segments.

**Rejected:** a Kaggle fraud/payments dataset as the primary source. These
are built for fraud classification, not failed-payment recovery — no decline
reasons, no retry history, no multi-attempt sequences. Forcing it into this
problem shape would have been visibly mismatched to anyone who checked.

## 2. Model target: retry success probability vs optimal timing

**Decision:** retry success probability (binary/probability classifier) as
the primary target, with optimal timing handled as an application of this
model (score candidate delays), not a separate direct-prediction target.

**Why:** success probability has a clean, provable ground truth per attempt.
Optimal timing as a direct target has no clean ground truth without
inventing the exact response curve the model is meant to learn — circular
and hard to defend under questioning.

**Rejected:** predicting optimal retry delay directly as the primary model
output.

## 3. Statefulness: features + guardrails vs sequence modeling

**Decision:** state-as-features (attempt_number, time_since_last_attempt,
previous_failure_reason) plus rule-based guardrails wrapping the model.

**Why:** captures the most important state signals without the complexity,
data requirements, and reduced explainability of a full sequence model —
buildable and defensible within the project timeline.

**Rejected:** RNN/LSTM sequence modeling over the full retry history — noted
as an explicit stretch goal, not core, due to complexity and explainability
tradeoffs.

## 4. Model choice: XGBoost/LightGBM vs deep learning

**Decision:** gradient-boosted trees (XGBoost or LightGBM).

**Why:** this is a tabular classification problem — trees match or beat deep
learning here, train fast, and support SHAP explainability natively, which
is essential for a financial decision system.

**Rejected:** a neural network — would be over-engineering for tabular data
with no accuracy benefit, and harder to explain live under questioning.

## 5. Architecture: rules + ML hybrid vs pure ML

**Decision:** a "Recovery Orchestrator" — rules decide whether/when a retry
happens; ML only decides confidence within those bounds.

**Why:** keeps the system safe and bounded even with an imperfect or
undertrained model. Mirrors how real production dunning systems (e.g.
Stripe's Smart Retries, publicly described) are architected.

**Rejected:** a pure end-to-end ML system with no rule guardrails — too
risky and unexplainable for a system making financial retry decisions.

## 6. Deployment: Next.js proxy vs direct browser-to-backend calls

**Decision:** Next.js is the sole public-facing surface; it proxies
server-side to the FastAPI ML service.

**Why:** avoids CORS entirely (one fewer class of bugs during a demo), and
keeps the model server off the public internet.

**Rejected:** direct browser-to-FastAPI calls — needless CORS complexity and
larger public attack surface for no real benefit at this scale.

## 7. Validation approach: perturbed-parameter testing vs naive holdout

**Decision:** test the model against a second synthetic batch generated with
shifted/perturbed rule parameters, not just a held-out split of the same
generation run. Cross-check learned feature importances against real domain
patterns. Compare against dumb baselines.

**Why:** since the same person wrote both the data generator and the model,
a naive holdout risks the model simply re-deriving the generation formula
rather than learning anything generalizable — an honest project needs a
harder test than that.

**Rejected:** reporting a single high accuracy/AUC number from a same-
distribution holdout split without further scrutiny — this is the kind of
result that looks good but proves little, and a technically literate judge
would catch it.
