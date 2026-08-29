# AI revenue recovery

Built for the Razorpay AI Builder Internship — AI Revenue Recovery track.

## What this is

A recovery system for failed payments. When a payment fails, most systems either
retry blindly or give up. This project predicts whether a retry will succeed,
decides when and how to retry using a rules-based orchestrator, and explains
every decision it makes.

## Why this approach

- **Rules + ML hybrid, not pure ML.** A financial decision system needs bounded,
  predictable behavior. Rules decide *whether/when* to retry (max attempts, backoff,
  hard-fail routing). ML decides *how confident* we are a given retry will succeed.
  See `docs/ORCHESTRATOR_RULES.md`.
- **Explainable by default.** XGBoost, not a neural net — the problem is tabular
  and doesn't need deep learning. Every prediction ships with a SHAP breakdown.
  See `docs/MODEL_SPEC.md`.
- **Synthetic data, not a mismatched public dataset.** No public dataset has
  retry-sequence/dunning data. Synthetic data lets us control the schema to match
  the actual problem, seeded with real decline-code taxonomies for realism.
  See `docs/DATA_SCHEMA.md`.

Full reasoning behind every major decision — including what we rejected and why —
lives in `docs/DESIGN_DECISIONS.md` and is also rendered as an in-app page.

## Project structure

```
docs/
  PROJECT_OVERVIEW.md      architecture, stack, priority order
  DATA_SCHEMA.md           entities, fields, synthetic generation logic
  MODEL_SPEC.md            target, features, model choice, evaluation strategy
  ORCHESTRATOR_RULES.md    guardrail rules as explicit logic
  API_SPEC.md              FastAPI endpoints, request/response shapes
  UI_SPEC.md               design tokens, shared components, navigation
  DIFFERENTIATORS.md       standalone specs for the four differentiator features
  DESIGN_DECISIONS.md      decision / why / rejected, per major choice
  BUILD_PLAN.md            step-by-step build order
  screens/
    hero.md
    dashboard.md
    transaction-feed.md
    playground.md
    analytics.md
    design-decisions-page.md
backend/                   FastAPI ML service
frontend/                  Next.js app
data/                      synthetic data generation scripts
```

## Stack

- Frontend: Next.js, deployed on Vercel
- ML backend: FastAPI, deployed on Railway/Render
- Model: XGBoost/LightGBM with SHAP explainability
- Data: synthetic dunning/retry event log

## Status

See `docs/BUILD_PLAN.md` for current build progress.
