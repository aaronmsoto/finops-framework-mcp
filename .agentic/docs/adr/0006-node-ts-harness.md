# ADR-0006: Self-contained Node/TypeScript harness

**Status:** Accepted (2026-07-13)

## Context

The harness (loop, gates, tasks, compiler) needs a language. Requirements: run everywhere the agent CLIs run; near-zero dependencies (enterprise environments restrict tooling, and a template must not rot); testable; independent of the user's project language. Both agent CLIs are npm-distributed, so Node >= 20 is already a prerequisite on any machine this template targets — a Node harness adds no new runtime. A refuted claim strengthened the choice: Copilot CLI was assumed to lack structured output and session resume; verification showed it documents `--output-format json` (JSONL) plus `--continue`/`-r`/`--session-id`. Both CLIs can therefore be driven through one typed runner interface with parsed events, which a typed language expresses cleanly. Shell was rejected (untestable at this size, no types); Python would add a second runtime for TS projects.

## Decision

`.agentic/harness/` is a self-contained Node >= 20 ESM TypeScript package: own `package.json`, strict `tsconfig`, vitest tests, hand-rolled argv parsing, and **no runtime dependency except `yaml`**. Runners implement one `AgentRunner` interface (`claude`, `copilot` via the guarded wrapper, and `mock` for hermetic testing). The user's project language never touches the harness: a Python project deletes the root `package.json` and keeps `.agentic/harness/` intact.

## Consequences

- One runtime serves both CLIs, all presets, and the harness's own test suite.
- The single-dependency rule keeps the supply-chain surface and maintenance burden near zero.
- Python-preset users carry a Node toolchain for the harness — accepted, since the agent CLIs require it anyway.
- The mock runner makes the entire loop testable in CI without agent credentials or token spend.
