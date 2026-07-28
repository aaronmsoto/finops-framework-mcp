# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

focus-spec-mcp v1 build loop (`.agents/specs/focus-mcp-v1.md`, tasks
T-027..T-038) is underway. **All of T-027..T-038 are now DONE** — this was
the last task in the batch.

T-038 this session: static demo web app (`demo/`) for the combined
Rate Optimization walkthrough — capability → featured KPIs →
`get_kpi_mapping` (FOCUS columns per version, 1.0 and 1.2) →
`compare_versions` → `calculate_kpi` per featured KPI, against the T-037
Worker's `/mcp/framework` + `/mcp/focus` routes. No build step: plain ESM
`.js` files (`demo/config.js` — the one endpoint-config object;
`demo/requests.js` — pure JSON-RPC request-body builders, no fetch/DOM,
mirrors `evals/focus/combined-scenario.xml` steps 1-5 which that file's own
header says doubles as this demo's source script; `demo/client.js` — thin
`fetch()` wrapper; `demo/app.js` — the browser driver, which reads step 2's
`featured_kpis` at runtime rather than hardcoding the KPI list, so the
walkthrough is a real capability→KPI→column→calculate chain, not a canned
script) plus `demo/index.html`. `demo/requests.d.ts` is a hand-written
ambient-types shim (TS resolves a sibling `.d.ts` for a same-named `.js`
without `allowJs`) so `src/workers/demo-requests.test.ts` gets real types
without pulling `demo/` into tsconfig's `include` (format/lint/typecheck
gates are `src tests`-scoped, so `demo/`'s plain JS is untouched by them —
confirmed against `agentic.config.json`/`tsconfig.json` before relying on
it). That test imports `demo/requests.js` directly and drives the exact
request bodies through T-037's `createFetchHandler` with the real
`data/framework`/`data/focus` fixtures, asserting against
combined-scenario.xml's fixture numbers (ESR 26.552972346576816%, etc.) —
all matched on first run, no drift since that eval was written. Also ran a
throwaway (uncommitted, scratchpad) Node script standing up a real
`http.createServer` in front of the same handler and driving
`demo/client.js`'s actual `fetch()` calls over a real socket end-to-end, as
the closest substitute for a browser in this headless environment.
`docs/deploy-demo.md`: owner checklist (point `demo/config.js` at the
deployed Worker → add the demo's deployed origin to the Worker's
`ALLOWED_ORIGINS` → `wrangler pages deploy demo` → smoke test → rollback).
Gates green (`--tier all`). Full detail:
`.agents/journal/20260728-t038-demo-webapp.md`.

