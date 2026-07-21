# ADR-0003: Stop conditions live in the harness, never the prompt

**Status:** Accepted (2026-07-13)

## Context

Autonomous loops need termination guarantees. The prompt cannot provide them: instructions are advisory, and a completion-promise exit can only encode self-certified success. The decisive refuted claim: Anthropic's official ralph-wiggum plugin was assumed to enforce `--max-iterations`; verification showed it **defaults to unlimited iterations** — the cap is recommended, not enforced, and the plugin ships no gates, budgets, or supervision. Related findings: the widely-cited "loop engineering consensus" essay attribution was partly fabricated (the design advice stands via Anthropic's harness research, but as our synthesis, not cited consensus), and Claude Code force-overrides a Stop hook after 8 consecutive blocks without progress — so even in-session gating cannot be assumed to hold.

## Decision

The harness (`loop.ts`) owns all stop conditions. Caps come from `approvals.yaml` — `max_iterations: 10`, `max_wall_minutes: 120`, `max_consecutive_failures: 3` — and are mandatory: the defaults apply even when the config section is absent, and CLI flags may lower caps but never raise them. Every loop terminates in exactly one of three states: `success` (tasks done, gates green, chain valid), `budget_exhausted`, or `blocked` (writes `.agents/BLOCKED.md`). Terminal state is determined by harness checks (exit codes, gates, hash chain, commits), never by agent claims.

## Consequences

- No prompt failure, hook override, or agent misreport can produce an unbounded run.
- Raising a cap is a policy change through a protected, owner-reviewed file.
- `blocked` gives honest failure an escape hatch, so agents are not incentivized to thrash or fake success.
- The harness never assumes upstream loop tooling is safe; it enforces its own caps regardless of runner.
