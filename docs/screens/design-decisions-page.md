# Design Decisions in-app page

Priority: enhancement (differentiator #7).

Purpose: prove depth of thinking to anyone who wants to go beyond the demo.
Content source: `docs/DESIGN_DECISIONS.md` — this screen renders that content
in-app rather than leaving it buried in a README nobody reads closely.

## Format

One card/section per major decision. Each section follows the same
three-part structure:
- **Decision** — what was chosen
- **Why** — the reasoning
- **Rejected** — what alternative was considered and why it lost

Content for each section comes directly from `docs/DESIGN_DECISIONS.md` — do
not diverge or duplicate-and-drift; this page should be a rendering of that
file, not a separate hand-written copy.

## Layout

- Use the shared card component styling from `docs/UI_SPEC.md`
  (`border-radius: 12px`, surface background) — same visual language as the
  rest of the app, not a bolted-on afterthought.
- Keep each section short — 3-4 sentences per part max. This page is meant
  to be skimmed in 60-90 seconds, not read like a paper.
- Optional: a short "what we'd do with more time" line per section — turns
  scope limitations into a visible roadmap, reads as self-aware rather than
  incomplete.

## Sections (in order)

1. Data: hybrid synthetic vs Kaggle
2. Model target: retry success probability vs optimal timing
3. Statefulness: feature engineering + guardrails vs sequence modeling
4. Model choice: XGBoost/LightGBM vs deep learning
5. Architecture: rules + ML hybrid vs pure ML
6. Deployment: Next.js proxy vs direct browser-to-backend calls
7. Validation approach: perturbed-parameter testing vs naive holdout

## Notes

- This screen should be one of the last built — it depends on
  `docs/DESIGN_DECISIONS.md` being finalized, and it's explicitly listed as
  droppable if time runs short. But it's cheap to build (mostly static
  content rendering) relative to its credibility payoff, so it's worth
  prioritizing over some other enhancements once the core app works.