T-037 (earlier session): Cloudflare Worker (`src/workers/`) serving both MCP
servers over HTTPS. `src/workers/app.ts` exports `createFetchHandler` — a
factory routing `/mcp/framework` + `/mcp/focus`, building a fresh
`McpServer` + `WebStandardStreamableHTTPServerTransport`
(`sessionIdGenerator: undefined`, `enableJsonResponse: true` — stateless)
per request, plus an Origin allowlist (absent Origin always allowed;
present-but-unlisted → 403 before any server work). `src/workers/index.ts`
is the actual Worker entry (`wrangler.toml`'s `main`): loads both data
artifacts once per isolate via `src/workers/data.ts` and reads
`ALLOWED_ORIGINS` from a `[vars]`/env binding. `scripts/bundle-worker-data.mjs`
is the build-time bundler — reuses `loadArtifact`/`loadFocusStore` from
`dist/shared/` (same ajv schema + manifest sha256 validation the stdio
servers use, so no separate ajv dependency needed in the worker bundle) and
re-emits the two artifacts as committed TypeScript modules under
`src/workers/generated/` (`framework-artifact.ts` is the `Artifact` object
literal as-is; `focus-store.ts` serializes `FocusStore`'s two `Map` fields
— `versions`, `sampleCsv` — as plain objects, since Maps aren't
JSON-representable; `data.ts` rehydrates them into real `Map`s at read
time). The bundler self-formats its output with prettier so re-running it
never breaks the format gate.

Key fix required to satisfy "no node:fs reachable from src/workers/index.ts":
`src/servers/{framework,focus}/tools.ts` and `resources.ts` imported
`nearestMatches` (and, in framework/resources.ts, `ALL_MATURITY_LEVELS`/
`OFFICIAL_MATURITY_LEVELS`) from the `../../shared/index.js` **barrel**,
which does `export * from "./artifact.js"` / `export { loadFocusStore }
from "./focus/artifact.js"` — both of which import `node:fs` at module top
level. ANY import from the barrel (even of an fs-free name) pulls the
whole barrel's static import graph in per ESM semantics. Fixed by importing
`nearestMatches` directly from `../../shared/slugs.js` and the maturity
constants from `../../shared/types.js` (both genuinely fs-free) in all four
files — no behavior change, pure import-path fix. `src/workers/fs-boundary.test.ts`
statically walks the real import graph from `src/workers/index.ts`
(following non-type-only `import`/`export ... from` statements — re-exports
matter because that's exactly the barrel's own shape, and a naive
`import`-only regex would silently miss it, verified by deliberately
reintroducing the barrel import and confirming the test failed with the
exact chain before re-fixing it) and fails if anything resolves to
`node:fs`; a second "sanity" test in the same file guards against the walk
passing vacuously by asserting it actually reaches
`servers/{framework,focus}/tools.ts`. `src/workers/bundle-data.test.ts`
guards the two committed generated files against drifting from
`data/framework`/`data/focus` (re-derives via the same loaders, `toEqual`).
`src/workers/app.test.ts` drives initialize/tools-list/tools-call on both
routes with native `Request` objects (no wrangler), plus 403 (unlisted
Origin)/404 (unknown path)/405 (unsupported method, via the transport's own
handling). `wrangler.toml`: `main = "src/workers/index.ts"`,
`compatibility_flags = ["nodejs_compat"]` (needed for `shared/tools.ts`'s
`node:crypto` cursor hashing — unrelated to the fs-free data path),
`[vars] ALLOWED_ORIGINS = ""` default. `docs/deploy-worker.md`: owner
checklist (regenerate bundle → configure allowlist → `wrangler login` →
`wrangler deploy` → curl smoke test → rollback). Independently verified by
the `reviewer` subagent (traced the import graph by hand, ran gates and the
worker test suite directly). Gates green (`--tier all`: format/lint/
typecheck/test 354 passed/coverage/designs/integrity/memory/build all
pass). Full detail: `.agents/journal/20260728-t037-cloudflare-worker.md`.

T-036 (earlier session): `packages/focus-spec-mcp/` publish shim. See
`.agents/journal/20260728-t036-focus-pack-shim.md` for detail.

T-035 (earlier session): eval design (`evals/focus/`), no source changes.
See `.agents/journal/20260728-t035-focus-eval-suite.md`.

Earlier (T-027..T-034, condensed): T-029 ingested FOCUS spec text for
versions 1.0/1.2 into `data/focus/`; T-030 built `src/servers/focus/` (the
version-aware FOCUS stdio server, mirrors `src/servers/framework/`'s module
layout); T-031 built `src/shared/focus/validate.ts` + official 1.0 sample
fixture; T-032 built the seeded synthetic FOCUS CSV generator; T-033 added
the unofficial KPI-to-FOCUS-column mapping (`get_kpi_mapping`); T-034 added
`calculate_kpi` over bundled sample data (formula registry for 9 of ~18
mapped KPIs). Full detail in git history and `.agents/journal/`.

## Next steps

1. **T-027..T-038 are all DONE.** Next: critique gate #4
   (`docs/critique-4-focus-gate.md`) per the spec's v1 acceptance-criteria
   list — this is the last unchecked item in that list before the batch is
   considered fully shipped (data artifact/refresh-idempotence checks,
   server test coverage incl. cross-version cursor rejection, sample
   validator pass, KPI-mapping cross-validation, evals ≥9/10 + combined
   scenario pass, tarball/worker acceptance checks). Most of these already
   have evidence scattered across T-027..T-038's journals/tests; critique
   gate #4 is where that gets assembled and any remaining BLOCKERs found.
2. Open PR (branch → dev) for the harness fix batch (T-025/T-026) + v1.1
   mini-batch once critique gate #4 closes out.
3. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release) —
   T-036 gives `packages/focus-spec-mcp/` a second, independent publish
   target (own `server.json`, own version line) alongside root.
4. Owner: deploying the Cloudflare Worker (T-037) and the demo (T-038) are
   both human approval points — `docs/deploy-worker.md` and
   `docs/deploy-demo.md` have the checklists; nothing in this repo's
   automation runs `wrangler deploy` or `wrangler pages deploy`.
5. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
6. Owner: install docs/proposed/refresh-data.yml per its checklist.

## Open questions

- `dist/shared/focus/*` (schemas/types only, a few KB) ships in the
  framework tarball, and `dist/shared/md.ts` (crawler-only, unused at
  runtime by either server) ships in the focus tarball — both are
  consequences of `src/shared/index.ts`'s `export *` barrel, which every
  server/crawler entry point imports from and which ESM evaluates in full
  regardless of which name is destructured. T-037 worked around the same
  root cause for the worker (see "In flight" above) by importing specific
  fs-free modules directly instead of the barrel in the four affected
  server files — but the barrel itself is unchanged, so any *new* server
  code that imports a real (non-type) binding from `shared/index.js` can
  silently reintroduce fs-reachability; `src/workers/fs-boundary.test.ts`
  will catch it if that new code is itself reachable from
  `src/workers/index.ts`, but won't catch it otherwise. Splitting the
  barrel so each server's tarball/bundle carries only the shared code it
  actually uses would be a real (multi-file) refactor, out of scope for
  T-037's worker-only mandate.
- Root `NOTICE.md` has no attribution section for the FOCUS spec text
  itself (data/focus/{1.0,1.2}/, ingested T-029) — only the T-031 sample
  fixture is covered. Should be added (mirrors the FinOps Framework
  section) but is out of scope for the tasks that found the gap.
- `validateFocusCsv` (T-031) can't validate a JSON-typed column that also
  declares `allowed_values` as embedded-key names rather than literal
  values (today: 1.2's `SkuPriceDetails`, per KeyValueFormat) — the
  generator works around it by always emitting null (decisions.md
  2026-07-28); a future task could teach the validator to parse
  KeyValueFormat keys against the enum instead.
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind FINOPS_MCP_EXPERIMENTAL.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); refresh-
  workflow GITHUB_TOKEN/CI caveats mirror the template's item 3; NEW —
  supervising sessions must not commit a live loop's in-flight tasks.json
  (stop-hook lesson, journal 20260723-harness-improvements-session.md).

## Last updated

2026-07-28 — T-038 done (static demo web app + demo-vs-worker-handler Node
test + deploy doc); focus-mcp-v1's T-027..T-038 task batch is now complete.
