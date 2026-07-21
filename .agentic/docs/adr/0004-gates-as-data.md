# ADR-0004: Gates as data, executed identically everywhere

**Status:** Accepted (2026-07-13)

## Context

Quality checks in agentic repos typically live in three divergent places — the agent's instructions, git hooks, and CI YAML — and drift between them is exactly where agents slip through: "green locally" stops predicting "green in CI," and an instruction-only rule has no compliance guarantee (Anthropic states verbatim that context files are advisory). Language coupling is the other trap: gates hardcoded to one toolchain make every new language a harness fork. Verified enablers: diff-cover consumes Cobertura, Clover, JaCoCo, and LCOV, so one coverage gate spans languages; and CI must listen to `merge_group` or merge-queue PRs never report — a documented setup trap worth solving once, centrally.

## Decision

Gates are named data in `agentic.config.json`: an ordered map of name → `{command, tier, optional, timeoutSeconds}`, with canonical names (`format`, `lint`, `typecheck`, `test`, `coverage`, `integrity`, `memory`, `security`, `build`, `e2e`) that language presets bind to real commands. One executor (`agentic gates`) is called identically by the loop's per-iteration check, the `pre-push` hook, and both CI jobs (`gates-fast` on push/PR, `gates-full` on `merge_group`). Every advisory rule that matters gets a deterministic gate twin.

## Consequences

- Exactly one definition of "passing"; local, loop, and CI results agree by construction.
- Adding a language is one preset file; the harness stays language-agnostic (shell + exit codes).
- Gate definitions become a protected, reviewable surface — an agent weakening a gate is a visible config diff, flagged by the integrity gate and gated by CODEOWNERS.
- Sequential execution and `sh -c` simplicity are accepted costs; speed is managed via tiers, not parallelism.
