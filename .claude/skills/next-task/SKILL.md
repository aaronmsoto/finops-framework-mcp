---
name: next-task
description: Protocol for picking up and completing exactly one tracked task from .agents/tasks.json, with gates and evidence. Use when starting tracked work, when asked to "do the next task" or "continue the task list", or at the start of a work session with pending tasks. Do not use for planning/decomposing work (use plan-feature), for untracked one-off fixes, or when a task is already in progress in this session.
---

# next-task — one task, gates green, evidence recorded

## Select

1. Orient first if you have not: `.agents/memory/MEMORY.md`,
   `.agents/memory/activeContext.md`, journal tail, `git log --oneline -10`.
2. `./scripts/agentic tasks next` — shows the first pending task.
3. `./scripts/agentic tasks start <id>` — claim it. Exactly one task per
   session; never start a second one here.

## Implement

- Study the acceptance criteria and spec (if referenced) before editing.
- Search the codebase before writing — do not re-implement existing code.
- Smallest correct change that satisfies every criterion. No placeholders.
- Scope fence: no other tasks, no drive-by refactors, no protected-path edits
  (approvals.yaml `protected_paths`) unless the task explicitly authorizes it.

## Verify

- `./scripts/agentic gates` until green. Never weaken tests or gate configs
  to pass — the integrity gate and independent verifier catch this.
- For behavior changes, run the affected behavior and note what you observed.
- Use the `reviewer` subagent (or /verify-work) for independent verification
  before claiming done on nontrivial changes.

## Record and complete

1. Update `.agents/memory/activeContext.md`; write your session file in `.agents/journal/`
   (did / result / next).
2. Commit once: imperative subject <= 72 chars, body says why. Do not push to
   main or merge — those are human approval points.
3. `./scripts/agentic tasks complete <id> --summary "<one-line evidence>"` —
   this re-runs gates and extends the hash chain. Never hand-edit tasks.json.

## If stuck

After honest attempts: journal the blocker (what you tried, exact error,
decision needed), then `./scripts/agentic tasks block <id> --reason "..."`
and stop. Do not thrash or start another task.
