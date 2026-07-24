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

Critique-3 fixes are MERGED to main (PRs #7/#8); publish is go. This
branch (restarted from post-release main) adds the last review-driven
harness fixes T-025 (build/verify token split + usage canary) and T-026
(branch assert + atomic tasks.json), awaiting PR to dev. Owner decision
2026-07-24: harness moves to npm as @aaronsoto/agentic-harness — the
template packages it; this repo swaps its vendored copy for the package
after the owner publishes (tracker has the note).

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

2026-07-24 — T-025/T-026 harness fixes; npm distribution decision recorded; port to template next.
