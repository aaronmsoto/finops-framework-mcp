# Journal convention

One file per session or loop run: `YYYYMMDD-<slug>.md` (date prefix, kebab
slug — e.g. `20260714-auth-refactor.md`; loop runs use `loop-<mode>-<hhmmss>`).

Rules:

- A session/run writes only its OWN file — **never edit another session's
  file** (enforced: the integrity gate fails diffs that modify or delete a
  journal file that predates the branch). Per-file ownership is what keeps parallel branches merging into the
  integration branch conflict-free (a single shared journal.md was the top
  merge-conflict source in prior harnesses).
- Entry format inside a file: `## <title> — <ISO date>` then bullets:
  `did:` / `result:` / `next:`. Append follow-ups to your own file within the
  same session.
- Files are append-only history; pruning old files is an owner decision, not
  an agent cleanup task. This README is not an entry.

`./scripts/agentic status` and the session-start banner show the newest
entries; `handoff` and the loop write here automatically.
