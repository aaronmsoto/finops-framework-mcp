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

**T-052 done** (2026-08-02, this session): fixed the three MCP-protocol
polish items from `docs/final-status-review.md` MCP-1/2/3.
- **MCP-1 (pagination text parity)**: `search_framework`, `list_capabilities`
  (framework/tools.ts) and `list_columns`, `search_focus` (focus/tools.ts)
  now append a `Showing X of Y — pass cursor: "..." for more.` note to their
  TEXT block whenever `nextCursor` is present, matching the pattern
  `get_kpis` already had. No note when the page is unpaginated (full
  results, no `nextCursor`). Added dedicated tests in both
  `server.test.ts` files (`limit` small enough to force a `nextCursor`,
  plus an assertion that a full unpaginated call carries no "Showing" text).
- **MCP-2 (Worker GET/DELETE)**: `src/workers/app.ts` now short-circuits
  `GET`/`DELETE` on `/mcp/framework` and `/mcp/focus` with `405` +
  `Allow: POST, OPTIONS` before the request ever reaches
  `WebStandardStreamableHTTPServerTransport` (previously GET opened an
  eternal silent SSE stream since the transport is stateless — no session
  ever has anything to relay — and DELETE returned 200 for a session that
  never existed). CORS `Access-Control-Allow-Origin` still applied to the
  405 response. GET on an unrelated path (e.g. `/mcp/unknown`) still 404s
  as before — the short-circuit only fires for the two known MCP routes.
  Added 4 new `app.test.ts` cases (GET 405+Allow, DELETE 405+Allow, ACAO
  on the 405, unknown-path GET still 404).
