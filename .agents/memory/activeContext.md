# activeContext.md — session handoff

<!-- The handoff file: what's in flight, next steps, open questions.
     Update before ending any session (handoff skill). memory lint warns
     when this file goes stale while commits continue. -->

## In flight

- Init landed on main via PR #1 (merge 8413d42). T-002 verified and completed:
  full fast-tier gates green including integrity vs origin/main — the genesis
  integrity condition cleared with the merge (see journal 20260721-t002-*).

## Next steps

- Owner: T-001 (real "What this project is" in AGENTS.md/MEMORY.md — needs the
  owner's project description), T-004 (confirm root LICENSE: MIT, Aaron Soto —
  likely already correct since owner authored the template), and GitHub repo
  settings (`./scripts/github-setup.sh` or manual ruleset import, auto-merge,
  Actions-can-approve, squash message = PR title/description).
- Then: first spec in .agents/specs/ and plan-feature (T-003).

## Open questions

- (none)
