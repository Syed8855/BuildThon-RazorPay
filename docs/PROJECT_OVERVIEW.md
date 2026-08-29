# Project overview

## Problem

Failed payments are one of the largest drivers of involuntary churn in
subscription businesses. Most recovery systems either retry blindly on a fixed
schedule or don't retry intelligently at all. This project predicts whether a
retry will succeed, decides when/how to retry via rule-based guardrails, and
explains every decision — instead of behaving as an unexplainable black box in
a financial decision system.

## Track

Razorpay AI Builder Internship — AI Revenue Recovery track.

## One-liner

Recover revenue before it slips away — an explainable, rules-guarded ML system
for failed payment retry.

## Architecture (high level)

```
Browser
  |
  v
Next.js (Vercel) — sole public-facing surface
  |  server-side fetch, no browser-to-ML calls
  v
FastAPI ML service (Railway/Render)
  |
  +-- Recovery Orchestrator (rules layer)
  |     - max retry attempts, min spacing, hard-fail routing,
  |       escalating backoff, cycle cutoff, confidence gate
  |
  +-- XGBoost/LightGBM model
        - predicts retry success probability
        - SHAP explains each prediction
```

Rules decide **whether/when** a retry happens. ML decides **how confident** we
are it will succeed. Neither layer works alone — see
`docs/ORCHESTRATOR_RULES.md` and `docs/MODEL_SPEC.md`.

## Stack

- Frontend: Next.js, Vercel
- Backend: FastAPI, Railway or Render
- Model: XGBoost/LightGBM, SHAP for explainability
- Data: hybrid synthetic dunning/retry event log (see `docs/DATA_SCHEMA.md`)
- Communication: Next.js API routes proxy server-side to FastAPI — avoids
  CORS, keeps the model server off the public internet
- Model loads once at process startup, not per-request

## Build priority order

Core (must-have, in order):
1. Synthetic data generation
2. Model training + evaluation
3. Orchestrator rules engine
4. FastAPI `/predict` and `/simulate` endpoints
5. Next.js proxy + Dashboard + Transaction Feed + Detail panel
6. Deployment (both services live, connected)

Enhancements (build if time remains, in order):
7. Hero animation (card slide + flip)
8. Simulation Playground with rules-vs-ML comparison
9. Pictogram chart on Dashboard
10. Money-at-risk live counter
11. Customer-message mode
12. Analytics screen (funnel, trend, feature importance)
13. Design Decisions in-app page
14. Channel recommendation (rule-based)
15. True sequence modeling (RNN/LSTM) — explicitly out of scope unless
    everything else is done early

If time runs short, cut from the bottom of the enhancement list first. Nothing
in "core" should be cut — a working rules+ML system with a plain UI beats a
half-built polished one.

## Non-goals

- No sequence modeling (RNN/LSTM) as the primary model — noted as a stretch
  goal only, see `docs/MODEL_SPEC.md`.
- No ML model for channel recommendation — kept rule-based deliberately, see
  `docs/DIFFERENTIATORS.md`.
- No claim of real-world validated data — synthetic data limitations are
  stated explicitly in the writeup and in-app, not hidden.
