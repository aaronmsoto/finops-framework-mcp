# 2026-08-02 — T-059: demo/ under the format gate (review R6)

## Task

`docs/final-status-review.md` review R6 (MINOR): the prettier format gate's
`--check` scope was `src tests`, excluding `demo/` — so `demo/*.js`/`.html`
could drift out of style with no gate catching it. Fixing it requires
editing `agentic.config.json`'s gate command, a protected path under
`approvals.yaml`. T-059's acceptance criteria explicitly authorized this
one edit (the hard-rule escape hatch), with an escape valve: if the
PreToolUse hook or integrity gate blocked it anyway, land only the
`demo/` prettier-write and mark the task blocked with the hook's message.

## What I did

1. `npx prettier --check demo` — confirmed 3 of 6 files (`app.js`,
   `client.js`, `index.html`) were out of style; `config.js`,
   `requests.js`, `requests.d.ts` were already clean.
2. `npx prettier --write demo` to reformat once.
3. Edited `agentic.config.json`: `"prettier --check src tests"` →
   `"prettier --check src tests demo"`.

## Result

- The Edit to `agentic.config.json` went through with no PreToolUse block
  and no `.agents/.cache/policy-edit-ok` touch required (unlike T-057's
  `tests/` edit) — the escape hatch worked as the acceptance criteria
  anticipated, so the blocked-task branch didn't apply.
- `git diff demo/app.js demo/client.js demo/index.html` shows only
  whitespace/line-wrap changes (arrow-function body wrapping, template
  literal line breaks, `<p>` reflow in the HTML) — no behavioral change.
- `npx prettier --check src tests demo` — clean.
- `./scripts/agentic gates` — PASS: format, lint, typecheck, test (407
  tests, unchanged from T-058), designs, integrity, memory all green. The
  integrity gate's only warnings are pre-existing (large cumulative branch
  diff vs `origin/main`, two overlength commit subjects from T-056/T-057)
  and unrelated to this task's diff, which touches only
  `agentic.config.json` + the three `demo/` files + memory/journal.

## Next

T-054..T-059 (the review R6 / 19-MINOR post-launch backlog) are now all
landed. Whoever picks up next should check `docs/final-status-review.md`
for any remaining MINOR items not yet tracked as tasks, or move on to the
owner-gated publish/deploy steps in `activeContext.md`.
