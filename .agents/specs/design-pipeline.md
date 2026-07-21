# Spec: Feature design pipeline

Design: [docs/designs/design-pipeline.html](../../docs/designs/design-pipeline.html)

## Problem

The template covers execution (specs → tasks → loop) but not definition: no
roadmap tier for product intent, no home or format for architecture/interface
designs, and no private way to review rendered design documents.

## Outcome

A feature travels roadmap → design (HTML, owner-reviewed) → spec (markdown,
machine contract) → tasks → loop, with the owner checkpoint between design and
planning. Design docs render privately with zero network.

## Non-goals

Public hosting; converting machine-facing markdown to HTML; WYSIWYG tooling.

## Acceptance criteria

- [x] `.agents/roadmap.md` exists with format header and status flow.
- [x] `docs/designs/TEMPLATE.html` is self-contained (tabs, details, inline SVG,
      dark mode) and `design new <slug>` scaffolds design + spec from templates.
- [x] `agentic design check` fails malformed HTML, external resource references,
      network calls in inline script, and dead relative links; wired as the
      `designs` gate (fast tier).
- [x] `agentic serve` serves the repo on 127.0.0.1 only, with traversal-safe
      path handling.
- [x] `agentic design publish` runs the optional `designs.publishCommand` hook
      with `DESIGN_FILE`/`DESIGN_SLUG`; errors clearly when unconfigured.
- [x] `/design-feature` skill drives the flow and stops at the owner checkpoint.
- [x] Contract (.agentic/docs/architecture.md) records the two-tier format rule.
