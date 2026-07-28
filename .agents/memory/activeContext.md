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
T-027..T-038) is underway. T-027..T-032 are DONE.

T-032 this session: seeded synthetic FOCUS CSV generator.
`src/shared/focus/synthetic.ts` — `generateFocusCsv(columns, {rows, seed})`
derives every value purely from a version's `columns.json` metadata
(`data_type`, `allowed_values`, `value_format_md`, `number_range`,
`allows_nulls`) via a `mulberry32` seeded PRNG, same "no hardcoded
per-version table" principle as the T-031 validator — same seed always
byte-identical. One metadata combination (JSON `data_type` + `allowed_values`
naming embedded keys, e.g. 1.2's `SkuPriceDetails`) can't satisfy the
validator's independent type-and-enum checks with any single value, so the
generator always emits `NULL` for it (nullable in both pinned versions
today) rather than hardcoding the column by name — see decisions.md
2026-07-28 entry. CLI: `src/crawlers/focus/generate-cli.ts` (`runGenerate`,
mirrors `validate-cli.ts`'s shape: `node dist/crawlers/focus/generate-cli.js
--version 1.2 --rows N --seed S --out file.csv`). `scripts/
generate-focus-synthetic-samples.mjs` (no network, imports built dist/)
regenerates the committed fixtures at `src/crawlers/focus/fixtures/samples/
synthetic/{1.0,1.2}/focus_synthetic_sample.csv` (seed 42, 60 rows each;
43/57 columns; ~52KB/~68KB, 140KB total on disk, well under the 200KB cap),
each with its own `NOTICE.md` explicitly labeling the file synthetic
(not official FOCUS data) and naming the generator/seed. Tests:
`synthetic.test.ts` (determinism — same seed byte-identical, different seed
differs; header exactly matches `columns.map(c => c.id)` for both versions;
generated output passes its own version's validator with 0 errors AND 0
warnings; the committed fixtures themselves re-validated as a regression
guard) and `generate-cli.test.ts` (CLI wrapper incl. cross-run determinism,
unknown-version exit 1). Verified live: `node dist/crawlers/focus/
validate-cli.js .../synthetic/1.2/focus_synthetic_sample.csv --version 1.2`
→ "60 rows, 57 columns, 0 errors, 0 warnings", exit 0 (same for 1.0). Gates
green, 297/297 tests (+13 for this task).

Earlier (T-027..T-031, condensed): T-029 ingested FOCUS spec text for
versions 1.0/1.2 into `data/focus/`; T-030 built `src/servers/focus/` (the
version-aware FOCUS stdio server, 7 tools, mirrors `src/servers/framework/`'s
module layout — reworked once post-verification to fix a missing CC BY
footer on `get_attribute`); T-031 built `src/shared/focus/validate.ts`
(`validateFocusCsv`, errors-vs-warnings split, official 1.0 sample fixture
at `src/crawlers/focus/fixtures/samples/1.0/`). Full detail in git history
and `.agents/journal/`.

## Next steps

1. Continue T-033..T-038 per `.agents/specs/focus-mcp-v1.md` in order (KPI
   mapping / calculate_kpi, packaging shim, worker, critique gate #4,
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

2026-07-28 — T-032 done (seeded synthetic FOCUS data generator + committed
1.0/1.2 synthetic sample fixtures); focus-mcp-v1 loop underway.
