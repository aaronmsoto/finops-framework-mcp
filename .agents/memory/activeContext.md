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
T-027..T-038) is underway. T-027..T-033 are DONE.

T-033 this session: unofficial KPI-to-FOCUS-column mapping.
`data/focus/derived/kpi-mapping.json` (18 records: ESR, 4 commitment-
discount KPIs, 2 forecast-accuracy KPIs, 6 unit-economics KPIs, 4
allocation/tagging KPIs, 1 variance KPI) — every record `official: false`,
each with a `focus_formula` (FOCUS ColumnIds + SQL-like WHERE/GROUP BY
pseudocode), `columns_by_version` (both 1.0 and 1.2 today — all chosen
columns are present under the same id in both), `related_capability_slugs`
(copied from the framework KPI, for the tool's `capability` filter), and a
`caveat` where FOCUS alone can't fully compute it (forecast/budget KPIs —
FOCUS only supplies the actual/effective-spend side). Authored as a static
TS literal (`src/crawlers/focus/kpi-mapping-data.ts`, no source page to
parse from) and emitted by `cli.ts`'s `ingest()` via a new
`emitDerivedKpiMapping`, hashed into `index.json`'s `derived` map next to
the diff. `loadFocusStore` (`src/shared/focus/artifact.ts`) now reads every
`derived/` entry generically (was hardcoded to the single diff file),
verifies each sha256, and cross-validates every `columns_by_version` column
id against its version's loaded columns at load time (throws
`ArtifactValidationError` on an unknown column/version). `get_kpi_mapping`
tool (`src/servers/focus/tools.ts`): `kpi?`/`capability?`/`version?`
params, UNOFFICIAL banner in text content, `kpi_uri` =
`finops://framework/kpis/{slug}` per record (built via a new
`FRAMEWORK_KPI_URI` helper in `src/servers/focus/uris.ts` — duplicates,
does not import, the framework server's `URI.kpi`, to keep the two
packages' compiled code uncoupled ahead of packaging (T-035); see
decisions.md). Tests: `src/shared/focus/kpi-mapping.test.ts` (record count
15-20, every kpi_slug found in `data/framework/content/kpis.json`,
kpi_title matches, every related_capability_slugs found in
`data/framework/content/capabilities.json`, every columns_by_version column
id found in its version's `columns.json`); `artifact.test.ts` additions
(loads kpiMapping, refuses a tampered kpi-mapping.json, refuses an unknown-
column entry); `server.test.ts` additions (banner, URI cross-references,
kpi/capability/version filters, unknown-kpi nearest-match error, empty-
capability non-error, outputSchema conformance). Verified live: built +
ran `node dist/crawlers/focus/cli.js` (0 network fetches, cache-only,
byte-identical) then called `get_kpi_mapping` via an in-memory MCP client
— confirmed the UNOFFICIAL banner, 18 total records, and the ESR record's
formula/columns/finops:// URI. Gates green, 315/315 tests (+18). Artifact
still 868K on disk (cap 3MB).

Earlier (T-027..T-032, condensed): T-029 ingested FOCUS spec text for
versions 1.0/1.2 into `data/focus/`; T-030 built `src/servers/focus/` (the
version-aware FOCUS stdio server, 7 tools, mirrors `src/servers/framework/`'s
module layout — reworked once post-verification to fix a missing CC BY
footer on `get_attribute`); T-031 built `src/shared/focus/validate.ts`
(`validateFocusCsv`, errors-vs-warnings split, official 1.0 sample fixture
at `src/crawlers/focus/fixtures/samples/1.0/`); T-032 built the seeded
synthetic FOCUS CSV generator (`src/shared/focus/synthetic.ts`) plus
committed 1.0/1.2 synthetic sample fixtures. Full detail in git history
and `.agents/journal/`.

## Next steps

1. Continue T-034..T-038 per `.agents/specs/focus-mcp-v1.md` in order
   (calculate_kpi — ESR must match a hand-computed fixture exactly —
   packaging shim, worker, critique gate #4, evals/focus).
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
- `validateFocusCsv` (T-031) can't validate a JSON-typed column that also
  declares `allowed_values` as embedded-key names rather than literal
  values (today: 1.2's `SkuPriceDetails`, per KeyValueFormat) — the
  generator works around it by always emitting null (decisions.md
  2026-07-28); a future task could teach the validator to parse
  KeyValueFormat keys against the enum instead.
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

2026-07-28 — T-033 done (unofficial KPI-to-FOCUS-column mapping +
get_kpi_mapping tool); focus-mcp-v1 loop underway.
