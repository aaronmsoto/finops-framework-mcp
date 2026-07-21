# MEMORY.md — core memory for finops-framework-mcp

<!-- Always-loaded core memory. Keep within memory.coreBudgetLines (see
     agentic.config.json). Facts, invariants, current phase — move detail to
     decisions.md / patterns.md. Curated via the update-memory skill. -->

## Project

- Name: finops-framework-mcp
- What: an MCP (Model Context Protocol) server acting as an agentic interface
  to the FinOps Framework published at https://finops.org/framework.
- Phase: onboarding — initialized from agentic-starter-repo; server not yet
  implemented (src/index.ts is the preset scaffold).

## Invariants

- (record hard facts agents must never violate)

## Current focus

- Finish onboarding (T-003: first feature spec), then design/plan the MCP
  server surface over the FinOps Framework content.
