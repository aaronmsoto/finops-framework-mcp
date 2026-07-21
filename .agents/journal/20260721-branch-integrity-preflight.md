# 2026-07-21 — Configurable default branch, derived integrity base, loop preflight

## Ship three audit-deferred hardening items — 2026-07-21

- did: (1) added branching.default_branch (default main); compileRuleset ref +
  derived push-ask rules follow it; removed the verbatim push rules from
  approvals.yaml (now derived); github-setup.sh compares against the policy
  value. (2) resolveDefaultBase() in integrity.ts derives the base from
  branching policy (integration_branch / default_branch / origin-HEAD /
  origin-main); cmdIntegrity loads approvals and passes it; agentic status
  shows the base + resolves flag. (3) runPreflight() in loop.ts probes the
  runner (sentinel write) before the first iteration; throws symptom-specific
  CliError on failure; --skip-preflight flag; honest mock script + all live
  loop test scripts gained a preflight phase branch, failure-mode tests use
  skipPreflight. Docs: architecture (branching/loop/integrity/layout),
  approvals.md, operations.md, getting-started implicit via approvals link.
- result: 206/206 harness tests (config/approvals/integrity/loop/cli updated +
  new default_branch, resolveDefaultBase, and preflight cases); lint clean;
  approvals compile/check no drift; scratch check: default_branch=master →
  ruleset ref refs/heads/master and push rules target master.
- next: ship via dev PR; rolling Release PR carries it to main. Merge-queue
  flag remains deferred (activeContext open questions).
