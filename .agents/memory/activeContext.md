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
T-027..T-038) is underway. T-027 (lift shared crawler/server infra) and
T-028 (generic artifact-load seam + multi-server eval bridge) are DONE.
T-028 this session: `src/shared/artifact-loader.ts` now holds the generic
seam — `ArtifactValidationError` (remediation text is now a constructor
arg, not hardcoded), `loadArtifactGeneric(dir, {files, assemble,
crossValidate, remediation})` (schema validation via ajv, manifest sha256
integrity check, optional referential crossValidate hook), with its own
synthetic-spec test (`artifact-loader.test.ts`, a fake widgets/groups
artifact unrelated to the framework domain). `src/shared/artifact.ts`
`loadArtifact(dir)` is now a thin wrapper calling `loadArtifactGeneric`
with the framework's `ARTIFACT_FILES`/assemble/crossValidate and the
original remediation string verbatim — signature and every error message
unchanged (`main.ts`, `emit.ts` — which imports `sha256` from
`artifact.js` — and `artifact.test.ts` all untouched, confirmed via `git
diff --stat`). `evals/framework/mcp-call.mjs` now selects the server dist
path via `--server=<name>` flag or `MCP_EVAL_SERVER` env var
(`dist/servers/<name>/main.js`), defaulting to `framework`; confirmed
`list-tools` output byte-identical before/after (diffed old vs new via
`git stash`). Gates green, 203/203 tests pass (was 197; +6 new). Behavior
checked: rebuilt `dist/`, ran `node dist/servers/framework/main.js
--version` (prints `v1.0.0 (data v2.1.1)`), ran `mcp-call.mjs list-tools`
with no flag (unchanged) and with `--server=doesnotexist` / env var
(correctly attempts `dist/servers/doesnotexist/main.js` and fails with
`Connection closed`, proving the selection logic works). Separately,
critique-3 fixes are merged to main (PRs #7/#8); the harness fix batch
(T-025/T-026) still awaits its PR to dev — see prior entries for that
thread.

## Next steps

1. T-029 next in the focus-mcp-v1 loop per `.agents/specs/focus-mcp-v1.md`
   — builds on `loadArtifactGeneric` (T-028) and the shared/markdown +
   shared/http modules (T-027) for the FOCUS ingestion pipeline.
2. Continue T-030..T-038 per `.agents/specs/focus-mcp-v1.md` in order.
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

2026-07-28 — T-028 done (generic artifact-load seam + multi-server eval bridge); focus-mcp-v1 loop underway.
