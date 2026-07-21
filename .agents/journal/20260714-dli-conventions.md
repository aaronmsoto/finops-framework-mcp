## dli-skills conventions adoption — 2026-07-14

- did: evaluated three owner proposals from the dli-skills project. (1) Skills
  move to .agents/skills/ — DECLINED on verified facts: Claude Code reads
  project skills only from .claude/skills/ (official docs; .agents/skills is
  Copilot-only — watch anthropics/claude-code#31005). (2) Integration
  branching — ADOPTED as configurable approvals.yaml `branching:` (trunk
  default; integration = task branches auto-merge to dev on green gates-fast
  via generated integration-branch ruleset, humans merge the rolling
  "Release: dev → main" PR maintained by release-pr.yml; derived gh-pr-merge
  ask dropped in integration mode since main stays server-side gated; also
  deduped the verbatim gh-pr-merge ask from default approvals.yaml). (3)
  Journal directory — ADOPTED: .agents/journal/YYYYMMDD-<slug>.md, one file
  per session/loop run, never edit another session's file; old journal.md
  migrated into 7 dated files; harness journal API, loop, banner, init
  templates reworked.
- result: 146/146 harness tests; all gates green; integration mode smoke:
  compile emits the fifth surface with correct target/rules, drops the merge
  ask, drift check works both directions, trunk compile removes stale ruleset.
- next: owner review + merge; flip this repo to integration mode if desired
  (one line + compile + create dev + enable auto-merge).
