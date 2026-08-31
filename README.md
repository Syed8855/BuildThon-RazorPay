# AI Revenue Recovery

Built for the Razorpay AI Builder Internship — AI Revenue Recovery track.

## What this is

An autonomous agent that recovers revenue at risk across three domains: failed payments, abandoned checkouts, and overdue B2B receivables.

Instead of blind retries or static alerts, it diagnoses root cause, decides the right intervention, and executes a bounded, compliant recovery workflow — with every decision logged and explainable.

**Live measured results:** 86.4% recovery rate on eligible transactions, 13.73% uplift over a rules-only baseline (batch-simulated, not projected).

## Why this approach

- **Rules + ML hybrid, not pure ML.** A financial decision system needs bounded, predictable behavior. Rules decide *whether/when* to retry (max attempts, backoff, hard-fail routing, quiet-hours compliance, DND/consent checks). ML decides *how confident* we are that a given retry will succeed. See `docs/ORCHESTRATOR_RULES.md`.

- **Explainable by default.** XGBoost, not a neural network — the problem is tabular and doesn't need deep learning. Every prediction ships with a SHAP breakdown, surfaced in the UI, not just the backend. See `docs/MODEL_SPEC.md`.

- **Hybrid data, not a mismatched public dataset.** No public dataset has retry-sequence/dunning data, so the core dataset is synthetic, with full control over the schema to match the actual problem. Transaction-level realism (amount distributions, decline-code taxonomy) is enriched using patterns borrowed from real payments/fraud datasets. See `docs/DATA_SCHEMA.md`.

- **Measured, not claimed, ML value.** Every simulation runs both a rules-only baseline and the full rules+ML path side by side, so the model's actual contribution is quantified, not asserted.

- **Bounded everywhere.** No workflow runs indefinitely — payment retries cap at 4 attempts / 14 days, checkout nudges cap at 3 (enforced server-side), and B2B receivables terminate at a 5-stage legal escalation.

Full reasoning behind every major decision — including what was rejected and why — lives in `docs/DESIGN_DECISIONS.md` and is also rendered as an in-app page.

## Features

- **Payment failure recovery** — 8-gate orchestrator: DND/consent → hard-fail short-circuit → max attempts → cycle cutoff → backoff spacing → ML confidence gate → quiet hours → retry execution, with per-decision SHAP explanations.

- **Checkout abandonment recovery** — Personalized WhatsApp/Email/SMS re-engagement with dynamic discounts and tokenized recovery links, capped at 3 nudges with server-side authoritative state tracking (not client-trusted).

- **B2B receivables chaser** — 5-stage aging escalation: gentle reminder → firm follow-up → surcharge notice → credit hold → legal escalation, with aging-bucket visualization.

- **Batch simulation** — Runs rules-only vs. rules+ML across a configurable batch, returning real recovered amounts, recovery rates, and uplift %.

- **Full audit trail** — Chronological, timestamped log of every attempt, channel, decision, and outcome per transaction.

- **Replay visualization** — Step-by-step animated walkthrough of a transaction's recovery lifecycle.

- **Design Decisions page** — Interactive, in-app explanation of the architecture and every major tradeoff.

## Project Structure

```text
docs/
├── PROJECT_OVERVIEW.md       # Architecture, stack, priority order
├── DATA_SCHEMA.md            # Entities, fields, synthetic generation logic
├── MODEL_SPEC.md             # Target, features, model choice, evaluation strategy
├── ORCHESTRATOR_RULES.md     # Guardrail rules as explicit logic
├── API_SPEC.md               # FastAPI endpoints, request/response shapes
├── UI_SPEC.md                # Design tokens, shared components, navigation
├── DIFFERENTIATORS.md        # Standalone specs for differentiator features
├── DESIGN_DECISIONS.md       # Decision / why / rejected, per major choice
├── BUILD_PLAN.md             # Step-by-step build order
│
└── screens/
    ├── hero.md
    ├── dashboard.md
    ├── transaction-feed.md
    ├── playground.md
    ├── analytics.md
    ├── checkout-recovery.md
    ├── receivables.md
    └── design-decisions-page.md

backend/                       # FastAPI ML service + orchestrator
frontend/                      # Next.js application
data/                          # Synthetic data generation scripts + attempt logs
```

## Stack

- **Frontend:** Next.js (App Router, Turbopack), React, deployed on Vercel
- **ML Backend:** FastAPI + Uvicorn, deployed on Render
- **Model:** XGBoost with SHAP explainability
- **Data:** Synthetic dunning/retry event log, enriched with realistic transaction patterns

## Key Engineering Notes

- All bounded-workflow limits (retry caps, nudge caps, escalation stages) are enforced **server-side**, not trusted from client input. These limits have been verified against spoofing attempts.

- API responses are validated with explicit `res.ok` checks and safe fallbacks throughout, so backend errors degrade gracefully in the UI instead of crashing the application.

- Backend cold-start delays on free-tier hosting are handled with explicit loading states and retry behavior rather than being hidden or ignored.

## Status

See `docs/BUILD_PLAN.md` for build progress and development history.
