# 2026-08-06 — T-073 wider large-viewport container for the published guide

## Measured first, then changed — 2026-08-06T05:00:00Z

Owner report: on a large display the six nav links wrap to two lines, and the
Data Model's five cards on `framework-server.html` wrap instead of sharing a
row. Measured in headless Chromium against the six pages before touching
anything:

- The container was pinned at `78ch` (~834px box, ~794px content) at **every**
  desktop width — 1024 through 1920 all rendered identically.
- The nav needs **892px** of content width to sit on one line (measured with
  `flex-wrap: nowrap; width: max-content`). It never had it.
- The five `.dm-card`s at `minmax(11rem, 1fr)` need a **960px** container.
- Body prose was **already ~111 characters per line** (14.4px font, 7.15px
  average glyph). Widening the whole column would have pushed it to ~125.

That last number changed the approach. Simply widening everything would have
fixed the two reported symptoms while making the body text harder to read.

## What changed

**Shared chrome (all six pages, byte-identical edit).** Added a `--wrap`
custom property: `78ch` by default, `62rem` (992px content) from `64rem` up,
applied to `header.guide`, `footer.guide` and `main`. The `main` override
lives in the chrome block rather than each page's base block, so the chrome
stays identical across all six files — verified by hashing the block before
and after (`cf89af376b2a` → `3064642901f1`, one value across all six).

Crucially, prose does **not** widen with it:

```css
main p:not(.callnote), main ul, main ol { max-width: 78ch; }
```

Paragraphs and lists keep their measure; the extra width goes to the nav,
tables, card grids and transcripts — the parts that were actually cramped.
`.callnote` is exempt because it is a `nowrap` scroll strip that wants the
full width. Net effect: prose went from 794px to **714px** (~111 → ~100
chars/line), so readability improved rather than degraded.

**Data Model (`framework-server.html`).** Was a grid with
`repeat(auto-fit, minmax(11rem, 1fr))`, which gave the two `→` arrows a full
1fr column each — as wide as the cards. Switched to flex: `.dm-card`
`flex: 1 1 7.5rem`, `.dm-arrow` `flex: 0 0 auto`. Cards share the row, arrows
take only what they need.

Below `34rem` the arrows become full-width and rotate 90°, so a wrapped row
reads as a vertical flow (4 → 22 → 88 stacked) instead of stranding an arrow
at the start of a line, which is what the naive wrap looked like.

## Result (measured, all six pages)

```
vw 1920: main=1032px prose=714px navRows=1 datamodel=3cards/1row 5cards/1row
vw 1440: main=1032px prose=714px navRows=1 datamodel=3cards/1row 5cards/1row
vw 1280: main=1032px prose=714px navRows=1 datamodel=3cards/1row 5cards/1row
vw 1024: main=1024px prose=714px navRows=1 datamodel=3cards/1row 5cards/1row
vw  900: main= 834px prose=714px navRows=2 datamodel=3cards/1row 5cards/1row
vw  768: main= 768px prose=680px navRows=2 datamodel=3cards/1row 5cards/2row
vw  414: main= 414px prose=326px navRows=3 datamodel=3cards/3row 5cards/3row
vw  360: main= 360px prose=272px navRows=4 datamodel=3cards/3row 5cards/3row
```

Phone comparison against a checkout of `origin/main`: nav row counts are
**identical** (3 at 414, 4 at 360), and the five cards now pair 2+2+1 instead
of stacking as five singles at 360. Screenshots confirmed the desktop nav on
one line, the two card rows, dark mode, and the phone vertical flow.

## Pre-existing issue, deliberately not fixed here

`index.html`, `framework-server.html` and `focus-server.html` overflow
horizontally at 414px and 360px. **This is not new** — a checkout of
`origin/main` overflows on exactly the same three pages at the same widths.
Left alone because it is unrelated to this task and diagnosing it (likely a
`min-width` on a table or chip row escaping its scroll container) deserves
its own change rather than being smuggled into a layout tweak. Worth a
follow-up task.
