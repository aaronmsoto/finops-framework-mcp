# 2026-07-21 — Agent-driven template instantiation

## Add a dual-repo instantiation runbook — 2026-07-21

- did: added `.agentic/INSTANTIATE.md`, an agent-facing runbook for a session
  holding both this template and an empty target repo: verify preconditions,
  copy tracked files via `git archive HEAD | tar -x` (never `cp -r`), commit
  the import, bootstrap, `agentic init`, gates/validate/approvals-check,
  genesis push, owner handoff checklist. Added `instantiate-project` skill
  framing the runbook; pointers from README quickstart, getting-started, and
  AGENTS.md "Where things live". Fixed stale post-reorg references (README
  repository map still listed root `harness/`/`presets/`; getting-started
  said `cd harness`). Decision recorded in decisions.md (why a doc, not a
  skill-only or harness command).
- result: end-to-end simulation of the runbook (empty git repo as target):
  archive-copy → import commit → bootstrap → init --name sim-project
  --preset typescript --owner @sim → preset setup steps → gates EXIT 0,
  tasks validate OK, approvals check OK, integrity skip notice as documented.
  Template's own gates green before commit.
- next: owner merges via the rolling Release PR; first real derivative can
  now be created by an agent session with both repos connected.
