# Model spec

## Target

Primary target: **retry success probability** — binary classification
(`success` 1/0) per Retry Attempt row, output as a probability, not just a
label.

Not the target (deliberately): optimal retry timing as a direct model output.
Reason: there's no clean ground truth for "best delay" without inventing the
exact response curve the model is meant to learn — circular. Instead, timing
is handled as an *application* of this model: score a few candidate delays
(e.g. 6h, 24h, 72h) through the trained model and rank them. See
`docs/PROJECT_OVERVIEW.md` build order — this is an enhancement layered on
top of the core model, not a separate model.

## Features

From Transaction, Retry Attempt, and Customer entities (see
`docs/DATA_SCHEMA.md`):

- `attempt_number`
- `time_since_last_attempt`
- `time_since_first_failure`
- `failure_reason` (categorical, one-hot or native categorical support)
- `is_near_payday`
- `payment_method`
- `is_recurring`
- `merchant_category`
- `customer.segment`
- `customer.historical_failure_rate`
- `amount`

`is_hard_fail` rows are excluded from training entirely (no retry ever
attempted, no meaningful label).

## Model choice

XGBoost or LightGBM. Not a neural network.

Reasoning: this is a tabular classification problem. Gradient-boosted trees
match or beat deep learning on tabular data of this size, train fast, and —
critically — support SHAP explainability natively. A financial decision
system needs to justify itself; an unexplainable deep net actively works
against that goal for no accuracy benefit here.

## Explainability

- Per-prediction: SHAP values, surfaced in the UI as a small horizontal bar
  breakdown ("attempt_number: +12%", "is_near_payday: +8%", etc.) — see
  `docs/screens/transaction-feed.md` and `docs/screens/playground.md`.
  Do not show a raw SHAP dump; show the sign and magnitude for the top 3-4
  contributing features, in plain feature names.
- Global: a single feature-importance bar chart for the Analytics screen and
  the write-up, showing which features matter most overall.

## Evaluation strategy

Because both the training data and the model are built by the same person,
there's a real risk of the model simply re-deriving the generation formula
rather than learning generalizable structure. Address this explicitly:

1. **Perturbed-parameter test set.** Generate a second synthetic batch using
   the same schema but different generation-rule parameters (e.g. shift the
   payday-effect strength, change the attempt-number decay rate). Evaluate
   the trained model on this batch, not just a held-out split of the same
   generation run.
2. **Suspicion threshold.** If AUC/accuracy on the original held-out split is
   above ~0.97, treat that as a red flag of overfitting to the generator's
   exact formula, not a result to be proud of. Investigate before reporting
   it.
3. **Domain sanity-check via SHAP.** Confirm the model's learned feature
   importances match real domain patterns researched separately (e.g.
   diminishing returns per attempt, payday sensitivity for
   `insufficient_funds` — see published dunning-system writeups referenced
   in `docs/DESIGN_DECISIONS.md`).
4. **Baseline comparison.** Compare against: always-retry, never-retry, and
   majority-class predictors. The trained model should outperform these
   meaningfully but not implausibly.
5. **Disclose the limitation.** State plainly in the write-up and the
   in-app Design Decisions page that real failed-payment data isn't publicly
   available, and that validation relies on perturbed synthetic splits and
   domain sanity-checks rather than real-world holdout data.

## Confidence gate

The orchestrator only lets the model *skip* a scheduled retry (i.e. say "not
worth retrying") when its confidence is above 85%. Below that threshold, the
rule-based backoff schedule takes over regardless of the model's output. See
`docs/ORCHESTRATOR_RULES.md`.
