---
name: handoff
description: End-of-session handoff - rewrite .agents/memory/activeContext.md and append a journal entry so the next fresh-context session can resume without re-discovery. Use when ending a session, when asked to "hand off", "wrap up", or "save state", or before context runs out mid-task. Do not use for general memory curation (use update-memory) or mid-task note-taking.
---

# handoff — leave the campsite legible

The next session starts with zero context; these two files are all it gets
beyond git history. Write for that reader.

## 1. Rewrite `.agents/memory/activeContext.md` (overwrite, keep the format)

- **In flight:** what was being worked on and its exact state — including
  half-done work: which files are touched, what compiles, what doesn't.
  Name the task id if one is started.
- **Next steps:** ordered, concrete, small. The first step should be
  executable without any archaeology ("run X, it currently fails with Y").
- **Open questions:** anything the next session must not silently re-decide.
- **Last updated:** ISO date + who/what this session was.

## 2. Write your session file in `.agents/journal/` (never edit another session's file)

Name it `YYYYMMDD-<slug>.md` (see `.agents/journal/README.md`); create it if
this session hasn't journaled yet, append to it if it has.

```
## <ISO date> — <actor/session description>
- did: ...
- result: ... (gate status, commit sha if any, observed behavior)
- next: ...
```

## 3. Leave the working tree honest

- Preferably: commit completed work (gates green first) so state lives in git.
- If work is incomplete, say so explicitly in activeContext.md — never commit
  broken work as if done, and never complete a task without evidence.
- If a started task cannot proceed, `./scripts/agentic tasks block <id>
  --reason "..."` rather than leaving it silently in_progress.

## 4. Sanity check

`./scripts/agentic status` — confirm task states and journal tail reflect
reality. Run `./scripts/agentic memory lint` if you edited MEMORY.md too.
