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
T-027..T-038) is underway. T-027..T-034 are DONE.

T-034 this session: `calculate_kpi` over bundled sample data. New
`data/focus/samples/` artifact section (manifest + one CSV per
version/kind: official 1.0 FOCUS-Sample-Data 1000 rows, seeded synthetic
1.0/1.2 60 rows each), hash-verified via a new `index.json.samples` map the
same way `derived/` already is; `FocusStore.sampleManifest` +
`sampleCsv: Map<"version:kind", text>`. Bundled by a new standalone
`scripts/bundle-focus-samples.mjs` (not folded into `cli.ts`'s `ingest()` —
that runs from `dist/` with no path back to the source fixtures once
packaged); `ingest()` now carries forward any existing `index.json.samples`
so a routine refresh doesn't wipe it (verified live, byte-identical).
`src/shared/focus/kpi-calc.ts`: explicit formula registry for 9 of the
mapping's ~18 KPIs (ESR + 8 more with no external input and no ambiguous
unit-string matching) over `{header, rows}` (reuses `parseCsv`). New
`calculate_kpi(kpi, version?, sample?)` tool — no dataset-input param
exists, so user data structurally cannot enter; `UNOFFICIAL CALCULATION:`
banner + full sample provenance in every response; no-formula KPIs get a
clean error naming the caveat + calculable-KPI list. `data/focus` grew
868K -> 1.8M (cap 3MB). Gates green, 336/336 tests (+21). Verified live
over the real stdio server: ESR/1.0 = 26.552972346576816% (official
sample), ESR/1.2 = 17.858936132116433% (falls back to synthetic — no
official 1.2 sample exists), no-formula and unknown-kpi errors both clean.
Full detail in `.agents/journal/20260728-t034-calculate-kpi.md` and
decisions.md (includes a noted-not-fixed observation: AAI computes >100%
over the official sample due to real negative-cost credit/refund rows —
correct per the formula, not a bug).

T-033 (condensed): unofficial KPI-to-FOCUS-column mapping —
`data/focus/derived/kpi-mapping.json` (18 records, every `official: false`,
each with `focus_formula`/`columns_by_version`/`related_capability_slugs`/
`caveat`), authored as a static TS literal (no source page to parse from;
no official mapping exists) and served by `get_kpi_mapping`
(`kpi?`/`capability?`/`version?`, UNOFFICIAL banner, `finops://framework/
kpis/{slug}` cross-reference via a duplicated, not imported, URI helper —
keeps focus/framework packages uncoupled). Full detail:
`.agents/journal/20260728-t033-focus-kpi-mapping.md`.

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

1. Continue T-035..T-038 per `.agents/specs/focus-mcp-v1.md` in order
   (evals/focus + combined two-server scenario, packaging shim, worker,
   critique gate #4).
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

2026-07-28 — T-034 done (calculate_kpi over bundled sample data);
focus-mcp-v1 loop underway.
