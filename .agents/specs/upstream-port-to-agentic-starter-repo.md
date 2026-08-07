# Spec — port two policy toggles upstream to agentic-starter-repo

Status: **ready to execute** (not started upstream). Written 2026-08-06 in
finops-framework-mcp, where both fixes are implemented, merged and verified.

> **Do not run prettier on this file.** It reflows the fenced `diff` blocks
> below, which are real patches (`git apply -p1`) and must stay byte-exact.
> `.agents/` is outside the format gate, so nothing enforces this for you.

## Who this is for

A session with write access to **agentic-starter-repo** (the template this
repo was generated from). It needs no context from the originating
conversation — everything required is below, including the exact diffs.

If you also have finops-framework-mcp attached, the reference implementation
is on its `main`: commits `12665c4` (solo_maintainer), `ff71620`
(ai_attribution), `89103ef` (the CI step), plus journals
`.agents/journal/20260806-t07{0,1,2}-*.md` and the decision record in
`.agents/memory/decisions.md` (2026-08-06).

## Why — two rules the template ships that cannot be satisfied

Both were found the hard way, on real pull requests.

### Bug 1 — solo maintainers can never merge

`compileRuleset` emits `required_approving_review_count: 1` +
`require_code_owner_review: true` whenever `merge_to_main: human`, and
`compileCodeowners` writes `* @owner`. **GitHub does not allow approving your
own pull request.** On any single-maintainer repo — which is the default
shape for a repo generated from this template — the only eligible reviewer is
the PR author, so every PR the owner opens is permanently unmergeable.
GitHub offers "Request Review" and nothing else; `mergeable_state` sits at
`blocked` forever.

`compileIntegrationRuleset` in the same file already gets this right, with a
comment explaining that green CI is the merge gate and
`required_approving_review_count: 0`. The main-branch compiler simply never
had the same reasoning applied.

### Bug 2 — the no-AI-attribution rule is unsatisfiable for PR bodies

The policy is enforced in four places: the `prepare-commit-msg` hook, the
integrity gate, a PR-body grep in `ci.yml`, and the AGENTS.md prose. The
first two work fine. The third cannot be satisfied: **agent tooling
re-appends the attribution footer server-side after submission.** Verified
directly — a footer removed via the REST API was back within minutes, in a
*different* form (`https://claude.ai/code` where the original carried a
session id). The template's own comment notices the re-append and adds an
`edited` trigger to catch it, but draws the wrong conclusion: if the platform
re-appends, no author edit can ever clear the check.

Net effect: red CI on essentially every agent-authored PR, for a cosmetic
reason. Enforcing a rule the workflow constantly violates trains everyone to
treat red CI as noise, which is worse than the attribution lines.

## What to build

Two independent `approvals.yaml` keys. **Both default to today's behavior**,
so existing repos are byte-unchanged until an owner opts in.

| key | type | default | effect when set |
|---|---|---|---|
| `solo_maintainer` | boolean | `false` | main ruleset drops to `required_approving_review_count: 0` + `require_code_owner_review: false`; `Bash(gh pr merge*)` returns to the ask list even in integration mode |
| `ai_attribution` | `forbid` \| `allow` | `forbid` | commit-msg hook stops stripping; integrity gate skips its attribution check; ci.yml skips its PR-body check |

### Design points that are load-bearing

1. **`solo_maintainer` must restore the `gh pr merge` ask rule.**
   `derivedPermissions` deliberately omits that client-side prompt in
   integration mode *because* main is gated server-side by the code-owner
   review. Remove that gate without restoring the prompt and merges to main
   become ungated on both sides. This is the part that keeps the change from
   being a straight weakening.

2. **The hook and the CI step must read the key with `grep`, not the CLI.**
   The hook must stay dependency-free and must never block a commit. The CI
   step deliberately runs *before* harness acquisition and on fork PRs, where
   the harness does not exist. In both, an unreadable `approvals.yaml` must
   leave the strict default in place.

