# T-057 — Architecture periphery cleanup (review R2/R3/R4/R5)

2026-08-02

## What I did

`docs/final-status-review.md` flagged four small architecture-periphery
issues in its "Architecture periphery" section. Fixed all four:

**R2 — Worker deploy entry untested.** `src/workers/index.ts`
(`parseAllowedOrigins`, env wiring) and `src/workers/data.ts`
(`loadWorkerData`) were at 0% coverage while `app.ts` sat at 100%.
- Exported `parseAllowedOrigins` (was module-private) and added
  `src/workers/index.test.ts`: undefined/empty-string → `[]`, comma-split
  with whitespace trimming, single origin with no comma, and dropping
  empty entries from leading/trailing/doubled commas. Also two tests on
  the default export's `fetch` to confirm `ALLOWED_ORIGINS` from `env`
  actually reaches the handler (403 for a disallowed Origin; no-Origin
  request not rejected).
- Added `src/workers/data.test.ts`: `loadWorkerData()` returns the
  generated framework artifact unchanged, rehydrates
  `focusStore.versions`/`sampleCsv` as real `Map` instances whose entries
  match the source plain objects, passes the non-Map fields through
  unchanged, and is pure (repeated calls return equal-but-distinct Map
  instances — guards against accidentally sharing/mutating state across
  calls in a long-lived isolate).

**R3 — stale `endsWith("cli.js")` guard.** `src/crawlers/framework/cli.ts`
was the last of six entry points still using the fragile suffix check
`src/shared/direct-run.ts` was built to replace (npm's `.bin` symlink
mechanism gives `argv[1]` as the unresolved link path, not something
ending in `cli.js`). Swapped in `isDirectRunOf(import.meta.url)`, matching
`focus/cli.ts`, `focus/validate-cli.ts`, `focus/generate-cli.ts`, and both
servers' `main.ts`.

**R4 — duplicated `notFound()`.** The 16-line -32002 + nearest-match
resource-not-found helper was byte-identical in
`servers/framework/resources.ts` and `servers/focus/resources.ts`. Hoisted
into new `src/shared/mcp-not-found.ts`; both files now `import { notFound }
from "../../shared/mcp-not-found.js"` and dropped their now-unused
`McpError`/`nearestMatches` imports. No behavior change — confirmed by the
existing typo-pinning tests (`server.test.ts` in both servers, e.g.
"returns -32002 for concrete capability/persona typos too") passing
unmodified.

**R5 — dead code.** Deleted `parseOverview()` from
`crawlers/framework/parse/sections.ts` (grepped the whole repo: zero
callers, including in tests — there were no orphaned tests to remove,
contrary to the review's assumption that some existed) and its
now-unused `findHeading` import. Deleted the template `greet()` scaffold
from `src/index.ts`.

`tests/index.test.ts` only tested `greet()`, so it needed to change too.
This is a protected path (`approvals.yaml` `protected_paths` /
`agentic.config.json` `project.testGlobs`); the task's acceptance
criteria explicitly authorizes touching it ("tests/index.test.ts adjusted
or removed as part of this authorized cleanup"), so I ran `touch
.agents/.cache/policy-edit-ok` to get past the `protect-policy` hook.
Rewrote it (didn't delete it) to assert the real remaining content of
`src/index.ts`: that `createServer`/`SERVER_NAME`/`SERVER_VERSION` are
re-exported unchanged from `servers/framework/server.js`. Kept a file
there deliberately — `npx prettier --check tests` / `eslint tests` both
hard-fail with "no files matching" on an empty directory, and the
integrity gate separately flags outright deletion of a protected-path
test file ("Restore it or land the deletion as its own human-reviewed
change") — so "removed" wasn't actually viable without breaking the gate
commands themselves, which are out of scope for this task.

## Result

- `./scripts/agentic gates --tier all`: PASS on all bound gates (format,
  lint, typecheck, test, designs, integrity, memory, build); 402 tests,
  0 memory-lint warnings.
- Live-checked the coverage claim: the v8 text-table reporter doesn't
  print `src/workers/index.ts`/`data.ts` as individual rows when running
  just their two test files (a cosmetic reporter quirk — other 100%-line
  files print fine elsewhere in the full run), but I pulled the raw
  `coverage-final.json` for that run directly and confirmed 6/6 and 3/3
  statements plus 4/4 and 1/1 functions covered respectively — actually
  100%, not a real gap. The `coverage` gate itself is optional/unbound in
  this repo (`SKIP coverage (optional gate has no command bound)`), so
  this doesn't affect gate results either way.
- Ran the narrower test files directly too:
  `npx vitest run src/workers/index.test.ts src/workers/data.test.ts
  src/crawlers/framework/parse/sections.test.ts src/servers/framework/server.test.ts
  src/servers/focus/server.test.ts` → 123/123 passed.

## Next steps

- T-058 (derive-pipeline idempotence test) and T-059 (demo under the
  format gate — needs an owner-approved task since `agentic.config.json`
  is protected) are next in the post-launch backlog.
- No prompt/resource/tool surface changed here, so `docs/mcp-surface.md`
  does not need regenerating.
