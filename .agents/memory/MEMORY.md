# MEMORY.md — core memory for finops-framework-mcp

<!-- Always-loaded core memory. Keep within memory.coreBudgetLines (see
     agentic.config.json). Facts, invariants, current phase — move detail to
     decisions.md / patterns.md. Curated via the update-memory skill. -->

## Project

- Name: finops-framework-mcp
- What: an MCP (Model Context Protocol) server acting as an agentic interface
  to the FinOps Framework published at https://finops.org/framework.
- Phase: v0.1 built — crawler + versioned data artifact (data/framework/) +
  stdio MCP server (src/servers/framework); two critique gates + eval suite
  passed 2026-07-21.

## Invariants

- Crawler and server never import each other; the data artifact is the only
  interface (ESLint boundaries enforce).
- Official content lives in data/framework/content/; everything unofficial
  (pre-crawl level, parsed Actions, inferred edges) is official:false in
  derived/ and labeled in every server output. Never blend or invent.
- Framework content is CC BY 4.0 (FinOps Foundation): attribution +
  modification notice must ride on every served surface (NOTICE.md).
- Never crawl /wp/v2/scope (legacy pre-2025 scopes = Technology Categories).
- Tests live under src/**/*.test.ts (tests/** is a protected path).

## Current focus

- Ship the v0.1 build PR; then owner decisions (Action rename, refresh
  workflow install) — see activeContext.md.
