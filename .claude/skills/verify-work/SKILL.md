---
name: verify-work
description: Evidence-based verification before claiming any nontrivial change is done - run gates, run the changed behavior, cite output, and get an independent reviewer verdict. Use before completing a task, before /ship, or when asked to "check/verify" a change. Do not use as a substitute for writing tests, or on trivial changes (typo/doc fixes) where gates alone suffice.
---

# verify-work — done means demonstrated, not asserted

A change is not done because the code looks right. It is done when gates pass
AND the affected behavior has been executed and observed. Claims without
evidence are rejected by the independent verifier and break trust in the chain.

## 1. Deterministic checks

- `./scripts/agentic gates` — all fast-tier gates green. Cite the summary.
- `./scripts/agentic verify [--task <id>]` — gates + hash chain + acceptance
  criteria present + clean working tree, exactly what CI checks.

## 2. Run the behavior

- Changed a CLI command? Run it (including at least one failure path) and
  capture the output.
- Changed a function/module? Run its tests; where practical exercise it
  directly (`node -e`, a scratch invocation) with a non-happy-path input.
- Changed docs/config only? Confirm consumers still parse/build it.
- Evidence = command + observed output, quoted. "Tests should pass" is not
  evidence; a pasted passing run is.

## 3. Check each acceptance criterion

Walk the task's acceptance list one by one; attach the specific evidence for
each. Any criterion without evidence means the task is not done — keep working
or block it honestly.

## 4. Independent verdict (writer never grades own work)

For nontrivial changes, invoke the `reviewer` subagent with the task id,
acceptance criteria, and commit sha. It re-reads the diff, re-runs gates, and
returns `VERDICT: pass|fail`. A fail is information, not an insult: fix the
findings and re-verify.

## Boundaries

- Never make verification pass by weakening it: no test edits, no `.only`,
  no gate-config changes — the integrity gate diffs for these.
- Verification never mutates task state; completing is `./scripts/agentic
  tasks complete <id> --summary "..."` and happens only after this protocol.
