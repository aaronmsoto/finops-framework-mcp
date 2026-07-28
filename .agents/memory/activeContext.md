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
T-027..T-038) is underway. T-027..T-035 are DONE.

T-035 this session: eval design, no source changes. `evals/focus/eval.xml`
— 10 version-aware, tools-only questions against the live focus server (2
require `compare_versions`, 2 require `get_kpi_mapping`, per the acceptance
minimum); every answer solved live first via `evals/framework/mcp-call.mjs
--server=focus` and copy-verified from the raw JSON (values in the journal).
`evals/focus/combined-scenario.xml` — the spec's Rate Optimization
walkthrough (capability → KPIs → FOCUS columns per version → calculate on
sample) as one ordered scenario spanning BOTH bridges (`--server=framework`
+ `--server=focus`): framework's 4 featured KPIs on rate-optimization come
back as the exact same 4 slugs from focus's `get_kpi_mapping(capability:
"rate-optimization")` — the cross-server bridge the spec's Problem section
says exists nowhere else. Includes one step marked
`mode="author-annotation"` (explicitly NOT part of the tools-only graded
walkthrough) explaining a real finding: the official 1.0 sample has zero
`ChargeCategory = "Purchase"` rows, so `commitment-utilization-score`/
`percentage-of-commitment-based-discount-waste` compute to a correct-but-
extreme 0%/100% pair — same class as T-034's noted AAI observation, not a
bug, verified by reading the committed CSV directly (out of bridge scope,
hence the annotation). Gates green (336/336, no source changed). Full
detail: `.agents/journal/20260728-t035-focus-eval-suite.md`.

Earlier (T-027..T-034, condensed): T-029 ingested FOCUS spec text for
versions 1.0/1.2 into `data/focus/`; T-030 built `src/servers/focus/` (the
version-aware FOCUS stdio server, mirrors `src/servers/framework/`'s module
layout); T-031 built `src/shared/focus/validate.ts` + official 1.0 sample
fixture; T-032 built the seeded synthetic FOCUS CSV generator; T-033 added
the unofficial KPI-to-FOCUS-column mapping (`get_kpi_mapping`); T-034 added
`calculate_kpi` over bundled sample data (formula registry for 9 of ~18
mapped KPIs). Full detail in git history and `.agents/journal/`.

## Next steps

1. T-036: package `focus-spec-mcp` as its own npm publish shim
   (`packages/focus-spec-mcp/`, narrowed root `files`, packaging test both
   directions).
2. T-037: Cloudflare Worker serving both MCP servers over HTTPS
   (`src/workers/app.ts`, build-time bundled data, Origin allowlist).
3. T-038: static demo web app for the combined walkthrough — can reuse
   `evals/focus/combined-scenario.xml`'s step sequence directly.
4. Then critique gate #4 (`docs/critique-4-focus-gate.md`) per the spec's v1
   acceptance gate, and packaging/tarball/worker acceptance checks.
5. Open PR (branch → dev) for the harness fix batch (T-025/T-026) + v1.1
   mini-batch once focus-mcp-v1 work reaches a natural checkpoint.
6. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release).
7. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
8. Owner: install docs/proposed/refresh-data.yml per its checklist.

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

2026-07-28 — T-035 done (focus eval suite + combined two-server scenario);
focus-mcp-v1 loop underway.
