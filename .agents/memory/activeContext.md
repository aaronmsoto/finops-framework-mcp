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

Nothing. Two deliveries complete on branch `claude/session-k75rxy`
(restarted from dev after PR #4's squash-merge), awaiting a PR to dev:

1. **Loop-harness improvements (T-010..T-016)** — retro items 9-14+16b
   implemented in `.agentic/harness/`: preflight surfaces runner
   stderr (+IS_SANDBOX hint), token accounting + optional
   `loop.max_total_tokens`, verifier-evidence persistence, per-iteration
   timeout `loop.max_iteration_minutes` (+flag), `--max-consecutive-failures`
   + pending-based iteration default, heartbeat `loop-state.json` +
   live `agentic status`, terminal journal auto-commit. Harness suite
   211→245; all proven by mock scenarios A-D plus a real run. Contract,
   evidence, and port-back verdicts (all **port**):
   `.agents/specs/loop-harness-improvements.md`.
2. **v1.1 mini-batch (T-018, T-019)** — built BY the improved loop as its
   validation run (success, 2/2 first-try verified, 1101s, 10.18M tokens
   journaled): cheerio lazy-loaded and moved to devDependencies (derive/
   server unaffected, missing-cheerio path tested); `--version` flag on the
   bin. Details: this file's history at `2b2199b^` and the two task
   journals.

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

2026-07-23 — harness improvement batch validated (mock A-D + real run E); handoff to PR.
