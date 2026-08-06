# 2026-08-06 — T-075 BLOCKED: 0.1.0 lacks two owner-driven local harness fixes

**Task:** T-075 (spec `.agents/specs/harness-npm-consumption.md`) — run
`agentic upgrade` with the npm harness and review the drift, no blind
commit.

**What happened:** Baseline `gates --tier all` PASS. `./scripts/agentic
upgrade` (npm 0.1.0) ran clean: 8 surfaces changed. The mandated
file-by-file review then found the upgrade is a REGRESSION, and the
surfaces were reverted rather than committed:

- `.github/rulesets/main-branch.json`: 0.1.0 recompiles
  `required_approving_review_count: 1` + `require_code_owner_review:
  true` — the solo-maintainer self-approval deadlock this repo fixed
  locally on 2026-08-06 (vendored commit 12665c4, `solo_maintainer: true`
  in approvals.yaml) after PR #11 was unmergeable. 0.1.0 does not know
  the key (grep of its dist: zero hits) and silently ignores it.
- `.claude/settings.json`: 0.1.0 drops the `Bash(gh pr merge*)` ask rule
  in integration mode; the local fix deliberately RESTORES it when
  solo_maintainer (the human gate moves client-side when the server-side
  review gate is off). Same missing key.
- Also missing upstream: `ai_attribution` (vendored T-072 work) — 0.1.0's
  integrity gate always fails attribution trailers, but this repo sets
  `ai_attribution: allow` because GitHub squash-merges re-append
  Co-authored-by (b1de0d6 precedent). On 0.1.0, governance CI would fail
  on the first squash-merge commit in a checked range despite owner
  policy. Zero `ai_attribution` hits in 0.1.0's dist.
- The remaining changes (versioned markers, `_generated` keys,
  approvals.lock.json, the new Copilot hooks surfaces) are all correct
  and wanted — they ride along once the blockers clear.

**Why blocked, not worked around:** committing the regressed surfaces
would re-deadlock main merges and arm a CI failure; hand-editing the
compiled output would fail `approvals check` (differs) and violate the
generated-surface contract. The fix lives upstream in
agentic-starter-repo: port `solo_maintainer` (approvals compiler +
config) and `ai_attribution` (config + integrity gate + prepare-commit-msg
strip toggle) from this repo's vendored harness to the template, publish
0.2.0 (owner release approval), bump `.agentic/package.json` here, rerun
T-075. The vendored copies of both patches are the reference
implementations (vendored commits 12665c4 and the T-070..T-072 series).

**State:** all upgrade output reverted (`git status` clean except
tasks.json); gates PASS on the reverted tree; T-076 remains pending and
dependent. Baseline evidence: pre-upgrade `gates --tier all` PASS
(format/lint/typecheck/test/designs/integrity/memory/build, e2e skip).

**Next:** template-repo work (new tasks there), then 0.2.0 publish, then
unblock T-075.