- **MCP-3 (listChanged doc mismatch)**: the SDK's `McpServer` hardcodes
  `listChanged: true` in `registerCapabilities` for tools/resources/prompts
  the moment any handler is registered (confirmed by reading
  `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` — no
  option suppresses it), so the fix is doc-only. Corrected the stale
  `framework/server.ts:20-23` comment (previously claimed "without ...
  listChanged") to match the already-accurate `docs/architecture.md` §5.5
  wording, and added the equivalent comment to `focus/server.ts` (which had
  none before).
- Verified: `./scripts/agentic gates --tier all` all green (format, lint,
  typecheck, 385 tests incl. the new ones, designs, integrity, memory,
  build). Ran the new/changed tests directly first
  (`vitest run src/servers/framework/server.test.ts
  src/servers/focus/server.test.ts src/workers/app.test.ts`) — 20+101
  tests passed before the full gate run.
- Remaining backlog: T-053..T-059 queued (git log); rest of the 19-MINOR
  list in `docs/final-status-review.md` still open (MEMORY.md refresh,
  derive-pipeline integration test, worker index/data tests,
  `combined-scenario.xml` step-4 fix, SECURITY/CONTRIBUTING, npm metadata).

**T-051 done** (2026-08-02, earlier this session): fixed the three
tool-description issues from `docs/final-status-review.md` TN-1/2/3.
- `list_capabilities` (framework/tools.ts) no longer says "domain slug or
  persona slug" prose — now names the exact params `domain`/`persona` with
  example values, and the "22" count is interpolated from
  `artifact.capabilities.length`.
- `assess_maturity_path` (framework/tools.ts) now has `.describe()` on
  `capability`/`current_level`/`target_level` and cross-references
  `get_maturity_assessment` for the single/all-levels case.
- All four hardcoded corpus counts are now interpolated at registration
  time instead of string literals: framework `get_kpis` ("44"/"88" from
  `artifact.kpis`), focus `list_columns` ("43 in 1.0, 57 in 1.2" from
  `store.versions.get(v).columns.length` per version slug — same pattern
  `list_versions`/`DEFAULT_VERSION` already used), and focus
  `compare_versions` ("14 added, 0 removed, 43 changed" from
  `store.diff.*_columns.length`).
- Verified live via an in-memory MCP client (`InMemoryTransport`) against
  the built `dist/`: `list-tools` descriptions match; interpolated counts
  equal the previously-hardcoded literals exactly (44/88, 43/57, 14/0/43);
  `list_capabilities({domain: "understand-usage-and-cost"})` returns 4
  capabilities with correct prose. Gates green (`./scripts/agentic gates`).
- Remaining backlog: T-052..T-059 queued (see git log); 19-MINOR list in
  `docs/final-status-review.md` mostly still open.

**v1 close-out is COMPLETE on `claude/session-k75rxy`; publish is
owner-gated.** State as of 2026-08-02:

- FOCUS build batch T-027..T-038 (12/12) + critique gate 4
  (`docs/critique-4-focus-gate.md`, SHIP-after-fixes, 2 BLOCKER / 8 MAJOR /
  5 MINOR, 0 refuted) + fix batch T-039..T-047 (9/9, loop run
  `.agents/journal/20260730-loop-build-134141.md`) all landed. Every fix
  hand-verified live this session (probe notes in `docs/eval-results.md`
  Focus Run 2).
- **T-048**: FOCUS package renamed `focus-spec-mcp` → **`finops-focus-mcp`**
  (owner decision in `decisions.md`; resolves gate-4 C4-community-3). Dir is
  `packages/finops-focus-mcp/`, bin prints
  `finops-focus-mcp v1.0.0 (FOCUS spec versions: 1.0, 1.2; latest 1.2)`,
  tarball 241KB, temp-install verified. Historical docs/journals keep the
  old name on purpose.
- **Evals**: focus Run 1 10/10 (pre-fix), Run 2 10/10 (post-fix, post-rename,
  regenerated artifact), combined two-server scenario PASS —
  `docs/eval-results.md`.
- **Final pre-launch review** (`docs/final-status-review.md`, five lenses +
  adversarial verification): **GO-after-listed-fixes**, grades A-/A-/A-/B+/B-,
  zero BLOCKERs. Its two MAJORs (root README omitted the shipped FOCUS
  server/Worker/demo; root NOTICE.md lacked CC BY scope for `data/focus/**`)
  were fixed as **T-049** — landed, gates green. Its 19 MINORs are the
  post-launch backlog (list in the review doc; includes MEMORY.md refresh,
  derive-pipeline integration test, worker index/data tests, demo in the
  format gate [protected-path — owner task], SECURITY/CONTRIBUTING files,
  npm author/homepage/bugs fields, text-pagination parity, Worker
  GET/DELETE 405).
- All commits re-authored (committer noreply@anthropic.com) and pushed.
  Task-evidence commit SHAs recorded before the 2026-08-02 rebase point at
  pre-rebase objects (provenance display only; nothing resolves them).

## Next steps

1. Owner: review PR #9 (whole FOCUS v1 batch + close-out) and merge.
2. Owner: `npm publish` from `packages/finops-focus-mcp/` and (if desired)
   the root `finops-framework-mcp` package; MCP-registry submit both
   `server.json` manifests.
3. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages deploy
demo/`; smoke-test the demo against the deployed Worker (the CORS fix is
   handler-level verified, not yet wrangler-deployed).
4. Next agent session: work the 19-MINOR backlog from
   `docs/final-status-review.md` — start with the MEMORY.md rewrite
   (update-memory skill) and the `combined-scenario.xml` step-4 expectation
   fix (T-045 made the server correct; that eval prose is now stale).

## Open questions

- npm publish of the root framework package: 1.0.x now vs after PR merge —
  owner call (registry manifests are ready either way).
- Trademark posture recorded in `decisions.md` (finops-focus-mcp,
  accepted-risk): revisit only if the FinOps Foundation objects.
- `agentic.config.json` format-gate scope excludes `demo/` (review MINOR):
  protected path — needs an explicit owner-approved task.
- `src/shared/index.ts` `export *` barrel: any new server code importing a
  real binding from it can silently reintroduce fs-reachability in the
  Worker; `fs-boundary.test.ts` only catches code reachable from
  `src/workers/index.ts`. Splitting the barrel is a real refactor (queued
  observation since T-037).
- `validateFocusCsv` can't validate JSON-typed columns whose
  `allowed_values` are embedded-key names (1.2 `SkuPriceDetails`); the
  generator emits null as a workaround (decisions.md 2026-07-28).
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind `FINOPS_MCP_EXPERIMENTAL`.
- MCP SDK zod validation silently strips unknown tool params
  (docs/eval-results.md #3) — revisit when the SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping);
  supervising sessions must not commit a live loop's in-flight tasks.json;
  NEW — background watchers must not `pgrep` for a pattern contained in
  their own command line (self-match false positive, this session).

## Last updated

2026-08-02 — T-052 session (MCP-1/2/3 protocol polish: pagination text
parity, Worker GET/DELETE 405, listChanged doc fix).
