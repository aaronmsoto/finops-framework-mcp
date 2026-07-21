# finops-framework-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI agents a
structured, queryable interface to the **FinOps Framework** published by the
FinOps Foundation at <https://finops.org/framework>: 6 Principles, 3 Phases,
4 Domains, 22 Capabilities (with Crawl/Walk/Run maturity assessments,
per-persona activities, and KPIs), 11 Personas, 5 Technology Categories, the
Scopes concept, an 88-entry KPI library, and a capability relationship graph.

Three fully decoupled parts:

```
crawler ──▶ data artifact ──▶ MCP server
(src/crawlers/framework)   (data/framework/)   (src/servers/framework)
 fetch → parse → infer      versioned JSON +    resources + tools +
 → validate → diff → emit   JSON Schemas +      prompts over stdio
                            manifest/changelog
```

A re-crawl refreshes the server with **zero code changes**; the server
validates the artifact against its schemas at startup and refuses to start
on a bad artifact. Official framework content and unofficial extensions (the
`pre-crawl` maturity level, parsed assessment items, inferred relationship
edges) are separated everywhere: different files (`content/` vs `derived/`),
`official: false` flags, and explicit notes in every response.

## Quickstart

```bash
npm install && npm run build
```

Claude Code:

```bash
claude mcp add finops-framework -- node /path/to/finops-framework-mcp/dist/servers/framework/main.js
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "finops-framework": {
      "command": "node",
      "args": ["/path/to/finops-framework-mcp/dist/servers/framework/main.js"],
      "env": { "FINOPS_MCP_DATA": "/path/to/finops-framework-mcp/data/framework" }
    }
  }
}
```

The artifact directory defaults to `./data/framework`; override with
`FINOPS_MCP_DATA` or the first CLI argument.

Surface: 12 read-only tools (`get_framework_info` is the entry point, then
`search_framework`, `list_capabilities`, `get_capability`, `get_actions`,
`get_kpis`, `get_prerequisites`, `get_related`, `assess_maturity_path`,
`map_personas`, `get_maturity_model`, `get_changelog`), `finops://framework/…`
resources for full documents, and 4 prompts (`explain-framework`,
`assess-capability-maturity`, `plan-maturity-roadmap`,
`map-personas-to-capabilities`).

## Refreshing the data

```bash
npm run refresh            # crawl (polite, cached, robots-honoring) → new artifact + diff report
```

No changes on finops.org → byte-identical artifact, no version bump. Content
changes → semantic diff report (`.cache/crawl-report/diff-report.md`),
changelog entry, and a semver bump (patch = text edits, minor = entity
add/remove). A scheduled GitHub Actions workflow is provided at
`docs/proposed/refresh-data.yml` — `.github/workflows/` is a protected path
in this repo, so the owner installs it:

```bash
git mv docs/proposed/refresh-data.yml .github/workflows/refresh-data.yml
```

Until installed, scheduled refreshes are inactive. Note GitHub auto-disables
cron workflows after ~60 days of repo inactivity.

## Data versioning policy

Consumers pin a data version by pinning a git ref (tag/commit) of this repo;
tracking `main` floats to the latest merged refresh. `manifest.json` carries
`data_version`, `schema_version`, `crawled_at`, per-file sha256, and entity
counts; `derived/changelog.json` (also served as `get_changelog` /
`finops://framework/meta/changelog`) records what changed between versions.
Schema-breaking changes bump `schema_version` and require a server release.

## License and attribution

Code: MIT (see `LICENSE`). Framework content in `data/framework/**`:
© FinOps Foundation, **CC BY 4.0**, restructured/adapted — see `NOTICE.md`
for the required attribution and modification notice.

## Roadmap

The layout leaves room for sibling servers (e.g. a **FOCUS** specification
server: `src/crawlers/focus`, `src/servers/focus`, `data/focus/`) reusing
`src/shared` (types, artifact loader/validation) and the crawler's
fetch/cache/politeness helpers.

## Development

- Agent instructions: [AGENTS.md](AGENTS.md) · design: `docs/architecture.md`
  (adversarial reviews: `docs/critique-1.md`, `docs/critique-2.md`)
- Gates: `./scripts/agentic gates` · tests: `npm test` (fixture-based, no
  network) · evals: `evals/framework/` (`docs/eval-results.md`)