3. **A bypass actor was considered and rejected for `solo_maintainer`.**
   Adding `bypass_actors: [{actor_type: RepositoryRole, ...}]` preserves the
   review requirement for non-admins, but requires hardcoding GitHub's
   numeric repository-role id into a generated file. That id could not be
   verified from an agent environment, and guessing wrong silently grants
   bypass to the wrong role. On a repo with one write account the two designs
   are equivalent in effect, so the id-free one wins. Revisit only if the
   template starts targeting multi-maintainer repos by default.

## Diffs — harness, hook

Paths are relative to the template root; in finops-framework-mcp the harness
is vendored under `.agentic/harness/`, so adjust the prefix if upstream has
it at the repo root.

```diff
diff --git a/.agentic/harness/src/approvals.ts b/.agentic/harness/src/approvals.ts
index b4da29f..308884b 100644
--- a/.agentic/harness/src/approvals.ts
+++ b/.agentic/harness/src/approvals.ts
@@ -40,7 +40,11 @@ export function derivedPermissions(policy: ApprovalsPolicy): { ask: string[]; de
     // agents must enable native auto-merge on PRs into the integration branch
     // (green CI is the gate); main stays human-gated server-side by the
     // main ruleset's required code-owner review.
-    if (policy.branching.mode !== "integration") ask.push("Bash(gh pr merge*)");
+    //
+    // EXCEPT when solo_maintainer is set — there is no server-side review gate
+    // to lean on (see compileRuleset), so the client-side prompt has to come
+    // back or merges to main would be ungated on both sides.
+    if (policy.branching.mode !== "integration" || policy.solo_maintainer) ask.push("Bash(gh pr merge*)");
   }
   if (policy.approvals.deploy_production === "human") ask.push("Bash(gh workflow run *deploy*)");
   if (policy.approvals.release === "human") ask.push("Bash(npm publish*)", "Bash(gh release create*)");
@@ -155,12 +159,19 @@ export function compileCodeowners(policy: ApprovalsPolicy): string {
 export function compileRuleset(policy: ApprovalsPolicy): string {
   const rules: unknown[] = [{ type: "deletion" }, { type: "non_fast_forward" }];
   if (policy.approvals.merge_to_main === "human") {
+    // GitHub does not allow approving your own PR. On a solo-maintained repo
+    // CODEOWNERS names only the owner, so requiring one approving code-owner
+    // review makes every PR the owner opens permanently unmergeable — GitHub
+    // offers "Request Review" and nothing else. Requiring a PR and green CI
+    // still holds; the human gate moves client-side to the `gh pr merge`
+    // prompt that derivedPermissions restores for this case.
+    const solo = policy.solo_maintainer;
     rules.push({
       type: "pull_request",
       parameters: {
-        required_approving_review_count: 1,
+        required_approving_review_count: solo ? 0 : 1,
         dismiss_stale_reviews_on_push: false,
-        require_code_owner_review: true,
+        require_code_owner_review: !solo,
         require_last_push_approval: false,
         required_review_thread_resolution: false,
         // In integration mode the release PR (dev -> main) must land as a
diff --git a/.agentic/harness/src/cli.ts b/.agentic/harness/src/cli.ts
index 04a9d4e..f7ff885 100644
--- a/.agentic/harness/src/cli.ts
+++ b/.agentic/harness/src/cli.ts
@@ -6,7 +6,13 @@ import fs from "node:fs";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
 import { checkApprovals, compileApprovals } from "./approvals.js";
-import { loadAgenticConfig, loadApprovals, type AgenticConfig, type BranchingMode } from "./config.js";
+import {
+  loadAgenticConfig,
+  loadApprovals,
+  type AgenticConfig,
+  type AiAttributionMode,
+  type BranchingMode,
+} from "./config.js";
 import { designCheck, designNew, designPublish } from "./designs.js";
 import { gatesReportPath, runGates, summarizeReport, type TierSelection } from "./gates.js";
 import { runInit, initNextSteps, LICENSE_CHOICES, type InitOptions, type LicenseChoice } from "./init.js";
@@ -384,14 +390,17 @@ function cmdIntegrity(root: string, config: AgenticConfig, args: string[], json:
   // Default base is derived from branching policy (integration branch in
   // integration mode, else default_branch), not the constant origin/main.
   let base = parsed.strings.base;
-  if (base === undefined) {
-    try {
-      base = resolveDefaultBase(root, loadApprovals(root).branching);
-    } catch {
-      // approvals.yaml missing/invalid: fall through to runIntegrity's default.
-    }
+  // Owner policy: whether AI-attribution markers are allowed in commit
+  // messages. Unreadable approvals.yaml falls back to the strict default.
+  let aiAttribution: AiAttributionMode = "forbid";
+  try {
+    const policy = loadApprovals(root);
+    if (base === undefined) base = resolveDefaultBase(root, policy.branching);
+    aiAttribution = policy.ai_attribution;
+  } catch {
+    // approvals.yaml missing/invalid: fall through to runIntegrity's defaults.
   }
-  const result = runIntegrity(root, config, { base });
+  const result = runIntegrity(root, config, { base, aiAttribution });
   const strict = parsed.booleans.strict;
   const failures = strict ? [...result.failures, ...result.warnings] : result.failures;
   const warnings = strict ? [] : result.warnings;
diff --git a/.agentic/harness/src/config.ts b/.agentic/harness/src/config.ts
index 0c39d2a..27a2666 100644
--- a/.agentic/harness/src/config.ts
+++ b/.agentic/harness/src/config.ts
@@ -208,8 +208,34 @@ export interface ApprovalsPolicy {
   commands: { ask: string[]; deny: string[] };
   loop: LoopCaps;
   branching: BranchingPolicy;
+  /**
+   * True when `owner` is the ONLY person with write access.
+   *
+   * GitHub refuses to let anyone approve their own pull request. With
+   * `merge_to_main: human` the compiled main ruleset would otherwise require
+   * one approving CODEOWNER review, and CODEOWNERS names only the owner — so
+   * every PR the owner opens is permanently unmergeable. This flag swaps that
+   * server-side review gate for the client-side `gh pr merge` prompt; a PR
+   * and green CI are still required either way. Leave false whenever a second
+   * reviewer exists.
+   */
+  solo_maintainer: boolean;
+  /**
+   * Whether AI-attribution markers (`Co-Authored-By: ...claude...`,
+   * `Claude-Session:`, "Generated with/by ...", 🤖) may appear in git
+   * artifacts — commit messages and PR bodies.
+   *
+   * "forbid" (the default) is the template's original posture: the
+   * prepare-commit-msg hook strips them and the integrity gate fails commits
+   * carrying them. "allow" turns both off. Agent tooling appends these
+   * footers automatically and often re-appends them after submission, so a
+   * repo that does not care about them otherwise fails CI on every PR.
+   */
+  ai_attribution: AiAttributionMode;
 }
 
+export type AiAttributionMode = "forbid" | "allow";
+
 export const DEFAULT_LOOP_CAPS: LoopCaps = {
   max_iterations: 10,
   max_wall_minutes: 120,
@@ -355,5 +381,31 @@ export function validateApprovals(raw: unknown): ApprovalsPolicy {
     }
   }
 
-  return { version: 1, owner, approvals, protected_paths, commands, loop, branching };
+  let solo_maintainer = false;
+  if (raw.solo_maintainer !== undefined) {
+    if (typeof raw.solo_maintainer !== "boolean") {
+      fail(F, "solo_maintainer", `must be true or false (got ${describe(raw.solo_maintainer)})`);
+    }
+    solo_maintainer = raw.solo_maintainer;
+  }
+
+  let ai_attribution: AiAttributionMode = "forbid";
+  if (raw.ai_attribution !== undefined) {
+    if (raw.ai_attribution !== "forbid" && raw.ai_attribution !== "allow") {
+      fail(F, "ai_attribution", `must be "forbid" or "allow" (got ${describe(raw.ai_attribution)})`);
+    }
+    ai_attribution = raw.ai_attribution;
+  }
+
+  return {
+    version: 1,
+    owner,
+    approvals,
+    protected_paths,
+    commands,
+    loop,
+    branching,
+    solo_maintainer,
+    ai_attribution,
+  };
 }
diff --git a/scripts/git-hooks/prepare-commit-msg b/scripts/git-hooks/prepare-commit-msg
index 9549f12..752b193 100755
--- a/scripts/git-hooks/prepare-commit-msg
+++ b/scripts/git-hooks/prepare-commit-msg
@@ -19,6 +19,16 @@ MSG_FILE="$1"
 
 [ -n "$MSG_FILE" ] && [ -f "$MSG_FILE" ] || exit 0
 
+# Owner policy toggle: approvals.yaml `ai_attribution: allow` turns the whole
+# thing off (the integrity gate reads the same key). Grepped rather than
+# parsed — this hook must stay dependency-free and must never block a commit,
+# so an unreadable or absent file just leaves the strict default in place.
+ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || ROOT=.
+if grep -qE '^[[:space:]]*ai_attribution:[[:space:]]*"?allow"?[[:space:]]*(#.*)?$' \
+    "$ROOT/approvals.yaml" 2>/dev/null; then
+    exit 0
+fi
+
 TMP="${MSG_FILE}.noai"
 if grep -v -i \
     -e '^co-authored-by:.*\(claude\|copilot\|anthropic\|openai\|gemini\|cursor\|aider\|devin\)' \
```

