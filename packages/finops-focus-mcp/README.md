# finops-focus-mcp

[![finops-focus-mcp on npm](https://img.shields.io/npm/v/finops-focus-mcp?label=finops-focus-mcp)](https://www.npmjs.com/package/finops-focus-mcp)
[![finops-framework-mcp on npm](https://img.shields.io/npm/v/finops-framework-mcp?label=finops-framework-mcp)](https://www.npmjs.com/package/finops-framework-mcp)
[![tokenomics-overview-mcp on npm](https://img.shields.io/npm/v/tokenomics-overview-mcp?label=tokenomics-overview-mcp)](https://www.npmjs.com/package/tokenomics-overview-mcp)
[![license MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An unofficial [MCP](https://modelcontextprotocol.io) server that gives AI
agents a structured, **version-aware** interface to the **FOCUS** (FinOps
Open Cost & Usage Specification) published by the FinOps Foundation /
FinOps-Open-Cost-and-Usage-Spec project. FOCUS columns are added, renamed,
deprecated, and re-semanticized across releases — this server pins every
answer to a spec version (`1.0` or `1.2`, default `1.2`) instead of blending
them.

This package is a publish shim: it ships the built `focus` MCP server from
the [finops-framework-mcp](https://github.com/aaronmsoto/finops-framework-mcp)
monorepo as its own installable npm package. See that repository for source,
tests, and contribution docs.

**Usage guide:**
[aaronmsoto.github.io/finops-framework-mcp/focus-server.html](https://aaronmsoto.github.io/finops-framework-mcp/focus-server.html)

## Quickstart

Published on npm as
[`finops-focus-mcp`](https://www.npmjs.com/package/finops-focus-mcp) — nothing to
clone or build. The FOCUS spec data and the sample datasets ship inside the package,
so `calculate_kpi` works offline straight after install; Node >= 22 is the only
requirement.

```bash
npx -y finops-focus-mcp
```

(`-y` skips npx's first-run install prompt, which can hang non-interactive
MCP clients; pin a version with `npx -y finops-focus-mcp@latest` or `@0.2`.)

Claude Code:

```bash
claude mcp add focus-spec -- npx -y finops-focus-mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "focus-spec": {
      "command": "npx",
      "args": ["-y", "finops-focus-mcp"]
    }
  }
}
```

Generic stdio client:

```json
{
  "command": "npx",
  "args": ["-y", "finops-focus-mcp"]
}
```

## Tool surface

`list_versions`, `get_column`, `list_columns`, `search_focus`,
`get_attribute`, `get_requirements`, `compare_versions`, `get_kpi_mapping`,
`calculate_kpi`. Version-parameterized tools take an optional `version`
parameter (defaults to `1.2`) and echo `spec_version` in their structured
content; `list_versions` and `compare_versions` are version-independent.

`get_kpi_mapping` and `calculate_kpi` are **derived, unofficial** extensions
— no official FOCUS-to-FinOps-KPI mapping exists upstream. Every record from
these two tools is marked `official: false` with an in-text UNOFFICIAL
banner; see `NOTICE.md`.

The full prompts/resources/tools hierarchy of this server (and its two
siblings) — names, args, URIs, param defaults/limits — is generated from live
MCP output in the monorepo at
[`docs/mcp-surface.md`](https://github.com/aaronmsoto/finops-framework-mcp/blob/main/docs/mcp-surface.md).

## Sibling servers

Two companion servers from the same monorepo work alongside this one:

- [`finops-framework-mcp`](https://www.npmjs.com/package/finops-framework-mcp):
  the FinOps Framework (capabilities, maturity, KPIs, personas). Its KPIs are
  what `get_kpi_mapping` maps onto FOCUS columns.
- [`tokenomics-overview-mcp`](https://www.npmjs.com/package/tokenomics-overview-mcp):
  Tokenomics Foundation AI-cost guidance, including what FOCUS 1.5 adds for AI
  billing. Its `get_crosslinks` returns `focus://spec/1.2/…` URIs for this
  server to resolve, such as `SkuPriceDetails`.

```json
{
  "mcpServers": {
    "focus-spec": { "command": "npx", "args": ["-y", "finops-focus-mcp"] },
    "finops-framework": { "command": "npx", "args": ["-y", "finops-framework-mcp"] },
    "tokenomics-overview": { "command": "npx", "args": ["-y", "tokenomics-overview-mcp"] }
  }
}
```

## Data & licensing

FOCUS spec text, attributes, glossary, and the official sample dataset are
© FinOps Foundation / FOCUS project contributors, licensed **CC BY 4.0**.
See `NOTICE.md` for full attribution and the no-endorsement note. Code in
this package is MIT-licensed (`LICENSE`).

## Version

```bash
npx -y finops-focus-mcp --version
```
