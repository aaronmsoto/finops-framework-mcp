---
name: plan-feature
description: Effort-dial planning - decompose a feature into context-window-sized tasks with acceptance criteria via ./scripts/agentic tasks add, writing a spec first for large work (with a human checkpoint). Use when asked to plan, spec, or break down a feature or multi-task piece of work. Do not use for small single-change fixes (just do them), for executing tasks (use next-task), or to re-plan work already decomposed in tasks.json.
---

# plan-feature — spec (maybe) → tasks, then stop

## 1. Size the work (the effort dial — see .agents/specs/README.md)

- **Small** (one obvious change): stop — no plan needed, just implement it.
- **Medium** (2–5 tasks, no real design choices): skip the spec, go to step 3.
- **Large** (new subsystem, design decisions, unknowns): write a spec first.
- **Large with novel architecture or a new user-facing surface**: run
  `/design-feature` first — it produces the owner-reviewed design AND the spec;
  come back here after the owner approves.

## 2. Spec (large work only)

- Copy `.agents/specs/TEMPLATE.md` to `.agents/specs/<kebab-name>.md`; fill
  Problem / Outcome / Non-goals / Acceptance criteria / Open questions.
  One page max.
- **Human checkpoint (mandatory for large work):** present the spec and stop.
  Do not generate tasks until a human has validated it — an unvalidated spec
  makes the loop build the wrong thing fast.

## 3. Decompose

- Study the real code first; do not plan work that already exists.
- Each task: completable in ONE fresh context window, one commit, gates green
  at the end. If you cannot state how it ends, split it.
- Acceptance criteria are checkable statements (a command to run, a diff to
  see, behavior to observe) — not aspirations.
- Order by dependency; the loop runs first-pending-first.

## 4. Record

One call per task, in dependency order:

```
./scripts/agentic tasks add --title "<imperative title>" \
  --acceptance "<criterion>" --acceptance "<criterion>" \
  [--spec .agents/specs/<name>.md]
```

Never edit `.agents/tasks.json` directly. Confirm with
`./scripts/agentic tasks list` and `./scripts/agentic tasks validate`.

## 5. Stop

Update `activeContext.md`, journal the plan, and stop — no implementation in
the planning session. Execution belongs to fresh-context build iterations
(`/next-task` or `./scripts/agentic loop`).
