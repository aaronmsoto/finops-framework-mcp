---
name: instantiate-project
description: Create a new project from this template into a separate target repository the session also has access to (cloned side by side). Use when asked to instantiate, bootstrap, init, or set up a new project/derivative from this template in another repo. Do not use for initializing THIS clone in place (run ./scripts/agentic init directly) or for template development work.
---

# instantiate-project — template → new repo, end to end

The canonical runbook is `.agentic/INSTANTIATE.md`. Read it and follow it
verbatim — this skill only frames the session around it.

## Before you start

0. Sanity-check that THIS repo is actually the template: the root
   `package.json` name must be `agentic-starter-repo`. If it is not, stop —
   you are in a derivative (init removes this skill, but if you are reading
   it anyway, do not template a derivative).
1. Confirm the target repository is present on disk and resolve absolute
   paths for `$TEMPLATE` (this repo) and `$TARGET`. If the target is not
   available in this session, stop and ask the owner to connect/clone it.
2. Gather the init parameters — project name, preset
   (`typescript`|`python`), owner `@handle`, branching mode, root LICENSE
   choice (plus the copyright holder's legal name for mit/apache-2.0) —
   from the conversation. Ask for whatever is missing; never guess the
   owner handle or the holder name.

## Execute

Work through `.agentic/INSTANTIATE.md` steps 0-7 in order. Rules that
matter most while doing it:

- Copy with `git archive`, never `cp -r` (step 1 explains why).
- Verify gates exit 0 in the target before the init commit (step 5); the
  integrity gate's skip notice on a fresh repo is expected.
- No AI attribution in any commit — the stripping hooks are not wired
  until bootstrap runs, so comply by hand in steps 1-2.
- The genesis push to the target's main is allowed exactly once (step 6).

## Report

Finish with the owner handoff from step 7: what was created, gate/validate
evidence, and the owner-only GitHub wiring checklist. Do not attempt those
GitHub settings yourself.
