# Build iteration

You are one fresh-context iteration of a supervised loop. You have no memory of
previous iterations; the files and git history below are your memory. The harness
independently verifies everything you do — your claims count for nothing, only
committed work that passes gates. Do the following steps in order.

## 1. Orient (do this before anything else)

- Study `.agents/memory/MEMORY.md` and `.agents/memory/activeContext.md`.
- Study the newest 2–3 files in `.agents/journal/` (dated per-session entries).
- Run `git log --oneline -10` to see what recent iterations actually did.

## 2. Select exactly one task

- Run `./scripts/agentic tasks next` to see the selected task, then
  `./scripts/agentic tasks start <id>` for that task and no other.
- If a concrete task footer is appended below this preamble, that is the task —
  it will match `tasks next`.
- Study the task's acceptance criteria and its spec (if it names one) before
  writing anything.

## 3. Implement only that task

- Search the codebase first. Do not assume something is unimplemented —
  previous iterations may have built part of it.
- Make the smallest correct change that satisfies every acceptance criterion.
  No placeholders, no stubs, no TODO-later — full implementations only.
- **Scope fence:** do not touch other tasks, do not refactor beyond what this
  task requires, do not "improve while you're in there," do not edit protected
  paths (see `approvals.yaml`) unless the task explicitly says so. If you
  notice adjacent problems, record them in the journal instead of fixing them.

## 4. Verify with gates

- Run `./scripts/agentic gates` and fix failures until every gate is green.
- **Never make gates pass by weakening them.** Do not delete or edit tests,
  loosen assertions, add `.only`/`fit`/`fdescribe`, skip tests, or touch gate
  definitions. The integrity gate diffs for exactly this and the independent
  verifier will fail your task. If a test is genuinely wrong, write why in the
  journal and leave it — fixing it is its own task.
- For behavior changes, also run the affected behavior itself and note what
  you observed; green gates plus observed behavior is the evidence standard.

## 5. Record

- Update `.agents/memory/activeContext.md` (overwrite: in flight, next steps,
  open questions, last updated).
- Write your session's journal file (`.agents/journal/YYYYMMDD-<slug>.md` —
  create it if this is your first entry; never edit another session's file): what you
  did, the result (gate summary, observed behavior), what should happen next.
- If you made a real decision with alternatives, append it to
  `.agents/memory/decisions.md`.

## 6. Commit

- One commit containing the task's changes plus the memory/journal updates.
- Imperative subject ≤ 72 chars; body says why. Do not push; do not merge.

## 7. Complete

- Run `./scripts/agentic tasks complete <id> --commit --summary "<one-line evidence>"`.
  This re-runs gates and extends the hash chain. Never edit `tasks.json` by
  hand — a hand-flipped status breaks chain validation and the iteration
  counts as failed.

## If you are genuinely stuck

After honest attempts (not on the first error): append the blocker to
your `.agents/journal/` session file — what you tried, the exact error, what a human should
decide — then run `./scripts/agentic tasks block <id> --reason "<one line>"`
and stop. Do not thrash, do not start a different task, do not weaken anything
to force progress. A clean blocked state is a successful outcome.
