# Analytics screen

Priority: enhancement.

Purpose: precision companion to the Dashboard's pictogram chart — readable,
exact numbers for anyone (technical judge, or you under Q&A) who wants the
real figures fast, rather than the emotionally-resonant but slower-to-parse
pictogram.

## Sections

### 1. Funnel chart
Failed → Retried → Recovered / Churned, as a simple horizontal funnel or
stepped bar chart. Same counts as the Dashboard pictogram, different
presentation — should always agree with the pictogram's underlying numbers.

### 2. Recovery rate over time
Line or bar chart, last N days, recovery rate (%) per day/week. Makes the
dashboard/analytics feel live and data-driven rather than a static snapshot.

### 3. Global feature importance
Single horizontal bar chart, top 6-8 features from the trained model, per
`docs/MODEL_SPEC.md`. This is the "why trust this model" visual — pairs with
the Design Decisions page's explanation of model choice.

## Notes

- Use a standard chart library (e.g. Recharts, Tremor) rather than custom
  SVG/animation work here — this screen is about clarity and speed to build,
  not spectacle. Save custom animation effort for the Hero and Dashboard
  pictogram.
- All three charts pull from the same `GET /analytics` endpoint (see
  `docs/API_SPEC.md`) — do not compute funnel/trend numbers separately in
  the frontend from what the pictogram uses; both must derive from the same
  source of truth to avoid showing inconsistent numbers across screens.
