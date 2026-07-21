# 20260721 — instantiate finops-framework-mcp from template

## Bootstrap + init from agentic-starter-repo template — 2026-07-21T09:35:00Z

- Did: repo was a pristine "Use this template" copy (single Initial commit,
  placeholders intact). Ran `./scripts/bootstrap.sh` (harness built, git hooks
  wired, commit identity set to owner), then
  `./scripts/agentic init --name finops-framework-mcp --preset typescript
  --owner @aaronmsoto --fresh`, then the preset dev-dependency install.
- Result: gates format/lint/typecheck/test/designs/memory PASS;
  `tasks validate` chain valid (genesis); `approvals check` no drift;
  onboarding tasks T-001..T-004 seeded.
- Known finding: the integrity gate FAILS vs origin/main because init's
  `--fresh` reset deleted the template's journal files and decisions.md
  content, which the initial commit (and therefore origin/main) still
  contains. INSTANTIATE.md assumes an empty target with no origin/main, where
  the gate skips. This is a one-time genesis condition, not gaming: once this
  init work lands on main, the gate is clean for all future branches.
- Next: owner works T-001 (AGENTS.md/MEMORY.md project description), T-004
  (root LICENSE still carries template author's copyright), applies GitHub
  settings via `./scripts/github-setup.sh` or the manual ruleset import, and
  lands this init change on main.
