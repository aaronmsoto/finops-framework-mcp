# 2026-09-25 — tokenomics-overview-mcp build (stacked on the design PR)

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

## Independent review — 2026-09-25T09:10Z

- Reviewer subagent verdict: PASS-with-findings (no blockers). Fixed:
  M1 framework links now need a `mentions` phrase present in the evidence
  (one unnamed link dropped; decisions.md amendment); M2 list/search/info
  tools now end with a sources-and-status footer + CC BY attribution;
  L1/L2 calculator rejects a lone multiplier, a multiplier without a base
  price, and non-finite totals; L5 JSON sub-keys no longer treated as FOCUS
  identifiers and CurrencyFormat links to its FOCUS 1.2 attribute URI; L6
  private module names removed from the design doc; L7 define_term misses
  suggest related records. Data regenerated from cache → v1.0.1 (39 links).
- Not changed: L3 (invalid overlay fails the server closed — deliberate),
  L4 (dist/shared/tokenomics ships in the other tarballs, as
  dist/shared/focus already does), changelog carrying crawled_at (same as
  the framework emitter).
- Also committed: eval bridge forwards TOKENOMICS_MCP_CURRICULUM.
