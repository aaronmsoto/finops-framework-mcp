# activeContext.md — session handoff

<!-- The handoff file: what's in flight, next steps, open questions.
     Update before ending any session (handoff skill). memory lint warns
     when this file goes stale while commits continue. -->

## In flight

- Template bootstrap + init done (branch claude/finops-framework-mcp-setup-gsvpyt);
  awaiting owner review/merge to main. Integrity gate is red vs origin/main only
  because init --fresh reset the template's journal/decisions history that the
  initial "Use this template" commit still contains — one-time genesis condition,
  clean after this lands on main (see journal 20260721-instantiate-*).

## Next steps

- Owner: T-001 (real "What this project is" in AGENTS.md/MEMORY.md), T-004
  (root LICENSE choice), import .github/rulesets/ + repo settings
  (`./scripts/github-setup.sh` or manual), then land init on main.
- Then: first spec in .agents/specs/ and plan-feature (T-003).

## Open questions

- (none)
