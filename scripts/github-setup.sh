#!/usr/bin/env bash
# Apply the GitHub repo settings this template relies on but which do NOT
# transfer with repo content ("Use this template", git archive, clone):
#
#   1. Allow auto-merge; squash-merge message defaults to PR title + body
#      (GitHub's stock squash message synthesizes co-author trailers from
#      branch commit authors — agent attribution the integrity gate rejects).
#   2. Allow GitHub Actions to create and approve pull requests (the
#      release-pr.yml rolling PR cannot be created without it).
#   3. Import the ruleset(s) from .github/rulesets/ — main-branch.json
#      always; integration-branch.json when approvals.yaml branching.mode
#      is integration.
#
# Requires: gh CLI authenticated as the repo owner/admin (gh auth login).
# Idempotent: settings are PATCHed to the same values; rulesets are only
# created when no ruleset with the same name exists.
#
# Usage: ./scripts/github-setup.sh [--dry-run] [--repo owner/name]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

DRY_RUN=0
REPO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --repo) REPO="${2:?--repo requires owner/name}"; shift ;;
    *) echo "unknown argument: $1 (usage: github-setup.sh [--dry-run] [--repo owner/name])" >&2; exit 2 ;;
  esac
  shift
done

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI not found. Install it (https://cli.github.com) and run 'gh auth login'," >&2
  echo "or apply the settings manually — the checklist is in .agentic/docs/getting-started.md (\"Wire up GitHub\")." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh is not authenticated. Run 'gh auth login' as the repository owner/admin." >&2
  exit 1
fi
if [ -z "$REPO" ]; then
  REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
fi
if [ -z "$REPO" ]; then
  echo "error: could not determine the repository. Pass --repo owner/name." >&2
  exit 1
fi

run() {
  if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if [ "$(gh api "repos/$REPO" --jq .permissions.admin 2>/dev/null)" != "true" ]; then
  echo "error: the authenticated gh user is not an admin of $REPO — repo settings need admin rights." >&2
  exit 1
fi

POLICY_DEFAULT_BRANCH="$(sed -n 's/^[[:space:]]*default_branch:[[:space:]]*"\{0,1\}\([a-zA-Z0-9._/-]*\)"\{0,1\}.*/\1/p' approvals.yaml | head -1)"
POLICY_DEFAULT_BRANCH="${POLICY_DEFAULT_BRANCH:-main}"
DEFAULT_BRANCH="$(gh api "repos/$REPO" --jq .default_branch)"
if [ "$DEFAULT_BRANCH" != "$POLICY_DEFAULT_BRANCH" ]; then
  echo "warning: GitHub's default branch is \"$DEFAULT_BRANCH\" but approvals.yaml branching." >&2
  echo "         default_branch is \"$POLICY_DEFAULT_BRANCH\" — the compiled ruleset protects" >&2
  echo "         refs/heads/$POLICY_DEFAULT_BRANCH. Align them (rename the GitHub default branch, or" >&2
  echo "         set branching.default_branch and recompile) or the protected branch won't exist." >&2
  echo "         Also edit ci.yml + release-pr.yml if your default branch is not \"main\"." >&2
fi

echo "==> $REPO: merge + squash-message settings"
# allow_squash_merge/allow_merge_commit: the rulesets PIN methods (squash into
# the integration branch, merge-commit into main) — if either is disabled
# repo-wide, those PRs become unmergeable.
run gh api -X PATCH "repos/$REPO" \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true \
  -F allow_squash_merge=true \
  -F allow_merge_commit=true \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY >/dev/null
echo "    allow_auto_merge, delete_branch_on_merge, squash+merge methods on, squash message = PR title + body"

echo "==> $REPO: allow Actions to create and approve pull requests"
# Preserve the current default workflow token permissions; only flip the flag.
DEFAULT_PERMS="$(gh api "repos/$REPO/actions/permissions/workflow" --jq .default_workflow_permissions)"
run gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions="$DEFAULT_PERMS" \
  -F can_approve_pull_request_reviews=true >/dev/null
echo "    can_approve_pull_request_reviews=true (default token permissions kept: $DEFAULT_PERMS)"

BRANCHING_MODE="$(sed -n 's/^[[:space:]]*mode:[[:space:]]*\([a-z]*\).*/\1/p' approvals.yaml | head -1)"
BRANCHING_MODE="${BRANCHING_MODE:-trunk}"
INTEGRATION_BRANCH="$(sed -n 's/^[[:space:]]*integration_branch:[[:space:]]*"\{0,1\}\([a-zA-Z0-9._/-]*\)"\{0,1\}.*/\1/p' approvals.yaml | head -1)"
INTEGRATION_BRANCH="${INTEGRATION_BRANCH:-dev}"

if [ "$BRANCHING_MODE" = "integration" ]; then
  if [ "$INTEGRATION_BRANCH" != "dev" ] && [ -f ".github/workflows/release-pr.yml" ]; then
    echo "warning: integration_branch is \"$INTEGRATION_BRANCH\" but release-pr.yml hardcodes dev —" >&2
    echo "         the rolling release PR will never open. Edit the workflow's branch references." >&2
  fi
  if ! gh api "repos/$REPO/branches/$INTEGRATION_BRANCH" >/dev/null 2>&1; then
    echo "==> creating the $INTEGRATION_BRANCH branch from $DEFAULT_BRANCH"
    HEAD_SHA="$(gh api "repos/$REPO/git/ref/heads/$DEFAULT_BRANCH" --jq .object.sha)"
    run gh api -X POST "repos/$REPO/git/refs" -f ref="refs/heads/$INTEGRATION_BRANCH" -f sha="$HEAD_SHA" >/dev/null
  fi
fi
RULESET_FILES=(".github/rulesets/main-branch.json")
if [ "$BRANCHING_MODE" = "integration" ] && [ -f ".github/rulesets/integration-branch.json" ]; then
  RULESET_FILES+=(".github/rulesets/integration-branch.json")
fi

EXISTING_NAMES="$(gh api "repos/$REPO/rulesets" --jq '.[].name' 2>/dev/null || true)"
for file in "${RULESET_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "==> skipping $file (not found — run ./scripts/agentic approvals compile first)"
    continue
  fi
  name="$(sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$file" | head -1)"
  if printf '%s\n' "$EXISTING_NAMES" | grep -Fxq "$name"; then
    echo "==> ruleset \"$name\" already exists — leaving it untouched (NOTE: if approvals.yaml"
    echo "    changed since import, the live ruleset may have drifted from $file;"
    echo "    delete it in the UI and rerun to reimport)"
    continue
  fi
  echo "==> importing ruleset \"$name\" from $file"
  run gh api -X POST "repos/$REPO/rulesets" --input "$file" >/dev/null
done

OWNER_HANDLE="$(sed -n 's/^owner:[[:space:]]*"\{0,1\}@\{0,1\}\([a-zA-Z0-9-]*\)"\{0,1\}.*/\1/p' approvals.yaml | head -1)"
if [ -n "$OWNER_HANDLE" ] && ! gh api "repos/$REPO/collaborators/$OWNER_HANDLE" >/dev/null 2>&1; then
  echo "warning: approvals.yaml owner @$OWNER_HANDLE is not a collaborator on $REPO —" >&2
  echo "         GitHub silently ignores unknown CODEOWNERS, so required code-owner review" >&2
  echo "         passes vacuously. Fix the owner handle or repo access." >&2
fi
CODEOWNER_ERRORS="$(gh api "repos/$REPO/codeowners/errors" --jq '.errors | length' 2>/dev/null || echo "")"
if [ -n "$CODEOWNER_ERRORS" ] && [ "$CODEOWNER_ERRORS" != "0" ]; then
  echo "warning: GitHub reports $CODEOWNER_ERRORS CODEOWNERS error(s) — see Settings or" >&2
  echo "         'gh api repos/$REPO/codeowners/errors'." >&2
fi
if [ "$(gh api "repos/$REPO" --jq .private)" = "true" ]; then
  echo "note: private repo — rulesets and required reviews are NOT enforced on the Free plan;" 
  echo "      verify enforcement under Settings -> Rules (or upgrade/make the repo public)."
fi

echo
echo "Done. Still manual (GitHub offers no API, or judgment is required):"
echo "  - Review ruleset bypass lists (imports/API creates never carry them). Solo-owner"
echo "    repos: you cannot approve your own agent-authored PRs — add yourself as a"
echo "    bypass actor on the main ruleset, or run agents under a separate account."
echo "  - Org-level Actions policy can still override the PR-creation permission set above."
echo "  - Required checks appear in the UI only after they have reported once —"
echo "    open a first PR if \"gates-fast\" is not selectable yet."
echo "  - Optional: a 'production' Environment with required reviewers for deploys."
echo "  - Template repo only: tick Settings -> General -> \"Template repository\"."
