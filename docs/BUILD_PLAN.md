# Build plan

No dates are attached to this plan on purpose — it's ordered by dependency
and priority, not calendar. Work top to bottom; if time runs short, stop and
cut from the bottom, not the middle. See `docs/PROJECT_OVERVIEW.md` for the
full core-vs-enhancement breakdown this plan is derived from.

Each numbered step below should be its own git commit once complete and
working — the commit history should read as a build log.

## Phase 1 — Data

1. Implement the synthetic data generator per `docs/DATA_SCHEMA.md`
   (Transaction, Retry Attempt, Customer entities, generation logic).
2. Validate the generator's own output against the sanity checks listed at
   the end of `docs/DATA_SCHEMA.md` (recovery rate ordering by failure
   reason, decline with attempt number, payday bump) before moving on.
3. Generate a second batch with perturbed parameters, held aside for later
   model evaluation per `docs/MODEL_SPEC.md`.

## Phase 2 — Model

4. Train the XGBoost/LightGBM classifier on the primary target
   (`success`), features, and exclusions defined in `docs/MODEL_SPEC.md`.
5. Evaluate against the perturbed-parameter test set, baselines, and the
   "too good" suspicion check — all per `docs/MODEL_SPEC.md`.
6. Wire up SHAP explainability for per-prediction and global feature
   importance output.
7. Serialize the trained model (joblib/pickle) for loading at API startup.

## Phase 3 — Orchestrator + backend

8. Implement the rules engine per `docs/ORCHESTRATOR_RULES.md`
   (pseudocode `orchestrate()` function) as plain Python, independent of
   the model — this should be testable and demoable on its own.
9. Wire the model into the orchestrator's confidence-gated skip logic.
10. Implement the rule-based channel recommendation from
    `docs/DIFFERENTIATORS.md` (#2 dependency: channel appears in
    `/simulate` responses).
11. Build FastAPI endpoints per `docs/API_SPEC.md`: `/predict`,
    `/simulate`, `/transactions`, `/transactions/{id}`, `/analytics`,
    `/health`. Load the model once at startup.
12. Deploy the FastAPI service (Railway/Render). Confirm `/health` works
    from outside.

## Phase 4 — Frontend core

13. Scaffold Next.js app, set up API proxy routes per `docs/API_SPEC.md`
    (server-side fetch to the FastAPI base URL via env var).
14. Build shared components from `docs/UI_SPEC.md`: status badge, KPI card,
    SHAP contribution bar, orchestrator decision line.
15. Build Dashboard core: KPI strip + transaction feed preview (skip
    pictogram and money-at-risk counter for now) — `docs/screens/dashboard.md`.
16. Build Transaction Feed + detail drawer (timeline, probability, SHAP,
    orchestrator line) — skip customer-message mode for now —
    `docs/screens/transaction-feed.md`.
17. Deploy the Next.js app (Vercel), confirm it can reach the deployed
    FastAPI service end to end.

**Checkpoint: a working, deployed, explainable rules+ML recovery system
exists after step 17. Everything below is enhancement, in priority order.**

## Phase 5 — Enhancements (build and cut from the bottom if short on time)

18. Simulation Playground: input form + orchestrator decision + probability
    output — `docs/screens/playground.md`.
19. Rules-vs-ML comparison in the Playground (differentiator #2 — treat as
    non-droppable among the enhancements).
20. Hero screen: card-and-sleeve slide + 180° flip animation —
    `docs/screens/hero.md`.
21. Reuse the hero card component (scaled down) in the Playground output.
22. Dashboard pictogram chart — `docs/screens/dashboard.md`.
23. Money-at-risk live counter on Dashboard (differentiator #1).
24. Customer-message mode in the Transaction Feed detail panel
    (differentiator #3/#5).
25. Analytics screen: funnel, recovery-rate-over-time, feature importance —
    `docs/screens/analytics.md`.
26. In-app Design Decisions page, rendering `docs/DESIGN_DECISIONS.md` —
    `docs/screens/design-decisions-page.md`.

## Out of scope for this build

- True sequence modeling (RNN/LSTM) — noted throughout as a stretch goal
  only, do not start this unless everything above is complete.
- ML-based channel recommendation — deliberately rule-based, see
  `docs/DIFFERENTIATORS.md`.

## Learning approach

Fintech/payments domain knowledge (decline-code taxonomies, real dunning
system behavior, payment lifecycle, churn benchmarks) is picked up inline
while building each relevant phase above, not as a separate upfront
research phase.
