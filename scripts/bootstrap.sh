#!/usr/bin/env bash
# bootstrap.sh — one-time (and idempotent) setup for the agentic harness:
#   1. verify Node.js >= 20
#   2. install harness deps and build .agentic/harness/dist/cli.js
#   3. point git at the repo's committed hooks (scripts/git-hooks)
# Safe to re-run at any time.
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(dirname -- "$SCRIPT_DIR")
cd "$REPO_ROOT"

# --- 1. Node version check -------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
    echo "bootstrap: Node.js not found on PATH." >&2
    echo "bootstrap: install Node.js >= 20 (https://nodejs.org) and re-run ./scripts/bootstrap.sh." >&2
    exit 1
fi

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "${NODE_MAJOR}" -lt 20 ]; then
    echo "bootstrap: Node.js >= 20 is required; found $(node --version)." >&2
    echo "bootstrap: upgrade Node (e.g. via nvm: 'nvm install 22') and re-run ./scripts/bootstrap.sh." >&2
    exit 1
fi

# --- 2. Build the harness ---------------------------------------------------
echo "bootstrap: building harness (Node $(node --version))..."
cd .agentic/harness
if [ -f package-lock.json ]; then
    npm ci
else
    echo "bootstrap: no package-lock.json found, falling back to 'npm install'." >&2
    npm install
fi
npm run build
cd "$REPO_ROOT"

# --- 3. Install git hooks ---------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1; then
    git config core.hooksPath scripts/git-hooks
    echo "bootstrap: git core.hooksPath -> scripts/git-hooks (pre-push, prepare-commit-msg)"
    # Commit identity: unset breaks every commit (and the loop's commit-per-task
    # check); an AI-sounding identity feeds GitHub's squash-message co-author
    # trailers, which the integrity gate rejects. Auto-set it to the repo owner
    # when it is unset, AI-looking, or a value THIS tooling set earlier (marked
    # by agentic.identityAutoset) — but never clobber a human-chosen identity.
    OWNER_HANDLE="$(sed -n 's/^owner:[[:space:]]*"\{0,1\}@\{0,1\}\([A-Za-z0-9-]*\)"\{0,1\}.*/\1/p' approvals.yaml 2>/dev/null | head -1)"
    CUR_NAME="$(git config user.name || true)"
    CUR_EMAIL="$(git config user.email || true)"
    AUTOSET="$(git config agentic.identityAutoset || true)"
    AI_RE='claude|copilot|anthropic|openai|gemini|cursor|aider|devin|\bbot\b'
    NEEDS_FIX=0
    if [ -z "$CUR_NAME" ] || [ -z "$CUR_EMAIL" ]; then NEEDS_FIX=1
    elif printf '%s %s' "$CUR_NAME" "$CUR_EMAIL" | grep -qiE "$AI_RE"; then NEEDS_FIX=1
    elif [ "$AUTOSET" = "true" ] && [ -n "$OWNER_HANDLE" ] && [ "$CUR_NAME" != "$OWNER_HANDLE" ]; then NEEDS_FIX=1
    fi
    if [ "$NEEDS_FIX" = "1" ] && [ -n "$OWNER_HANDLE" ]; then
        git config user.name "$OWNER_HANDLE"
        git config user.email "${OWNER_HANDLE}@users.noreply.github.com"
        git config agentic.identityAutoset true
        echo "bootstrap: set git identity to $OWNER_HANDLE <${OWNER_HANDLE}@users.noreply.github.com>" >&2
        echo "           (owner from approvals.yaml; override with git config user.name / user.email)." >&2
    elif [ "$NEEDS_FIX" = "1" ]; then
        echo "bootstrap: WARNING — git identity is unset or AI-looking and approvals.yaml has no owner yet." >&2
        echo "           Set it: git config user.name 'Your Name' && git config user.email you@example.com" >&2
    fi
else
    echo "bootstrap: not inside a git repository; skipped hook installation." >&2
fi

echo ""
echo "bootstrap: done."
echo "Next steps:"
echo "  ./scripts/agentic status        # one-screen overview"
echo "  ./scripts/agentic gates         # run the quality gates"
echo "  ./scripts/agentic tasks list    # see tracked work"
