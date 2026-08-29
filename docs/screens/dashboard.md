# Dashboard screen

Priority: core (the pictogram chart specifically is an enhancement; the KPI
strip and feed preview are core).

## Layout, top to bottom

### 1. KPI strip (core)

Grid of 4 metric cards (see `docs/UI_SPEC.md` "KPI / metric card"),
`grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`, gap 12px.

- Recovery rate (%) — blue accent number
- Revenue recovered (currency) — gold accent number
- Active retries in progress — neutral/blue accent
- Hard-failed / unrecoverable count — black/neutral accent

### 2. Money-at-risk live counter (enhancement, differentiator #1)

A prominent single stat, visually distinct from the KPI grid (larger, own
row) — "Revenue currently at risk: ₹X" — value updates live/periodically as
data changes. See `docs/DIFFERENTIATORS.md` for the calculation logic. Place
directly below the KPI strip so it reads as the headline number, not buried.

### 3. Pictogram chart (enhancement)

Centerpiece visual. Three columns: Failed / Retrying / Recovered. Small
stickman/figure icons animate in (walk + hop onto a stack) representing
counts in each category.

- **Scaling rule:** one figure = N transactions, where N is chosen so the
  total figure count per column stays readable (roughly 10-30 figures max
  per column) regardless of dataset size. Compute N as
  `ceil(max_column_count / 25)` or similar, rounded to a clean number (1, 5,
  10, 50, 100...) and show the ratio explicitly as a caption (e.g. "each
  figure = 10 transactions").
- **Animation:** staggered entrance (Framer Motion `staggerChildren`), each
  figure translates in from the side then hops up (`translateY` with a
  bounce/spring easing) onto its stack position. Total entrance animation
  should complete within ~2-3s regardless of figure count — don't let it
  scale linearly with N figures; cap per-figure delay so it stays fast.
- **Color:** figures colored by their column status (black/blue/gold per
  `docs/UI_SPEC.md`).
- **Fallback:** if this proves too time-costly to build, the funnel chart
  (see `screens/analytics.md`) can stand in on the Dashboard instead — this
  is explicitly the droppable enhancement, not the KPI strip or feed.

### 4. Recent activity / transaction feed preview (core)

Condensed table, 5-6 rows, columns: ID, failure reason, attempt count
(e.g. "2/4"), status badge. Links out to the full Transaction Feed screen
(`screens/transaction-feed.md`). Use the shared status badge component from
`docs/UI_SPEC.md`.

## Notes

- Keep the KPI strip and feed preview functional before touching the
  pictogram animation — those two alone make the dashboard demoable.
- All currency values formatted via `Intl.NumberFormat` with the correct
  currency code, all percentages rounded to whole numbers or 1 decimal max.
