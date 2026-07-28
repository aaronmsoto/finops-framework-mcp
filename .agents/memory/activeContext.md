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
T-027..T-038) is underway. T-027 (lift shared crawler/server infra into
src/shared) is DONE this session: frontmatter, compose infra
(guard/heading/bullet/assemble), derive splitters, md (origin-parameterized
htmlToMd), sanitize, http (origin/UA-parameterized CachedFetcher), search
core, tool helpers (cursor/paginate/ok/err/RO), footer (parameterized
attribution), and detectDirectRun all now live under `src/shared/`;
framework code re-imports them. Gates green, 197/197 tests pass, `cli.js
derive` reproduces the committed artifact byte-identically, `npm pack
--dry-run` diffs clean (dist internals only). Separately, critique-3 fixes
are merged to main (PRs #7/#8); the harness fix batch (T-025/T-026) still
awaits its PR to dev — see prior entries for that thread.

## Next steps

1. T-028 next in the focus-mcp-v1 loop: generic artifact-load seam,
   building on the shared/markdown + shared/http modules T-027 just lifted.
2. Continue T-029..T-038 per `.agents/specs/focus-mcp-v1.md` in order.
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

2026-07-28 — T-027 done (shared crawler/server infra lifted to src/shared); focus-mcp-v1 loop underway.
