---
name: design-feature
description: Produce an owner-reviewable design for a new feature - a rich self-contained HTML design doc (docs/designs/) plus the markdown spec contract - and stop at the owner checkpoint. Use when the owner requests a new feature, interface, or architectural change big enough to deserve a design (novel architecture, new user-facing surface, multi-task scope), or asks to "design" something from the roadmap. Do not use for small fixes (just do them), for decomposing an approved spec into tasks (use plan-feature), or for editing machine-facing docs.
---

# design-feature

Turn owner intent into a reviewable design. The design doc is the human
thinking surface; the spec is the machine contract. Nothing downstream
(planning, building) starts until the owner approves the design.

## Steps

1. **Capture intent.** If the feature isn't in `.agents/roadmap.md`, add an
   entry (status `idea`). Read `MEMORY.md`, `patterns.md`, and the relevant
   code before designing — designs that ignore the codebase get rejected.
2. **Scaffold:** `./scripts/agentic design new <slug> --title "<Title>"`
   (slug: lowercase, hyphens). This creates `docs/designs/<slug>.html` from the
   house template and `.agents/specs/<slug>.md`.
3. **Write the design** in the HTML doc:
   - Fill the summary callout first — the owner decides whether to read on
     from that paragraph alone.
   - Overview (problem/outcome/scope), Architecture (inline SVG diagrams,
     `<details>` for depth), Interfaces (CLI contracts, API shapes, UI mockups
     as inline SVG), Alternatives (real ones, with honest verdicts), and an
     "Open questions for the owner" callout.
   - **Self-contained only**: inline all CSS/JS/SVG. No external scripts,
     styles, fonts, images, or network calls — `agentic design check` (the
     `designs` gate) fails otherwise. This is the privacy guarantee.
4. **Write the spec** (`.agents/specs/<slug>.md`): problem, outcome, non-goals,
   and concrete checkable acceptance criteria. The spec is what the loop and
   verifier enforce; keep it consistent with the design, and if they ever
   disagree, the spec wins.
5. **Update the roadmap entry** to `designing` with links to both files.
6. **Verify:** `./scripts/agentic gates` (includes the `designs` gate).
7. **Stop for the checkpoint.** Tell the owner how to view it:
   `./scripts/agentic serve` → `http://127.0.0.1:4177/docs/designs/<slug>.html`
   (or open the file directly — it is self-contained). Summarize the open
   questions that need their decision. Do NOT run `/plan-feature`, add tasks,
   or start implementing until the owner approves.

## After approval

Owner says go → set the roadmap entry to `specced`, then use `/plan-feature`
to decompose the spec into tasks. If the owner configured
`designs.publishCommand` in `agentic.config.json`, offer
`./scripts/agentic design publish <slug>` to push the design to their private
renderer — never publish any other way.
