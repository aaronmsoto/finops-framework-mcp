#!/usr/bin/env bash
# bootstrap.sh — one-time setup for a fresh clone:
#   1. check Node.js >= 20
#   2. install the agentic harness (@aaronmsoto/agentic-harness) from GitHub
#      Packages via the .agentic manifest — needs a read:packages token in
#      NPM_TOKEN (CI uses the built-in GITHUB_TOKEN; locally put a PAT in the
#      environment or ~/.npmrc)
#   3. install the repo git hooks
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(dirname -- "$SCRIPT_DIR")
cd "$REPO_ROOT"

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

echo "bootstrap: installing agentic harness from GitHub Packages (Node $(node --version))..."
npm ci --prefix .agentic

if [ -d .git ]; then
    echo "bootstrap: installing git hooks..."
    git config core.hooksPath scripts/git-hooks
fi

echo "bootstrap: done — try ./scripts/agentic status"
