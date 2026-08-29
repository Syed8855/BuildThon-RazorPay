# Hero / landing screen

Priority: enhancement (build after core screens are working).

## Layout

1. Background: deep Razorpay blue (`#072654`), optional subtle gradient/grid
   texture for depth — the one exception to the "no gradients" rule in
   `docs/UI_SPEC.md`.
2. Centerpiece: card-and-sleeve animation (see below), positioned center or
   center-right.
3. Headline + subtext, revealed alongside/after the card animation completes.
4. Primary CTA: "Try the demo" → links/scrolls to Dashboard or Playground.
5. Secondary CTA (optional): "How it works" → anchor scroll to a brief
   explainer or straight to Design Decisions page.
6. Optional below-the-fold: one stat strip (e.g. "~20-40% of subscription
   churn is payment-failure-driven, not choice-driven") + 3 icon+text feature
   callouts (Smart retries, Explainable AI, Rule guardrails).

## Card + sleeve animation — exact sequence

This is a functional animation, not decorative — the card's front/back faces
carry real meaning (failed → recovered), so build it as a two-sided card, not
a single continuous 360° spin.

Sequence:
1. **Initial state:** card sits mostly tucked inside a sleeve/cover
   illustration, front face visible, showing "Payment Failed" with the
   black/near-black status accent.
2. **Slide out** (0-400ms): card translates upward/outward from the sleeve
   (`translateY` or `translateX`), slight rotation for depth (2-5deg), sleeve
   may fade slightly as the card exits. Easing: `easeOut`.
3. **Pause** (400-500ms): brief hold so the slide reads as a distinct beat
   before the flip starts.
4. **180° flip** (500-900ms): `rotateY: 0 -> 180deg` on the card. Front face
   has `backface-visibility: hidden`; back face (the "Recovered" state,
   pre-rotated 180deg so it reads correctly on arrival) becomes visible as
   the card passes 90deg. Easing: `easeInOut`.
5. **Settle** (900-1000ms): card comes to rest showing the back face —
   "Recovered" — with the gold/yellow status accent. Small scale bounce
   (1.0 -> 1.03 -> 1.0) on settle for a satisfying finish, optional.
6. **Headline reveal**: headline/subtext fade+slide in (`translateY(8px) ->
   0`, opacity 0 -> 1) starting around the 700-900ms mark, overlapping the
   tail of the flip rather than waiting for it to fully finish.

Total duration target: ~1-1.2s from page load to settled state + revealed
headline. Do not make this longer — it's a hero moment, not a loading
sequence.

## Card face content

- Front ("Payment Failed"): status color black/near-black, small icon (e.g.
  `ti-x` or a card-decline glyph), label "Payment failed", muted secondary
  line (e.g. a generic decline reason, purely illustrative).
- Back ("Recovered"): status color gold/yellow, small icon (e.g. `ti-check`),
  label "Recovered", secondary line (e.g. "Retried automatically").

## Technical notes

- Build with Framer Motion (`motion.div`, `rotateY` transform,
  `backface-visibility: hidden` on both faces, both faces absolutely
  positioned in the same container).
- Trigger on mount (page load), not on scroll — this is the very first thing
  a viewer sees.
- Respect `prefers-reduced-motion`: skip straight to the settled "Recovered"
  state with a simple fade-in, no slide/flip, if the user has this
  preference set.
- Reuse a scaled-down version of this same card component in the Simulation
  Playground (see `screens/playground.md`) so the visual language is
  consistent across the app, not a one-off hero-only asset.
