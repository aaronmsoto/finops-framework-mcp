---
name: loop-help
description: How the supervised autonomous loop works - modes, runners, hard caps, terminal states, BLOCKED.md recovery, and the mock dry-run. Use when asked to run, resume, configure, or diagnose ./scripts/agentic loop, or when a loop ended in budget_exhausted or blocked. Do not use for doing a single task by hand (use next-task) or for planning (use plan-feature).
---

# loop-help — running and recovering `./scripts/agentic loop`

## What one iteration does

Fresh agent process (never a resumed session) gets `.agents/prompts/build.md`
(or `plan.md`): orient from memory/journal/git → one task → gates green →
record → commit → `tasks complete`. The harness then independently checks
gates, hash chain, new commit, and that exactly one task moved — agent claims
are ignored. Unless `--no-verify`, a second fresh process runs
`.agents/prompts/verify.md` and must emit `VERDICT: pass` or the task reverts
to pending.

## Invocation

```
./scripts/agentic loop [--mode build|plan] [--runner claude|copilot|mock]
                       [--max-iterations N] [--max-minutes M]
                       [--no-verify] [--task <id>]
```

## Caps (mandatory, harness-enforced)

Hard caps live in `approvals.yaml` `loop:` (max_iterations 10,
max_wall_minutes 120, max_consecutive_failures 3 by default). CLI flags may
LOWER caps, never raise them — raising a cap is an owner edit to
approvals.yaml. There is no uncapped mode; stop conditions never live in the
prompt.

## Terminal states (exit code / --json state)

- `success` (0) — no pending tasks, gates green, chain valid.
- `budget_exhausted` (1) — iteration or wall-clock cap hit. Not an error:
  inspect `./scripts/agentic status` and journal, then run the loop again.
- `blocked` (1) — max_consecutive_failures reached; the failing task is marked
  blocked and `.agents/BLOCKED.md` is written.

## Recovering from BLOCKED.md

1. Read `.agents/BLOCKED.md`: failing task, last errors, gate output.
2. Diagnose by hand (a human or an interactive session) — the loop stopped
   precisely because unattended retries were thrashing.
3. Fix the cause or split/reword the task, set it back to pending via the
   tasks API, delete `.agents/BLOCKED.md`, journal what happened, re-run.

## Dry-run without an agent CLI

`./scripts/agentic loop --runner mock` with `AGENTIC_MOCK_SCRIPT=<shell cmd>`
executes your script in place of the agent (it simulates edits; stdout is the
"final text"). Use it to test caps, verification, and terminal states
hermetically before spending real tokens.
