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

Critique gate 3 (publish gate) passed: SHIP-after-fixes verdict executed —
BLOCKER (npm bin guard broke every install path), 3 MAJORs (cursor
context binding, full summaries, map_personas attribution), and the
get_kpis schema fix all landed as T-020..T-024 with regression tests;
eval Run 4: 10/10. Gate report: docs/critique-3-publish-gate.md. MINOR
queue (9 items) lives in that report — not publish-gating. The branch
(restarted from main after PR #6/#5 merged) holds only the gate doc +
T-020..T-024 fixes, awaiting a PR to dev. Earlier deliveries (harness
batch T-010..T-016, v1.1 mini-batch T-018/T-019) are merged to main; the
port-back tracker `.agents/specs/loop-harness-improvements.md` still
drives the template port.

## Next steps

1. Open PR (branch → dev) for the harness batch + v1.1 mini-batch; owner
   review/squash-merge; rolling PR #5 (dev → main) then refreshes.
2. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release).
3. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
4. Remaining v1.1 candidates: Cloudflare Workers remote endpoint; Action
   rename decision (moot while hidden).
5. Owner: install docs/proposed/refresh-data.yml per its checklist.

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

2026-07-24 — critique-3 publish gate: fixes T-020..T-024 landed, Run 4 10/10, PR to dev.
