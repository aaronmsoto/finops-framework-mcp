# 2026-08-06 — T-076: vendored harness deleted, npm-only parity proven

**Task:** T-076 (spec `.agents/specs/harness-npm-consumption.md`) — the
close of Phase C.

**Prerequisite shipped upstream first:** the generated settings.json
SessionStart hook baked `.agentic/harness/dist/cli.js`, which would have
violated this task's no-live-references criterion. Template 0.2.1 makes
REQUIRED_HOOKS shim-first (plus the same probe fix in its static
loop-gate/pre-push copies); this repo bumped `.agentic/package.json` to
`^0.2.1`, re-ran `upgrade`, and removed the stale SessionStart extra the
hook-merge preserved (approvals check clean after).

**Deleted:** `.agentic/harness/` (tracked files via git rm; untracked
build residue rm -rf), plus `.agentic/presets/` and
`.agentic/INSTANTIATE.md` — template-authoring artifacts a derivative
never uses (presets serve `agentic init`, INSTANTIATE creates NEW
projects); both referenced the deleted vendored paths and their removal
serves the owner's narrow-and-minimal goal. AGENTS.md's INSTANTIATE
pointer line removed with them.

**Rewritten/updated:** `scripts/bootstrap.sh` (Node>=20 checks kept;
harness now `npm ci --prefix .agentic`; hooksPath install kept);
`scripts/agentic` (vendored tier dropped — npm-only probe);
root `package.json` `agentic`/`gates` scripts → shim;
`scripts/git-hooks/pre-push` (gates on shim resolution);
`scripts/hooks/loop-gate.mjs` (npm-first probe, template-fix port);
`scripts/hooks/protect-policy.mjs` fallback list (dropped the deleted
glob); `.claude/agents/reviewer.md`; AGENTS.md harness line;
`.agentic/docs/` architecture/getting-started/quality-gates/
template-readme/approvals references.

**approvals.yaml:** single authorized line removed
(`.agentic/harness/tests/**` protected glob) via the documented
policy-edit-ok override (removed after); `upgrade` recompiled CODEOWNERS
+ copilot-policy.mjs accordingly; `approvals check` — no drift.

**Acceptance grep:** `git grep` for `agentic-starter/harness` or
`.agentic/harness/dist` outside journals/specs/decisions/task records:
ZERO hits — stronger than the criterion, which permitted historical
files.

**npm-only parity proof (vendored copy gone):**
- `gates --tier all` → PASS (format/lint/typecheck/test 407/designs/
  integrity/memory/build; e2e optional-skip).
- `verify` → every check PASS except working-tree-clean, which is the
  uncommitted T-076 diff itself; re-run after commit for the record.
- `loop --runner mock --max-iterations 1 --skip-preflight` → terminal
  state `success — no pending tasks, gates green, chain valid`. Honest
  nuance: ZERO build iterations ran because the queue is empty (T-076
  itself is in_progress, nothing pending) — the loop machinery
  (selection, gates, chain validation, terminal state) executed
  end-to-end on the npm harness, but no mock build/verify cycle
  occurred. Running one would have required polluting the real hash
  chain with a throwaway task; declined.

**Next:** commit, re-run verify for the clean-tree PASS, complete
T-076, push; then PR to dev — Phase C done.

## Reviewer verdict: pass (with queued nits) — post-review completion

Reviewer independently reproduced the grep, gates --tier all, approvals
check, mock loop, and 0.2.1/settings validations; judged the
zero-iteration mock loop as satisfying the criterion's intent and the
test deletions as authorized (upstream suite owns them). Non-blocking
follow-ups queued in activeContext: agentic.config.json $schema dangling
pointer (protected — own task), .agentic/docs presets/INSTANTIATE
reference hygiene.
