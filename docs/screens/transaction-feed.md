# Transaction feed + detail panel

Priority: core.

## Transaction feed (list view)

### Filter bar
Pill filters at top: All / Pending Retry / Retrying / Recovered / Hard-Failed
— using the shared status badge colors from `docs/UI_SPEC.md`. Plus a search
input (transaction ID or customer ID).

### Table / list
One row per transaction:
- Transaction ID
- Amount (formatted currency)
- Failure reason (small badge, neutral styling — not a status color, this is
  a category not a status)
- Attempt count, e.g. "2/4"
- Status badge (black/blue/gold per `docs/UI_SPEC.md`)
- Next scheduled retry time (or "—" if none scheduled)
- Success probability (small % + thin colored progress bar)

Row click opens the detail panel as a **side drawer**, not full navigation —
preserves context and is faster to demo live.

### Live status transition
When a transaction's status changes (e.g. during a Playground-triggered
simulation, or live data refresh), animate the badge with a brief color
transition (300-400ms) rather than an instant swap — a small nod to the hero
card-flip motif without over-animating the whole list.

## Detail panel (side drawer)

### Header
Transaction ID, amount, customer segment, current status badge.

### Attempt timeline
Vertical timeline, one entry per attempt: attempt number, failure/outcome,
timestamp, delay since previous attempt. This makes the state-as-features
approach from `docs/MODEL_SPEC.md` visible, not just an internal detail.

### Current decision panel
- Success probability: large %, colored by status-relevant threshold (not a
  strict 3-color rule here — use blue for mid, gold-leaning for high,
  black/neutral for low, but do not overload this into a 4th color meaning;
  keep it a single blue-to-gold intensity scale if simpler).
- SHAP contribution bars (shared component from `docs/UI_SPEC.md`) — top 3-4
  features only.
- Orchestrator decision line (shared component from `docs/UI_SPEC.md`) —
  e.g. "Retry scheduled in 24hrs (backoff rule)" or "Hard-fail — routed to
  customer action."

### Customer-message mode (enhancement, differentiator #5)
A toggle or secondary tab within the detail panel: "View as customer
message" — shows the actual generated customer-facing text (e.g. "Your
payment didn't go through — update your card to keep your subscription
active"), not just internal model reasoning. See `docs/DIFFERENTIATORS.md`
for message generation logic.

### Action area (hard-failed transactions only)
Suggested channel + message preview for routing to customer action (email/
SMS prompt), per the rule-based channel logic in `docs/DIFFERENTIATORS.md`.

## Notes

- Keep the base feed + detail panel (timeline, probability, SHAP,
  orchestrator line) as core/must-build. Customer-message mode is the
  droppable enhancement within this screen if time is short.
