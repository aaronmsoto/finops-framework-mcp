# ADR-0001: AGENTS.md is canonical; CLAUDE.md is an import shim

**Status:** Accepted (2026-07-13)

## Context

The repo serves two agent CLIs. Duplicate instruction files (separate CLAUDE.md and AGENTS.md contents) are the top failure mode of existing dual-tool starters — they drift, and agents follow whichever stale copy their tool reads. AGENTS.md is now the settled standard: Linux Foundation-stewarded, 60k+ repos, read natively by Copilot CLI; Anthropic's own docs prescribe a CLAUDE.md shim containing `@AGENTS.md`. Research corrections that shaped the details: the shim must be an import, not a symlink (Windows symlinks need admin rights — Anthropic says so explicitly); imports organize but do not save tokens, so the always-loaded budget (~200 lines, per the ETH Zurich study — the figure is commonly misattributed to GitHub's 2,500-repo analysis) covers AGENTS.md plus the shim; and Copilot's behavior when both files coexist at root is **unverified** ("Alternatively," in its docs, coexistence undefined).

## Decision

`AGENTS.md` at repo root is the single canonical instruction file, budgeted at ~150 lines and linted. `CLAUDE.md` is a 3-line shim: `@AGENTS.md` plus a tiny Claude-only section (hooks note, reviewer subagent). Nothing Copilot-relevant may live only in CLAUDE.md.

## Consequences

- One file to maintain; drift is structurally impossible rather than procedurally discouraged.
- Claude-specific content is capped at what is harmless if Copilot happens to read the shim.
- The coexistence uncertainty stays open; a CI smoke test can close it later.
- `memory lint` enforces the AGENTS.md line budget, so the file cannot silently bloat.
