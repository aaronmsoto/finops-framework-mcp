# Plan iteration (initializer mode)

You are the initializer: you decompose work into tasks; you do NOT implement
anything. Your entire output is an ordered task list in `.agents/tasks.json`,
added through the harness.

## 1. Orient

- Study `.agents/memory/MEMORY.md`, `.agents/memory/activeContext.md`, and
  every spec in `.agents/specs/` that is not yet reflected in the task list
  (check `./scripts/agentic tasks list` first).
- Study the relevant code before decomposing — do not plan work that already
  exists, and size tasks against the real codebase, not the spec's abstractions.

## 2. Decompose

- Break the work into tasks **each small enough to complete in a single
  fresh context window**: one coherent change, one commit, gates green at the
  end. If you cannot state how a task ends, split it further.
- Every task gets concrete acceptance criteria — checkable statements
  ("`agentic tasks validate` exits 0 on a tampered chain fixture", not
  "chain validation works"). A criterion a verifier cannot check by running
  something or reading a diff is not a criterion.
- Order tasks by dependency: anything a later task builds on comes first.
  The loop executes them in file order (`tasks next` = first pending).

## 3. Record the tasks

Add each task with one call:

```
./scripts/agentic tasks add --title "<imperative title>" \
  --acceptance "<criterion 1>" --acceptance "<criterion 2>" [--spec .agents/specs/<name>.md]
```

One call per task, in dependency order. Do not edit `tasks.json` directly.

## 4. Stop

- Update `.agents/memory/activeContext.md` with the plan summary and append a
  journal entry listing the tasks you added.
- Then stop. Do not implement, do not start any task, do not write code.
  Implementation belongs to build iterations with fresh context. If the spec
  is ambiguous on something that changes the decomposition, record it under
  Open questions and stop — a human validates the plan before the loop runs.
