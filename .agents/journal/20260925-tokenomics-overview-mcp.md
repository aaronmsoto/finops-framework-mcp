# 2026-09-25 — tokenomics-overview-mcp (design + build, overnight)

## Design — 2026-09-25T08:30Z

- Did: surveyed both servers, the cert-prep `ai-tokenomics/` and
  `tokenomics-foundation/` folders, and the live tokeneconomics.com site
  (WP REST = discovery only; bodies from rendered HTML). Asked the owner four
  questions; all four recommended options chosen (Foundation pages default +
  labeled extras experimental; stated links + flagged crosswalk; third
  published stdio package; design PR then stacked build PR).
- Result: design `docs/designs/tokenomics-overview-mcp.html`, spec
  `.agents/specs/tokenomics-overview-mcp.md`, roadmap entry (specced).
  One deviation from the literal answer: curriculum stays a local overlay
  (repo is public, curriculum is private/passcode-gated) — flagged as the
  first open question.
- Harness CLI unavailable (no NPM_TOKEN): ran the CONTRIBUTING.md
  external-contributor checks instead; no task-chain records this session.
- Next: build on a stacked branch per the spec.
