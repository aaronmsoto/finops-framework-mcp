# T-058 — Derive pipeline integration test (review R1)

2026-08-02

## What I did

`docs/final-status-review.md` (R1) flagged that offline derive/crawl
orchestration had zero test coverage: `deriveFromDocs`
(`src/crawlers/framework/markdown/derive.ts:405`) was exercised only
per-entity against synthetic fixtures in `derive.test.ts`, never
end-to-end, and `deriveArtifactPayload` (the offline `derive` CLI's core)
was never executed by any test at all. The prescribed fix was: "one
integration test running `deriveArtifactPayload` against
`data/framework/content/markdown` and asserting equality with the
committed JSON."

Added `src/crawlers/framework/markdown/derive-artifact.test.ts`:

- Runs `deriveArtifactPayload(MARKDOWN_DIR)` against the real committed
  `data/framework/content/markdown` (127 files, 968K) and `loadArtifact`
  against the real committed `data/framework` artifact, then
  `toEqual`-compares every one of the 10 derived entities (principles,
  phases, domains, capabilities, personas, scopes, technologyCategories,
  maturityLevels, kpis, actions) against the corresponding committed
  field.
- Asserts zero parse warnings against the committed markdown (the 3
  warnings recorded in `manifest.json` are from the original HTML crawl,
  not the markdown re-derive path — confirmed these differ before writing
  the assertion, by running `deriveArtifactPayload` directly against a
  built `dist/`).
- Asserts `derived.counts` matches `artifact.manifest.counts`.
- Asserts `deriveArtifactPayload(dir)` is a pure thin wrapper over
  `deriveFromDocs(walkMarkdownFiles(dir))` (both exported entry points
  from the R1 finding, in one call).

Runtime: measured `deriveArtifactPayload` itself at ~37ms outside vitest;
the whole test file runs in 54ms inside the suite (727ms wall including
vitest transform/import overhead) — no full-tier binding needed, it stays
in the `test` gate's fast tier alongside everything else.

## Result

- `npx vitest run src/crawlers/framework/markdown/derive-artifact.test.ts`:
  4/4 pass.
- `./scripts/agentic gates`: PASS (format, lint, typecheck, test [407
  tests, up from 403], coverage skipped [optional/unbound], designs,
  integrity, memory). Coverage table: `derive.ts` in
  `crawlers/framework/markdown` now 96.59% stmts / 100% funcs (was
  reachable only via fixture-level unit tests before); `cli.ts` itself
  (argument parsing / file I/O wrapper) stays at 0% — out of scope for
  this task, which targeted the `deriveFromDocs`/`deriveArtifactPayload`
  orchestration functions named in R1, not the CLI's I/O shell.
- `./scripts/agentic gates --tier full`: PASS (build).
- No prompt/resource/tool surface changed, so `docs/mcp-surface.md` does
  not need regenerating.

## Next steps

- T-059 (demo under the format gate) remains: needs an owner-approved
  task since `agentic.config.json` gate definitions are a protected path.
- Rest of the `docs/final-status-review.md` MINOR backlog (MCP-1/2/3,
  TN-3, R6, L3/4/5 remainder — L3/L4 already landed via T-056) still open;
  see that doc's "Confirmed findings" section for the current list.
