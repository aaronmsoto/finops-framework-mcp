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

Agent-driven instantiation complete (2026-07-21): `.agentic/INSTANTIATE.md`
runbook + `instantiate-project` skill, proven by end-to-end simulation.
Same day: derivatives now own the root LICENSE (`init --license
mit|apache-2.0|proprietary|keep` + `--license-holder`; template notice
persists at `.agentic/LICENSE`; texts in `.agentic/licenses/`) and `init`
gained a TTY-only wizard for missing flags (headless stays strict). Repo
ready for project #1 once owner ticks "Template repository". Seeded tasks
T-001..T-003 are onboarding tasks for the first real derivative — not
template-construction work.

## Next steps

1. Owner one-time GitHub wiring: import `.github/rulesets/main-branch.json`,
   enable "Template repository"; merge the rolling Release PR.
2. First real project: GitHub "Use this template" (human path) OR dual-repo
   agent session following `.agentic/INSTANTIATE.md` (agent path) → work
   T-001..T-003, incl. first LIVE-runner loop (`--runner claude`, small
   caps) — the only part never exercised outside mock.
3. Empirically smoke-test whether Copilot CLI ingests CLAUDE.md alongside a
   root AGENTS.md (see open question below).

## Open questions

- Audit-deferred, STILL OPEN (2026-07-21, see decisions.md): merge-queue
  gates-full as a policy flag — deferred until a real Team-plan queue exists
  (requiring gates-full without an active queue deadlocks PRs). The other
  three (default_branch as policy, policy-derived integrity base, loop
  preflight probe) shipped 2026-07-21. ci.yml/release-pr.yml still embed
  literal branch names — a non-main default branch needs those hand-edited
  (documented; workflows are owner-owned).
- Should `coverage` be in the default TS preset fast tier, or stay optional?
  (Currently optional; revisit after first real project.)
- Does Copilot CLI read CLAUDE.md when both files exist? Unverified — nothing
  Copilot-relevant may live only in CLAUDE.md until a smoke test says otherwise.
- RuVector/AgentDB watch item: revisit maturity in early 2027 (decisions.md).
- Skills location: move to .agents/skills/ when Claude Code supports it
  (anthropics/claude-code#31005) — owner preference, blocked on tool support.


## Last updated

2026-07-21 — branch/integrity/preflight hardening session.
