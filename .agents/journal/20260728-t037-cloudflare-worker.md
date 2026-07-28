# T-037 — Cloudflare Worker serving both MCP servers over HTTPS

Task: T-037 (`.agents/specs/focus-mcp-v1.md`, "Packaging / worker / demo").
Loop-build session, single task.

## What I did

- `src/workers/app.ts`: `createFetchHandler(opts)` factory. Routes
  `/mcp/framework` and `/mcp/focus`, building a fresh `McpServer` +
  `WebStandardStreamableHTTPServerTransport` (`sessionIdGenerator:
  undefined`, `enableJsonResponse: true`) per request. Origin check: a
  request with no `Origin` header is always allowed (non-browser MCP
  clients send none); a present-but-unlisted `Origin` gets 403 before any
  server work happens. Unknown paths 404; unsupported HTTP methods 405 (the
  SDK transport's own `handleUnsupportedRequest` — verified this is what
  actually returns the 405, not something I needed to add).
- `src/workers/index.ts`: the real Worker entry (`wrangler.toml`'s `main`).
  Loads both data artifacts once per isolate (module scope) via
  `src/workers/data.ts`, reads `ALLOWED_ORIGINS` from an env/`[vars]`
  binding (comma-separated), and builds the handler per request from that.
- `src/workers/data.ts`: fs-free assembly. Imports the two generated data
  modules and rehydrates `FocusStore`'s two `Map` fields (`versions`,
  `sampleCsv`) from the plain objects the bundler emits (`new
  Map(Object.entries(...))`) — Maps aren't JSON-representable, so the
  bundler serializes them as objects and this is the one place that
  reverses it.
- `scripts/bundle-worker-data.mjs`: build-time bundler. Reuses
  `loadArtifact`/`loadFocusStore` from `dist/shared/index.js` (same ajv
  schemas + manifest sha256 checks the stdio servers rely on — no separate
  ajv dependency needed at runtime in the worker), then writes
  `src/workers/generated/framework-artifact.ts` and `focus-store.ts` as
  typed TypeScript modules (`import type` + a typed `const` + `export
  default`) and self-formats them with prettier so a re-run never breaks
  the format gate. Added `npm run bundle:worker` (`build && node
  scripts/bundle-worker-data.mjs`).
- `wrangler.toml`: `main = "src/workers/index.ts"`, `compatibility_flags =
  ["nodejs_compat"]` (needed for `shared/tools.ts`'s `node:crypto` cursor
  hashing, unrelated to the data path), `[vars] ALLOWED_ORIGINS = ""`
  default.
- `docs/deploy-worker.md`: owner-only checklist (regenerate bundle →
  configure allowlist → `wrangler login` → `wrangler deploy` → curl smoke
  test for both routes + the 404/403/405 cases → rollback via `wrangler
  deployments list`/`rollback`). Explicit that nothing in this repo's
  automation runs `wrangler deploy` — deploying is a human approval point.

## The node:fs problem (the actual hard part)

The acceptance criterion "no node:fs reachable from src/workers/index.ts"
looked trivial until I actually traced the import graph: `server.ts` for
both MCP servers only imports fs-free sibling modules directly (`type
Artifact`/`type FocusStore` from `../../shared/index.js` is `import type`,
erased at compile time — fine). But `src/servers/{framework,focus}/tools.ts`
and `resources.ts` imported `nearestMatches` (framework/resources.ts also
`ALL_MATURITY_LEVELS`/`OFFICIAL_MATURITY_LEVELS`) from the
`../../shared/index.js` **barrel** — and that barrel does `export * from
"./artifact.js"` and `export { loadFocusStore } from "./focus/artifact.js"`,
both of which `import { readFileSync } from "node:fs"` at module top level.
Per ESM semantics, importing *any* named export from a module statically
loads that module's entire own import graph — so even though `nearestMatches`
itself lives in the fs-free `slugs.ts`, importing it via the barrel dragged
`node:fs` in regardless. This is the same barrel-entanglement already
flagged as an open question from T-036 (dist/shared/focus/* shipping in the
framework tarball) — same root cause, different acceptance criterion.

Fix: changed the four import sites to import `nearestMatches` directly from
`../../shared/slugs.js` and the maturity constants from
`../../shared/types.js` (both confirmed fs-free by direct inspection — no
imports at all in slugs.ts; `types.ts` only imports nothing relevant). Pure
import-path change, no behavior change — confirmed by `npx tsc -p
tsconfig.build.json --noEmit` passing cleanly both before and after, and
the full test suite passing identically.

## Verifying the check isn't vacuous

`src/workers/fs-boundary.test.ts` walks the real import graph from
`src/workers/index.ts`, following non-type-only `import ... from` **and**
`export ... from` statements (re-exports matter — that's exactly the
barrel's own shape: `export * from "./x.js"`). I deliberately proved this
by reverting the `tools.ts` fix mid-session and re-running the test: it
failed with the exact chain `index.ts -> app.ts -> servers/framework/
server.ts -> servers/framework/tools.ts -> shared/index.ts ->
shared/artifact-loader.ts -> node:fs`, which is exactly the barrel path
described above. Re-applied the fix and the test passed. Without that
deliberate-break-then-fix step I would have shipped a test that (before I
added `export` matching) passed vacuously — my first regex only matched
`import ... from`, silently missing the barrel's `export * from` shape,
and the test passed even with the bug present. A second "sanity" test in
the same file guards against this class of vacuous-pass bug going forward:
it asserts the walk actually reaches `servers/{framework,focus}/tools.ts`.

## Generated data files: committed, not gitignored

`src/workers/data.ts` imports the two generated modules as real (non-type)
values — `tsc --noEmit` needs them to exist as real files for module
resolution to succeed at all, unlike `dist/` (which nothing in `src/` ever
imports back from). Gitignoring them the way `dist/` and
`packages/*/data/` are gitignored would break `typecheck`/`build` gates on
a fresh clone unless something regenerates them first, and there's no
existing hook point for that. Committed them instead (~2MB total,
comparable to `data/framework`/`data/focus` themselves already being
committed) and added `src/workers/bundle-data.test.ts`, which re-derives
both shapes straight from `data/framework`/`data/focus` via the same
loaders and asserts `toEqual` — so a `data/` change without a re-run of
`npm run bundle:worker` fails CI instead of silently shipping stale worker
data.

## Result

- Gates: `--tier all` PASS (format/lint/typecheck/test 354 passed
  [341 pre-existing + 13 new: 11 app.test.ts + 2 fs-boundary.test.ts, plus
  2 bundle-data.test.ts = 15 new, 339 prior]/coverage-skipped/designs/
  integrity/memory/build).
- Observed behavior: ran `npx vitest run src/workers/` directly — 3 test
  files, 15 tests, all passed, including the 403/404/405 edge cases and
  initialize/tools-list/tools-call on both `/mcp/framework` and
  `/mcp/focus` with native `Request` objects (no wrangler involved, per
  spec).
- Independent verification: dispatched the `reviewer` subagent (fresh
  context). It traced the import graph by hand, ran gates and the worker
  test suite itself, and confirmed every acceptance criterion — it also
  correctly flagged (before I committed) that nothing was committed yet
  and the task record wasn't closed, which this commit + `tasks complete`
  resolves.

## Next

T-038 (static demo web app) can point its endpoint config at this worker's
`/mcp/framework` + `/mcp/focus` routes and reuse
`evals/focus/combined-scenario.xml`'s step sequence. Deploying the worker
itself remains an owner action per `docs/deploy-worker.md`.
