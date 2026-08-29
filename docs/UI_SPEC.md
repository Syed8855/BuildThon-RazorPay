# UI spec

Shared design tokens and structure. Per-screen detail lives in
`docs/screens/*.md` — this file defines what's common across all of them so
nothing is redefined inconsistently per screen.

## Screen inventory

| Screen | File | Priority |
|---|---|---|
| Hero / landing | `screens/hero.md` | enhancement |
| Dashboard | `screens/dashboard.md` | core |
| Transaction feed + detail | `screens/transaction-feed.md` | core |
| Simulation Playground | `screens/playground.md` | enhancement |
| Analytics | `screens/analytics.md` | enhancement |
| Design Decisions page | `screens/design-decisions-page.md` | enhancement |

## Navigation

Top nav or sidebar, persistent across all screens except Hero:
`Dashboard | Transactions | Playground | Analytics | Design Decisions`

## Color system

Status color code — used consistently in every screen, every component that
shows transaction/retry status. Do not introduce other colors for status
meaning.

| Status | Color | Hex (approx, adjust for contrast) | Usage |
|---|---|---|---|
| Failed / hard-fail | Black / near-black | `#0A0A0A` (light bg), `#1A1A1A` on dark | badges, hero card front face |
| In-progress / retrying | Blue (Razorpay blue) | `#3395FF` primary, `#072654` deep bg | badges, primary buttons, chrome |
| Recovered | Gold / yellow | `#F2B705` or `#EFB80B` | badges, hero card back face, success states |

Base palette (non-status, structural):

| Token | Light mode | Dark mode | Usage |
|---|---|---|---|
| Background | `#FFFFFF` | `#072654` (deep blue) | page background |
| Surface / card | `#F5F7FA` | `#0E3A6B` | cards, panels |
| Border | `#E2E6EB` | `#1B4E85` | hairlines |
| Text primary | `#0A0A0A` | `#FFFFFF` | body text |
| Text secondary | `#5C6470` | `#A9C4E8` | supporting text |
| Accent (brand) | `#3395FF` | `#3395FF` | primary CTAs, links, active nav |

Do not use gradients except the optional subtle background texture on the
Hero screen. All other surfaces are flat.

## Typography

- Font family: system sans-serif stack (e.g. Inter or the default Next.js
  font) — no serif anywhere in this app.
- Sizes: `h1` 32px/600, `h2` 24px/600, `h3` 18px/500, body 15px/400, small/
  caption 13px/400. Line height 1.5 for body, 1.2 for headings.
- Sentence case throughout — no Title Case, no ALL CAPS, including button
  labels and nav items.
- Numbers (currency, percentages, counts) always formatted via
  `Intl.NumberFormat` or `.toFixed()` — never raw floats reaching the screen.

## Spacing

- Base unit: 4px. Use multiples of 4 for all padding/margin (4, 8, 12, 16,
  24, 32, 48).
- Card padding: 16px (mobile), 24px (desktop).
- Section gaps: 32px between major sections on a screen.
- Grid gaps: 12px between cards in a KPI/stat grid.

## Shared components

### Status badge
Pill shape, `border-radius: 999px`, padding `4px 12px`, font-size 13px/500.
Background = status color at 12% opacity tint, text = full-strength status
color. One of: Failed (black), Retrying (blue), Recovered (gold).

### KPI / metric card
`border-radius: 12px`, padding 16-24px, surface background, no border in
light mode / thin border in dark mode. Label: 13px secondary text above a
24-28px/600 number.

### SHAP contribution bar
Horizontal bar per feature: feature name (left, 13px), bar (proportional to
`abs(impact)`, colored positive=blue or gold / negative=black-gray),
signed percentage value (right, 13px/500). Show top 3-4 features only, not
a full dump.

### Orchestrator decision line
A single-line callout, icon + text, e.g. "Retry scheduled in 24hrs
(backoff rule)". Background tinted with the relevant status color at low
opacity. Always shown above or alongside the model's probability score, not
instead of it.

## Animation principles (see `screens/hero.md` for the hero-specific
sequence)

- Use Framer Motion for all custom animations (card slide/flip, staggered
  reveals).
- Standard transition duration: 300-400ms for UI state changes (badge color
  change, panel open/close), 600-900ms for the hero card sequence.
- Easing: `easeOut` for entrances, `easeInOut` for flips/transforms.
- Respect `prefers-reduced-motion` — provide a reduced/instant fallback for
  the hero animation and pictogram chart.

## Responsiveness

Design desktop-first (this is a demo/dashboard product, primarily viewed on
a laptop during judging), but ensure no horizontal scroll or broken layout
at tablet width (768px). Mobile is not a priority for this build.
