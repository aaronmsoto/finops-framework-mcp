# 2026-08-06 — T-075: surfaces recompiled with npm harness 0.2.0, drift reviewed

**Task:** T-075 (spec `.agents/specs/harness-npm-consumption.md`),
previously BLOCKED (journal 20260806-t075-blocked-upstream-drift.md):
0.1.0 lacked `solo_maintainer` and `ai_attribution`. Both were ported to
the template (its T-012/T-013), released as
`@aaronmsoto/agentic-harness@0.2.0`, and `.agentic/package.json` here
bumped to `^0.2.0` (lockfile reinstalled; `node -e` confirms 0.2.0).

**Baseline:** pre-upgrade `./scripts/agentic gates --tier all` PASS
(format/lint/typecheck/test/designs/integrity/memory/build, e2e skip).

**`agentic upgrade` (0.2.0): 7 changed, 1 unchanged. Per-file review:**

- `.claude/settings.json` — **UNCHANGED.** The decisive check: 0.2.0's
  solo_maintainer logic reproduces the vendored fork's compile exactly
  (gh-pr-merge ask rule present), where 0.1.0 had wrongly dropped it.
- `.github/rulesets/main-branch.json` — `_generated` v0.2.0 marker added;
  ALL parameters unchanged: review count stays 0 / code-owner review
  false (the solo fix, preserved — 0.1.0 had regressed this to 1/true).
- `.github/rulesets/integration-branch.json` — `_generated` marker only.
- `.github/CODEOWNERS` — versioned marker line only; entries identical.
- `scripts/copilot.sh` — comment-only rewrite (fallback-vs-primary
  framing from the template's Copilot hooks work); the `--deny-tool`
  flag set is byte-identical (non-comment diff is empty).
- `scripts/hooks/copilot-policy.mjs` + `.github/hooks/
  copilot-cli-policy.json` — NEW: the native Copilot hooks policy
  surface this repo's older vendored fork never emitted; policy content
  derives from the same approvals.yaml deny/ask/protected_paths.
- `approvals.lock.json` — NEW sidecar recording harness_version 0.2.0.

**Post-upgrade verification:** `approvals check` — no drift; second
`upgrade` — "all surfaces already current" (idempotent); `gates --tier
all` — PASS with NO version-skew warning (grep for the WARN line:
absent). `approvals.yaml` and `agentic.config.json` untouched by this
task (not in git status).

**Next:** T-076 — delete the vendored harness, npm-only parity proof.
