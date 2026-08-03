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
- `demo/` is a static browser client calling the deployed Worker; excluded
  from the format gate (protected-path, owner-approved change needed to
  add it).
- Any change touching a prompt/resource/tool must regenerate
  `docs/mcp-surface.md` (`npm run gen:mcp-surface`) — `mcp-surface.test.ts`
  fails on drift.

## Current focus

- Publish is owner-gated: PR review/merge, `npm publish` both packages,
  MCP-registry submit, `wrangler deploy` + demo deploy. See
  activeContext.md for the ordered next-steps list and the post-launch
  MINOR backlog (`docs/final-status-review.md`).
