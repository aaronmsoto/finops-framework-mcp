# MEMORY.md — core memory for finops-framework-mcp

<!-- Always-loaded core memory. Keep within memory.coreBudgetLines (see
     agentic.config.json). Facts, invariants, current phase — move detail to
     decisions.md / patterns.md. Curated via the update-memory skill. -->

## Project

- Name: finops-framework-mcp
- What: two MCP servers acting as an agentic interface to the FinOps
  Foundation's official guidance — `src/servers/framework` (the Framework:
  Principles, Phases, Domains, Capabilities, Personas, Technology
  Categories, Scopes, KPI library) and `packages/finops-focus-mcp` (the
  FOCUS spec: columns, KPI-to-column mappings, cross-version diffs).
- Phase: v1 built — both servers, a Worker (Streamable HTTP) deployment of
  the framework server, and a browser demo against it. Four critique gates
  plus a five-lens final pre-launch review (`docs/final-status-review.md`,
  GO-after-listed-fixes, zero BLOCKERs) all passed. Publish (npm, MCP
  registry, `wrangler deploy`) is owner-gated — see activeContext.md.

## Invariants

- Crawler and server never import each other; the data artifact is the only
  interface (ESLint boundaries enforce).
- Official content lives in data/{framework,focus}/content/; everything
  unofficial (pre-crawl level, parsed Actions) is official:false in
  derived/ and labeled in every server output. Never blend or invent.
- Framework/FOCUS content is CC BY 4.0 (FinOps Foundation): attribution +
  modification notice must ride on every served surface (NOTICE.md).
- Never crawl /wp/v2/scope (legacy pre-2025 scopes = Technology Categories).
- Tests live under src/**/*.test.ts (tests/** is a protected path).
- `src/workers/index.ts` runs the framework server over Streamable HTTP on
  Cloudflare Workers, stateless per-request, deliberately no auth/rate
  limit (public read-only data — see docs/deploy-worker.md); it must never
  import anything fs-reachable (`fs-boundary.test.ts` guards this, but only
  for code reachable from that entrypoint — see decisions/open questions on
  the `src/shared/index.ts` barrel).
- `demo/` is a static browser client calling the deployed Worker; it IS in
  the format gate (`prettier --check src tests demo`, since T-059).
- Any change touching a prompt/resource/tool must regenerate
  `docs/mcp-surface.md` (`npm run gen:mcp-surface`) — `mcp-surface.test.ts`
  fails on drift.

## Current focus

- Pre-publish hardening done (T-077); versions at 0.1.0 (2026-08-13 owner
  call, superseding T-077's 0.9.0 — see decisions.md). Publish is
  owner-gated and proceduralized in `docs/release-runbook.md` (manual first
  publish → trusted publishing via publish.yml → mcp-publisher). See
  activeContext.md for ordered next steps and the deferred-polish list.
