# 2026-07-21 — github-setup script + adversarial hardening sweep

## Build github-setup.sh and act on a three-agent audit — 2026-07-21

- did: scripts/github-setup.sh (gh api: merge/squash settings, Actions PR
  permission, ruleset import, dev-branch creation, admin/default-branch/
  solo-owner/private-plan/CODEOWNERS checks); wired into README,
  getting-started, INSTANTIATE, init next-steps. Spawned three adversarial
  critics (derivative residue / out-of-repo assumptions / docs-code sync);
  fixed: init resets roadmap + AGENTS.md identity section + package.json
  description/test script, removes instantiate-project skill, seeds T-004
  license task; approvals.yaml protects tests/**; ci.yml pull_request
  types include edited; release-pr concurrency; bootstrap git-identity
  warning; SessionStart/loop-gate subdir-safe; claude-review reworded +
  repathed; prepare-commit-msg/setup-beads stale refs; ~15 doc-sync
  corrections (architecture layout/modules/CI/init/runner rows, broken
  ../AGENTS.md links, designs gate in canonical lists, integrity gate
  hard-fail list, memory-lint claim).
- result: 6 new init tests (39 init total), full suite green, gates green,
  approvals recompiled without drift. Deferred to open questions: default
  branch configurability, integrity base derivation, merge-queue policy
  flag, runner preflight probe.
- next: ship via dev PR; owner merges rolling Release PR.
