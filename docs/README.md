# docs/ — this project's documentation

This directory belongs to **your project**. The starter template's own
documentation (architecture contract, operations manual, getting-started,
research corpus) lives out of the way in [`.agentic/docs/`](../.agentic/docs/).

[`guide/`](guide/index.html) is published as the project's **GitHub Pages
site** — and it is the only thing published: the deploy workflow uploads
that directory alone, so nothing else in here is served on the public web.
Setup and smoke test: [`deploy-pages.md`](deploy-pages.md).

What lives here:

- [`guide/`](guide/index.html) — the six-page usage guide; the published
  site's front door.

- [`designs/`](designs/) — rich, self-contained HTML design docs for your
  features, created via the `design-feature` skill
  (`./scripts/agentic design new <slug>`), validated by the `designs` gate,
  reviewed privately via `./scripts/agentic serve`. Format rule: markdown for
  machine contracts, HTML only for design docs.
- [`adr/`](adr/) — your architecture decision records; see
  [`adr/INDEX.md`](adr/INDEX.md). (Lightweight decisions go to
  `.agents/memory/decisions.md`; ADRs are for the load-bearing ones worth a
  standalone page.)
- Anything else your project needs — guides, runbooks, API docs — in markdown.

Reference material: the harness's user manual is
[`.agentic/docs/operations.md`](../.agentic/docs/operations.md); the full
machinery contract is [`.agentic/docs/architecture.md`](../.agentic/docs/architecture.md).
