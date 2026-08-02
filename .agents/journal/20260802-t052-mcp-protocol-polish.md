# T-052 — MCP protocol polish: pagination parity, Worker 405s, listChanged docs

2026-08-02

## Task

Fix the three MCP-conformance polish items from `docs/final-status-review.md`
(MCP-1, MCP-2, MCP-3): pagination text parity across all paginated tools,
Worker GET/DELETE 405 handling, and the `listChanged` doc/comment mismatch.

## What I did

**MCP-1 — pagination text parity.** `get_kpis` (framework/tools.ts) already
appended `Showing X of Y — pass cursor: "..." for more.` to its TEXT block
when paginated. The other four paginated tools didn't:
`search_framework`, `list_capabilities` (framework/tools.ts),
`list_columns`, `search_focus` (focus/tools.ts). Added the same note to each,
appended after their existing bullet-list text, conditional on
`nextCursor`/`p.nextCursor` being present (no note on a full, unpaginated
page — matches `get_kpis`'s existing behavior). Added tests in
`server.test.ts` for both servers: force a small `limit` to get a
`nextCursor`, assert the text matches `/Showing N of \d+ — pass cursor/`,
and assert a full (unpaginated) call's text does *not* contain "Showing".

**MCP-2 — Worker GET/DELETE.** `src/workers/app.ts`'s fetch handler is
stateless (`sessionIdGenerator: undefined`, fresh server per request), so a
GET's SSE stream (meant to relay server-initiated notifications for a live
session) has nothing to ever relay and would hang forever; DELETE (session
termination) is equally meaningless with no session state. Added a
short-circuit right after the OPTIONS branch: if the pathname is one of the
two known MCP routes (`/mcp/framework`, `/mcp/focus`) and the method is GET
or DELETE, respond `405` with `Allow: POST, OPTIONS` (and CORS ACAO if an
Origin was present) before the request ever reaches
`WebStandardStreamableHTTPServerTransport`. An unknown path still 404s for
GET (the short-circuit is scoped to the two real routes only, not "any
GET"). Added 4 new `app.test.ts` cases.

**MCP-3 — listChanged doc mismatch.** Read
`node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js`: the SDK's
`McpServer.setToolRequestHandlers`/resource/prompt equivalents call
`registerCapabilities({ ..., listChanged: true })` unconditionally the
moment any handler is registered — there's no constructor option or method
to suppress it. So the fix is doc-only, not code. `framework/server.ts:20-23`
previously claimed the server was built "without ... listChanged", which is
false at the wire level (SDK still advertises it; the notification is just
never emitted since the artifact never changes mid-process). Corrected that
comment to match the already-accurate `docs/architecture.md` §5.5 wording,
and added the same comment to `focus/server.ts` (which had no comment on
this at all before).

## Verification

- `npx vitest run src/servers/framework/server.test.ts
  src/servers/focus/server.test.ts src/workers/app.test.ts` — 20 + 101 (both
  server files run together = 101) passed before the full gate run.
- `./scripts/agentic gates --tier all`: PASS (format, lint, typecheck,
  test [385 tests], designs, integrity, memory, build). First run failed
  `format` on the two files I'd hand-edited (`server.test.ts`, `app.ts`);
  ran `npx prettier --write` on exactly those two files and re-ran gates
  green. No tests were deleted, skipped, or loosened — new assertions were
  added; existing ones were untouched (get_kpis's existing "Showing 25 of"
  assertion still passes unchanged since that tool's behavior didn't
  change).
- No `.only`/`fit`/`fdescribe` introduced.

## Notes for next session

- The 19-MINOR backlog in `docs/final-status-review.md` still has: MEMORY.md
  rewrite, derive-pipeline integration test, worker index/data tests,
  `combined-scenario.xml` step-4 fix, architecture.md/AGENTS.md "now built"
  updates, SECURITY/CONTRIBUTING files, npm author/homepage/bugs fields.
- Left `.agents/journal/20260802-loop-build-065405.md` (an untracked,
  harness-auto-generated loop-run record for T-051, never committed by that
  run) alone — not mine to edit or fold into this commit; harness-owned.
