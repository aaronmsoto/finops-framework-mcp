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
T-027..T-038) is underway. T-027, T-028, and now T-029 (ingest FOCUS
1.0/1.2) are DONE.

T-029 this session: `src/crawlers/focus/` ingests the FOCUS spec from git
tags `v1.0`/`v1.2` via raw.githubusercontent.com. `urls.ts` pins
REPO/ORIGIN/VERSIONS (expected column counts 43/57) and
`isValidFocusBody` (markdown/JSON has no `<h1>`, so the framework
crawler's HTML-page body check doesn't apply — added an `isValidBody`
override hook to `CachedFetcher` in `src/shared/http.ts`, additive/
backward-compatible, default unchanged). `ingest.ts` enumerates columns
from `columns.mdpp`'s `!INCLUDE` list, asserts the pinned count, cross-
checks the jsDelivr flat tree (`data.jsdelivr.com/v1/packages/gh/...`)
for both columns and attributes, then fetches every column/attribute/
glossary/CHANGELOG file. `parse/columns.ts` + `parse/attributes.ts`
extract structured fields (id/display_name/column_type/feature_level/
allows_nulls/data_type/value_format/number_range/allowed_values/
requirements[]/introduced_version) from the H1+prose+`##`-section
format; `parse/table.ts` has the pipe-table parser and the
requirements extractor (prefers top-level MUST/SHOULD bullets, falls
back to prose-sentence splitting — both forms occur verbatim across the
two tags). A parse failure degrades a record to `parse_quality:
"markdown_only"`, never throws. `emit.ts` writes each version dir
idempotently (skips the write entirely — including `crawled_at` — when
every file's sha256 already matches disk, so a cache-warm refresh is a
true no-op) plus `diff.ts` (1.0→1.2 diff by ColumnId, source-cited) and
`index.json`. Types live in `src/shared/focus/types.ts` (re-exported
from `shared/index.ts`) since T-030's server will load them too.
Fixtures: 5 raw column files per version + 2 attribute files, committed
verbatim (added `src/crawlers/focus/fixtures/` to `.prettierignore` —
prettier reflows tables and `*em*`→`_em_`, which would corrupt them as
parser-test fixtures). 27 new tests (parse/columns/attributes/table/
diff/emit), all green, no live network. Real crawl run and committed:
`node dist/crawlers/focus/cli.js` → 43 columns (v1.0) + 57 columns
(v1.2), 100% `parsed` (0 markdown_only), diff 1.0→1.2 = 14 added / 0
removed / 43 changed (matches spec's pinned "14 added columns" exactly).
Verified byte-identical refresh by re-running from the warm cache
(`.cache/crawl-focus/`, gitignored): `diff -rq` against a pre-refresh
copy of `data/focus/` → identical, 0 network / 128 cached. `du -sh
data/focus` = 852K (budget 3MB). Gates green, 226/226 tests pass (+23
new for focus).

Prior T-028 note (generic artifact-load seam + multi-server eval
bridge): `src/shared/artifact-loader.ts` holds `loadArtifactGeneric`;
`src/shared/artifact.ts` `loadArtifact(dir)` wraps it for the framework
artifact unchanged. `evals/framework/mcp-call.mjs` selects the server
dist path via `--server=<name>` / `MCP_EVAL_SERVER`. Separately,
critique-3 fixes are merged to main (PRs #7/#8); the harness fix batch
(T-025/T-026) still awaits its PR to dev — see prior entries for that
thread.

## Next steps

1. T-030 next in the focus-mcp-v1 loop per `.agents/specs/focus-mcp-v1.md`
   — build the version-aware focus stdio server on top of `data/focus/`
   (T-029): load each version dir through `loadArtifactGeneric` (T-028)
   into `Map<spec_version, FocusArtifact>`, define the FOCUS
   `ARTIFACT_FILES` schemas (columns.json/attributes.json/manifest.json),
   `index.json` is discovery + integrity root.
2. Continue T-031..T-038 per `.agents/specs/focus-mcp-v1.md` in order.
3. Open PR (branch → dev) for the harness fix batch (T-025/T-026) + v1.1
   mini-batch once focus-mcp-v1 work reaches a natural checkpoint.
4. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release).
5. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
6. Owner: install docs/proposed/refresh-data.yml per its checklist.

## Open questions

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

2026-07-28 — T-029 done (FOCUS 1.0/1.2 ingestion into data/focus); focus-mcp-v1 loop underway.