## Diff — the ci.yml PR-body step

```diff
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 55e1968..767aec3 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -118,19 +118,36 @@ jobs:
           # Full history: the integrity gate diffs against base refs.
           fetch-depth: 0
 
-      # Owner policy: no AI attribution in git artifacts — including PR
-      # bodies. PR-creation tooling has been observed auto-appending
-      # "Generated by/with ..." footers AFTER the submitted body, so this is
-      # checked server-side rather than trusted to authors. Body is passed
-      # via env (never interpolated into the script) so a malicious PR body
-      # cannot inject shell. Needs no harness, so it runs on fork PRs too.
+      # Owner policy: AI attribution in git artifacts is governed by
+      # `ai_attribution` in approvals.yaml (the prepare-commit-msg hook and
+      # the integrity gate read the same key for commit messages; this step
+      # covers PR bodies).
+      #
+      # Read with grep, not the harness CLI: this step deliberately runs
+      # BEFORE harness acquisition and on fork PRs, where the harness is
+      # unavailable. An unreadable approvals.yaml leaves the strict default.
+      #
+      # Under `forbid` this is checked server-side rather than trusted to
+      # authors, because PR tooling re-appends "Generated by ..." footers
+      # AFTER submission (observed 2026-08-06: a footer removed via the API
+      # was back within minutes, in a different form) — which is also why the
+      # workflow listens for the `edited` event. Note the consequence: under
+      # `forbid` this check can be unsatisfiable for tool-authored PRs, since
+      # no author edit survives. That is what `allow` exists for.
+      #
+      # Body is passed via env (never interpolated into the script) so a
+      # malicious PR body cannot inject shell.
       - name: PR body carries no AI attribution
         if: github.event_name == 'pull_request'
         env:
           PR_BODY: ${{ github.event.pull_request.body }}
         run: |
+          if grep -qE '^[[:space:]]*ai_attribution:[[:space:]]*"?allow"?[[:space:]]*(#.*)?$' approvals.yaml 2>/dev/null; then
+            echo "approvals.yaml sets ai_attribution: allow — skipping the PR-body attribution check."
+            exit 0
+          fi
           if printf '%s' "$PR_BODY" | grep -qiE 'generated (with|by).*(claude|copilot)|claude\.ai/code|co-authored-by:.*(claude|copilot|anthropic)|🤖'; then
-            echo "::error::PR body contains an AI-attribution footer (owner policy). Edit the PR description and remove it — tools may auto-append these after submission."
+            echo "::error::PR body contains an AI-attribution footer (owner policy: ai_attribution=forbid). Set ai_attribution: allow in approvals.yaml, or edit the PR description — note tools may re-append these after submission."
             exit 1
           fi
 
```

