# .agents/journal/ — per-session progress journal

One file per session or loop run: `YYYYMMDD-<slug>.md` (local date prefix,
kebab-case slug, e.g. `20260714-fix-login-flow.md`). A session appends only
to its OWN file — never edit another session's file. Rationale: one shared
append-file constantly merge-conflicts between parallel agents; one file per
actor is conflict-free.

- This README is reserved for the convention doc and is never a journal entry.
- Entry format inside a file: `## <title> — <ISO timestamp>` sections with
  bullets covering did / result / next.
- Entries are append-only history; never rewrite them.
