# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

focus-spec-mcp v1 build loop (`.agents/specs/focus-mcp-v1.md`, tasks
T-027..T-038) is underway. T-027..T-031 are DONE.

T-031 this session: FOCUS CSV conformance validator. `src/shared/focus/
validate.ts` — `validateFocusCsv(columns, csvText)` checks, purely from a
version's `columns.json` (no hardcoded per-version rules): Mandatory-column
header presence, per-row nullability, data type (Decimal/Date-Time/JSON),
`allowed_values` membership (case-insensitive), currency-code format, and
non-negative range. Returns `{errors, warnings}` — see decisions.md
2026-07-28 entry for why nullability/range violations are warnings, not
errors (the official 1.0 sample genuinely contains a few, being real
anonymized provider data, not an idealized fixture). `parseCsv` is a small
hand-rolled RFC4180 parser (quoted fields, `""` escaping, embedded commas).
CLI: `src/crawlers/focus/validate-cli.ts` (`runValidate` exported for
testing; `node dist/crawlers/focus/validate-cli.js <file.csv> --version
1.0|1.2 [--data-dir data/focus]`), exit 1 only on hard errors.
`scripts/fetch-official-sample.mjs` fetches FOCUS-Sample-Data's
`FOCUS-1.0/focus_sample.csv` (raw.githubusercontent.com; api.github.com is
proxy-blocked) once, guarded by an existing `PROVENANCE.json` (url,
fetched_at, sha256, row_count) unless `--force`; committed fixture at
`src/crawlers/focus/fixtures/samples/1.0/` with its own `NOTICE.md`
attribution (root `NOTICE.md` also got a new CC BY 4.0 section for it).
Tests: `validate.test.ts` — official sample passes with 0 errors (8
warnings, all real: 7× ContractedCost null, 1× ContractedUnitPrice
negative), a hand-built spec-conformant baseline round-trips clean, and 8
deliberately corrupted variants (missing Mandatory column, bad Decimal,
invalid enum, bad Date/Time, malformed JSON, bad currency code, plus 2
warning-only cases) each produce column-addressed errors/warnings;
`validate-cli.test.ts` covers the CLI wrapper incl. unknown-version exit 1.
No network in any test — all read the committed fixture. Verified live:
`node dist/crawlers/focus/validate-cli.js .../focus_sample.csv --version
1.0` → "1000 rows, 44 columns, 0 errors, 8 warnings", exit 0. Gates green,
284/284 tests (+16 for this task). Noted, not fixed (out of T-031's scope):
root NOTICE.md still has no attribution section for the FOCUS spec text
itself ingested in T-029 (`data/focus/{1.0,1.2}/columns.json` etc.) — only
this task's sample-data fixture is covered now; a future task should add
that section too.

T-030 this session: `src/servers/focus/` — the version-aware FOCUS stdio
server, mirroring `src/servers/framework/`'s module layout (server/main/
tools/resources/prompts/uris/render/search). Loading: `src/shared/focus/
schemas.ts` defines `FOCUS_ARTIFACT_FILES` (manifest.json/columns.json/
attributes.json schemas); `src/shared/focus/artifact.ts` `loadFocusStore(dir)`
reads `data/focus/index.json`, loads each version dir through
`loadArtifactGeneric` (T-028) into `Map<spec_version, FocusVersionArtifact>`
(+ raw glossary.md/CHANGELOG.md text), cross-checks each version's
manifest.json sha256 against index.json's `manifest_sha256`, and loads/
verifies the derived diff file against index.json's `derived` map — throws
`ArtifactValidationError` on any mismatch (tested: schema violation,
manifest hash mismatch, tampered diff, missing file). Server: 7 tools
(list_versions, get_column, list_columns, search_focus, get_attribute,
get_requirements, compare_versions) — all but list_versions/compare_versions
take `version` (default "1.2", echoed as `spec_version` in structuredContent);
column/attribute lookup accepts Column ID or slug, case-insensitive, with
nearestMatches suggestions on miss. `list_columns`/`search_focus` cursors
bind `version` into `cursorContext`'s fingerprint (shared/tools.ts), so
cross-version cursor reuse hits "Cursor mismatch" (tested). Resources:
`focus://spec/overview`, `/versions`, `/{version}/columns/{slug}` +
`/attributes/{slug}` + `/glossary` (ResourceTemplates, 2-var complete()
using request context for `slug` filtered by `version`), `/changes/1.0-1.2`
(fixed) — unknown version/slug both hit -32002 with nearestMatches (tested).
2 prompts (explain-focus, map-column-across-versions). CC BY 4.0 footer
(`render.ts` `footer()`) on every content-bearing response, mirroring
`shared/footer.ts`'s `ccByFooter`. `main.ts` mirrors the framework server's
main.ts exactly (isDirectRunOf gate, --version flag prints
`focus-spec-mcp vX (FOCUS spec versions: 1.0, 1.2; latest 1.2)`, FOCUS_MCP_DATA
env override). Discovered attribute IDs are renamed across versions
(CurrencyCodeFormat@1.0 → CurrencyFormat@1.2, ColumnNamingAndOrdering@1.0 →
ColumnHandling@1.2) — get_attribute needs the right `version` for a 1.0-only
id, which the outputSchema-conformance and get_attribute tests now cover
explicitly. 42 new tests (server.test.ts incl. outputSchema conformance
over every tool + cross-version cursor rejection; artifact.test.ts;
main.test.ts incl. dist symlink --version), all green. Verified live via
`node dist/servers/focus/main.js --version` and
`node evals/framework/mcp-call.mjs --server=focus list-tools|call ...`
(the eval bridge is already server-agnostic from T-028, no changes needed).
Root package.json bin/files untouched — packaging (`packages/focus-spec-mcp/`)
is a later task per the spec. Gates green, 268/268 tests pass (+42 for focus).

**Rework (same task, next iteration):** the independent verifier failed the
first pass of T-030 — `get_attribute` built its markdown inline instead of
calling `render.ts`'s `attributeMd()`, so it was the one tool missing the CC
BY footer (see `.agents/.cache/verify/T-030-1785225144803.md`). Fixed:
`get_attribute` now calls `attributeMd(...)` like `get_column` calls
`columnMd(...)`; added the missing footer assertion to its test. Reproduced
live via the eval bridge post-fix. Gates green again, 268/268 tests.

## Next steps

1. Continue T-032..T-038 per `.agents/specs/focus-mcp-v1.md` in order
   (seeded synthetic data generator — must pass the T-031 validator;
   KPI mapping / calculate_kpi, packaging shim, worker, critique gate #4,
   evals/focus).
2. Open PR (branch → dev) for the harness fix batch (T-025/T-026) + v1.1
   mini-batch once focus-mcp-v1 work reaches a natural checkpoint.
3. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release).
4. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
5. Owner: install docs/proposed/refresh-data.yml per its checklist.

## Open questions

- Root `NOTICE.md` has no attribution section for the FOCUS spec text
  itself (data/focus/{1.0,1.2}/, ingested T-029) — only the T-031 sample
  fixture is covered. Should be added (mirrors the FinOps Framework
  section) but is out of scope for the tasks that found the gap.
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind FINOPS_MCP_EXPERIMENTAL.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); refresh-
  workflow GITHUB_TOKEN/CI caveats mirror the template's item 3; NEW —
  supervising sessions must not commit a live loop's in-flight tasks.json
  (stop-hook lesson, journal 20260723-harness-improvements-session.md).

## Last updated

2026-07-28 — T-031 done (FOCUS CSV conformance validator + official 1.0
ground-truth fixture); focus-mcp-v1 loop underway.