## approvals.yaml — the keys, as documented in this repo

```yaml
# True when `owner` is the ONLY account with write access. GitHub refuses to
# let anyone approve their own pull request, so with merge_to_main: human the
# compiled main ruleset would require a CODEOWNER review that only the PR
# author could give — making every owner-authored PR unmergeable. Set back to
# false the moment a second reviewer exists; the server-side gate is stronger.
solo_maintainer: true

# May AI-attribution markers appear in git artifacts?
#   forbid (default) — hook strips them, integrity gate fails commits, CI
#     fails PR bodies containing them.
#   allow            — all three are turned off.
ai_attribution: allow
```

## Tests to add upstream

`.agentic/harness/tests/**` is a protected path in finops-framework-mcp, so
none were added there. Upstream should cover, in `approvals.test.ts` /
`config.test.ts`:

- `compileRuleset` with `solo_maintainer` false → `count: 1`,
  `require_code_owner_review: true` (pins the existing default).
- `compileRuleset` with it true → `count: 0`, `require_code_owner_review: false`.
- `derivedPermissions` in integration mode: `Bash(gh pr merge*)` absent when
  false, present when true.
- `validateApprovals` rejects non-boolean `solo_maintainer` and any
  `ai_attribution` outside `forbid`/`allow`, and defaults both when absent.
