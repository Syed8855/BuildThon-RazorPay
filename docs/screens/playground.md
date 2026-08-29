# Simulation Playground

Priority: enhancement, but the single highest-leverage one — this is what
proves the system reasons live rather than just displaying pre-baked data.

## Input panel

Left side (or top, if stacking vertically):
- Failure reason — dropdown, values from `docs/DATA_SCHEMA.md` taxonomy
- Attempt number — stepper or slider, 1-4
- Time since last attempt — slider, hours/days
- Customer segment — dropdown: new / returning / high_value
- "Run simulation" button — primary accent-blue button, per
  `docs/UI_SPEC.md` (one primary action per view)

Validate inputs before submission: if a required field is unset, show an
inline error and do not submit — do not silently default values.

## Output panel

Right side (or below), revealed on submit — do not pre-render empty state
content that looks like a result.

### 1. Orchestrator decision (shown first)
Matches the real evaluation order in `docs/ORCHESTRATOR_RULES.md`. e.g.
"Hard-fail — no retry", "Retry scheduled in Xhrs per backoff rule", or
"Within retry window — model consulted." Use the orchestrator decision line
shared component.

### 2. Rules-only vs ML-enhanced comparison (differentiator #3)
Side-by-side or stacked comparison:
- **Rules-only column:** what a pure backoff-schedule system would do with
  no ML input at all.
- **ML-enhanced column:** what the actual orchestrator (rules + model)
  decides, including the probability score.

This is the single feature that demonstrates the ML layer adds real value
over rules alone — do not skip this even if other enhancements get cut.

### 3. Model output (when ML is consulted)
- Success probability, shown via a scaled-down version of the hero card
  component (see `screens/hero.md`) — flips from black (low/failed framing)
  to gold (high/recovered framing) based on the probability crossing a
  threshold. Reuses the same Framer Motion component, not a new one.
- SHAP contribution bars (shared component), same visual style as the
  Transaction Feed detail panel — consistency matters here since a judge
  will see both screens close together.

### 4. Customer message preview (ties to differentiator #5)
If the simulated scenario would trigger a customer-facing message, show the
generated text here too.

## Notes

- Build the input form + orchestrator decision + basic probability output
  first. Add the rules-vs-ML comparison and the card-flip visual once the
  core round-trip works — but treat the rules-vs-ML comparison specifically
  as non-droppable given how central it is to the pitch.
