---
name: update-memory
description: Curation protocol for the shared memory bank (.agents/memory/) within its lint budgets - what goes in each file, what to cut, when to append vs overwrite. Use after completing significant work, after making a decision with alternatives, when memory lint fails, or when asked to update/clean up memory. Do not use for session handoffs (use handoff) or for Claude's machine-local auto memory, which is separate.
---

# update-memory — curate, don't accumulate

The bank is `.agents/memory/` (committed, PR-reviewed, linted). Claude Code's
auto memory (`~/.claude/projects/...`) is your private scratch; this bank is
the shared record. Budgets are enforced: `./scripts/agentic memory lint` fails
the memory gate when MEMORY.md exceeds `coreBudgetLines` (200) or warns when
activeContext.md goes stale.

## Which file gets what

| File | Discipline | Content |
|---|---|---|
| `MEMORY.md` | Overwrite/edit; 200-line hard budget | Project facts, invariants, current phase. The test: would removing this cause an agent to make a mistake? If not, cut it. |
| `decisions.md` | **Append-only** | Real decisions with alternatives: date, decision, why, alternatives considered. Supersede old entries with new ones; never rewrite history. |
| `patterns.md` | Edit in place | Conventions agents must follow that are not inferable from the code itself. |
| `activeContext.md` | Overwrite whole file | Current truth only: in flight / next steps / open questions / last updated. History belongs in `.agents/journal/`. |

## Protocol

1. Run `./scripts/agentic memory lint` first to see current budget state.
2. Add the new fact/decision/pattern to the right file per the table.
3. For every line added to MEMORY.md over budget pressure, remove a weaker
   line: stale phases, facts now inferable from code, resolved gotchas.
4. Never delete decisions.md entries or `.agents/journal/` files — supersede or leave them.
5. Re-run `./scripts/agentic memory lint`; commit memory updates with the
   related work (or standalone with subject "Update agent memory: <what>").

## Exclusions

Do not record: anything inferable from the code, standard language
conventions, API docs, secrets, or frequently-changing state (that is
activeContext.md's job, and only the current snapshot).
