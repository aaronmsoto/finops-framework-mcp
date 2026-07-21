#!/usr/bin/env bash
# setup-beads.sh — OPT-IN tier-2 memory: beads task-graph setup.
#
# beads (https://github.com/steveyegge/beads) is a Dolt-backed issue/task
# graph for long-horizon agent work. It is NOT required by anything in this
# template — the core memory is the committed bank in .agents/memory/ and
# the hash-chained .agents/tasks.json. Run this only if you want the extra
# tier. See .agentic/docs/memory.md for the tiering rationale.
#
# Verified against beads v1.1.0 (Dolt-backed), July 2026. Subcommand
# availability is probed at runtime so older/newer versions degrade
# gracefully instead of erroring.
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(dirname -- "$SCRIPT_DIR")
cd "$REPO_ROOT"

# --- 1. bd on PATH? ----------------------------------------------------------
if ! command -v bd >/dev/null 2>&1; then
    cat >&2 <<'EOF'
setup-beads: `bd` not found on PATH.

beads is optional tier-2 memory (long-horizon task graphs). To install:

  brew install steveyegge/beads/beads                       # macOS / Linuxbrew
  go install github.com/steveyegge/beads/cmd/bd@latest      # Go toolchain
  # or download a release binary:
  #   https://github.com/steveyegge/beads/releases

Then re-run ./scripts/setup-beads.sh.
If you don't want beads, do nothing — everything in this template works
without it (see .agentic/docs/memory.md).
EOF
    exit 1
fi

CHANGED=()

# --- 2. Initialize the beads database (once) ---------------------------------
if [ ! -d .beads ]; then
    echo "setup-beads: no .beads/ directory found; running 'bd init'..."
    bd init
    CHANGED+=(".beads/ created (bd init)")
else
    echo "setup-beads: .beads/ already exists; skipping 'bd init'."
fi

# --- 3. Per-tool integration (probe first; tolerate absence) -----------------
# `bd setup <tool>` wires beads into the agent CLI's context (v1.1.0+).
# Probe with --help so a beads build without the subcommand doesn't fail us.
for tool in claude copilot; do
    if bd setup "$tool" --help >/dev/null 2>&1; then
        echo "setup-beads: running 'bd setup $tool'..."
        bd setup "$tool"
        CHANGED+=("bd setup $tool applied")
    else
        echo "setup-beads: 'bd setup $tool' not available in this beads version; skipping (not an error)."
    fi
done

# --- 4. Summary ---------------------------------------------------------------
echo ""
echo "setup-beads: done. Changes made:"
if [ ${#CHANGED[@]} -eq 0 ]; then
    echo "  (none — beads was already set up)"
else
    printf '  - %s\n' "${CHANGED[@]}"
fi
echo ""
echo "Reminder: beads is OPTIONAL. The shared, PR-reviewed memory bank remains"
echo ".agents/memory/ and the task chain remains .agents/tasks.json — beads is"
echo "an additive tier for long-horizon task graphs. See .agentic/docs/memory.md."
