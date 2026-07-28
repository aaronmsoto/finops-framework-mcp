# focus-spec-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI agents a
structured, **version-aware** interface to the **FOCUS** (FinOps Open Cost &
Usage Specification) published by the FinOps Foundation /
FinOps-Open-Cost-and-Usage-Spec project. FOCUS columns are added, renamed,
deprecated, and re-semanticized across releases — this server pins every
answer to a spec version (`1.0` or `1.2`, default `1.2`) instead of blending
them.

This package is a publish shim: it ships the built `focus` MCP server from
the [finops-framework-mcp](https://github.com/aaronmsoto/finops-framework-mcp)
monorepo as its own installable npm package, decoupled from the companion
`finops-framework-mcp` package (the official FinOps Framework server). See
that repository for source, tests, and contribution docs.

## Quickstart

```bash
npx focus-spec-mcp
```

Claude Code:

```bash
claude mcp add focus-spec -- npx focus-spec-mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "focus-spec": {
      "command": "npx",
      "args": ["focus-spec-mcp"]
    }
  }
}
```

Generic stdio client:

```json
{
  "command": "npx",
  "args": ["focus-spec-mcp"]
}
```

## Tool surface

`list_versions`, `get_column`, `list_columns`, `search_focus`,
`get_attribute`, `get_requirements`, `compare_versions`, `get_kpi_mapping`,
`calculate_kpi`. Every tool takes an optional `version` parameter (defaults
to `1.2`) and echoes `spec_version` in its structured content.

`get_kpi_mapping` and `calculate_kpi` are **derived, unofficial** extensions
— no official FOCUS-to-FinOps-KPI mapping exists upstream. Every record from
these two tools is marked `official: false` with an in-text UNOFFICIAL
banner; see `NOTICE.md`.

## Data & licensing

FOCUS spec text, attributes, glossary, and the official sample dataset are
© FinOps Foundation / FOCUS project contributors, licensed **CC BY 4.0**.
See `NOTICE.md` for full attribution and the no-endorsement note. Code in
this package is MIT-licensed (`LICENSE`).

## Version

```bash
npx focus-spec-mcp --version
```
