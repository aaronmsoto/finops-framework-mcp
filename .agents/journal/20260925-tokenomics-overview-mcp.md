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

## Build — 2026-09-25T09:00Z

- Did: shared types/schemas/loader (`src/shared/tokenomics`), crawler
  (`src/crawlers/tokenomics`: registry, HTML→md renderer with tables and
  stacked-fraction formulas, 13 entity extractors, generic record dialect,
  evidence-checked links, emit, CLI `refresh|derive|import-curriculum`),
  live crawl → `data/tokenomics` v1.0.0, stripped fixtures (fixture refresh
  reproduces the committed content byte-for-byte), server (20 tools, 3
  prompts, resources), shim package + pack script, packaging/mcp-surface
  tests, evals, docs.
- Result: format/lint/typecheck green; 504+ tests pass; coverage 82.9 %
  statements (ratchet 75.6). `gen-mcp-surface --check` clean. Fresh-agent
  eval 10/10, three-server scenario PASS; its friction list drove five
  small fixes in the same change.
- Environment notes: the focus packaging test failed once with ETARGET
  (stale npm packument cache in this container) — `npm cache clean
  --force` fixed it; the pack dry-run test times out if `dist/` is older
  than `src/` (prepack rebuilds) — build first.
- Deviations: curriculum overlay never committed (decisions.md); the
  checked-in `.mcp.json` does not list the unpublished package; experimental
  surface not advertised in README/server.json/mcp-surface (2026-08-15 rule).
- Next: owner review; protected-path edits for publishing.