- `runIntegrity` with `aiAttribution: 'allow'` produces no attribution
  failure for a commit carrying `Co-Authored-By: ...claude...`, and with
  `'forbid'` still produces one. The subject-length check shares that loop
  and must keep firing in both modes.

## How this was verified downstream

Reproduce these before calling the port done:

```
solo=false | reviews=1 | codeowner=true  | gh-pr-merge-ask=false
solo=true  | reviews=0 | codeowner=false | gh-pr-merge-ask=true

ai_attribution=allow   -> integrity attribution failures: 0
ai_attribution=forbid  -> integrity attribution failures: 1   (same commit)

ci.yml step, run: block extracted with a YAML parser and executed against a
real re-appended footer body:
  allow  -> exit=0  "skipping the PR-body attribution check."
  forbid -> exit=1  "::error::PR body contains an AI-attribution footer ..."
```

Plus the end-to-end proof: `governance` passed on a PR whose body still
carried the footer.

## Smaller template feedback to fold in while you are there

- **Task IDs collide across parallel branches.** `tasks add` numbers from the
  local `tasks.json` only, so two branches hand out the same ID and the
  hash chain has to be reconciled by hand at merge. This bit two consecutive
  sessions in finops-framework-mcp (T-065..T-067 → T-067..T-069, then
  T-067/T-068 → T-071/T-072). Consider deriving IDs from the chain head, or
  a `tasks renumber` command.
- **`tasks complete --commit` run mid-merge swallows the merge commit** and
  labels it "Record T-0xx completion". Detect `MERGE_HEAD` and refuse, or
  commit the merge separately first.
- **`gates --tier full` runs only full-tier gates** — `--tier all` is what
  you want before shipping. The naming invites the mistake.
- **`design check` warns on every HTML file outside `docs/designs/`.** A
  published HTML site (`docs/guide/`) trips it on every run. It should accept
  a configured allowlist of directories.
- **Supervising sessions must not commit a live loop's in-flight tasks.json.**
- **Background watchers must not `pgrep` for a pattern contained in their own
  command line** (self-match false positive).
