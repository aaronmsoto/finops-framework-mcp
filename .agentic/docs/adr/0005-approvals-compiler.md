# ADR-0005: Approval points are compiled from one policy file

**Status:** Accepted (2026-07-13)

## Context

Human approval points (merge, deploy, release, force-push, protected paths) must hold across two agent CLIs plus GitHub — but **no cross-tool policy standard exists** (verified absence), and each surface speaks a different language: Claude Code reads `permissions.ask`/`deny` in `.claude/settings.json`; Copilot CLI has **no repo-committed permissions file at all** (policy only reaches it via command-line flags); GitHub enforces via CODEOWNERS and rulesets. Documenting policy in prose guarantees drift. Two verified facts make compilation worth it: Claude's explicit `ask` rules survive `bypassPermissions`, and Copilot's `--deny-tool` beats `--allow-all` — so compiled deny/ask rules hold even in YOLO modes.

## Decision

`approvals.yaml` is the single owner-edited policy source. `agentic approvals compile` generates all four enforcement surfaces: the `permissions.ask`/`deny` arrays in `.claude/settings.json` (compiler-owned), the `scripts/copilot.sh` wrapper with `--deny-tool` flags (the repo-committed policy carrier for Copilot), `.github/CODEOWNERS`, and `.github/rulesets/main-branch.json`. `agentic approvals check` (recompile-to-temp + diff) runs in CI so surfaces cannot drift from policy. Policy files are themselves protected paths, so changes to the system go through owner review.

## Consequences

- One diff to review for any policy change; enforcement corresponds to policy by construction.
- Approval points survive permissive modes on both tools.
- Residual gaps are platform-imposed and documented: bare `copilot` bypasses the wrapper, ruleset import excludes bypass lists, and applying the ruleset stays a one-time manual step.
- Generated files must never be hand-edited; CI makes that mistake loud rather than silent.
