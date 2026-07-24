# finops-framework-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI agents a
structured, queryable interface to the **official FinOps Framework**
published by the FinOps Foundation at <https://finops.org/framework>: 6
Principles, 3 Phases, 4 Domains, 22 Capabilities (with Crawl/Walk/Run
maturity assessments, per-persona activities, and KPIs), 11 Personas, 5
Technology Categories, the Scopes concept, and an 88-entry KPI library.

v1 is deliberately **official-only by default** — no invented relationship
graph, no parsed-out assessment items — with two unofficial extensions
available opt-in behind a flag (see below).

Three fully decoupled parts:

```
crawler ──▶ data artifact ──▶ MCP server
(src/crawlers/framework)   (data/framework/)   (src/servers/framework)
 fetch → parse → sanitize   versioned JSON +    resources + tools +
 → compose → derive         markdown + JSON     prompts over stdio
 → validate → diff → emit   Schemas + manifest
```

`content/markdown/` is the **canonical** intermediate: the crawler composes
it from parsed HTML, and every JSON file is regenerated from that markdown
by an offline `derive` step (no network access) — so a schema or JSON-only
fix can be regenerated without recrawling finops.org. A re-crawl refreshes
the server with **zero code changes**; the server validates the artifact
against its schemas at startup and refuses to start on a bad artifact.

## Quickstart

```bash
npx finops-framework-mcp
```

or, from a clone:

```bash
npm install && npm run build && npm run server
```

Claude Code:

```bash
claude mcp add finops-framework -- npx finops-framework-mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "finops-framework": {
      "command": "npx",
      "args": ["finops-framework-mcp"]
    }
  }
}
```

The artifact directory defaults to the one packaged with the npm release
(`data/framework`); override with `FINOPS_MCP_DATA` or the first CLI
argument if you're running against a locally-refreshed artifact.

Surface (default, official-only): 11 read-only tools —
`get_framework_info` (entry point), `search_framework`, `list_capabilities`,
`get_capability`, `get_maturity_assessment`, `get_kpis`, `assess_maturity_path`,
`map_personas`, `get_entity`, `get_maturity_model`, `get_changelog` —
`finops://framework/…` resources for full documents, and 4 prompts
(`explain-framework`, `assess-capability-maturity`, `plan-maturity-roadmap`,
`map-personas-to-capabilities`).

### Experimental extensions (opt-in)

Two things this server derives but the FinOps Foundation doesn't publish are
hidden by default and served only when explicitly requested:

- **`Pre-Crawl`** — an unofficial maturity level below Crawl (the official
  model defines exactly three: Crawl, Walk, Run).
- **Parsed assessment "Actions"** — the `get_actions` tool, itemized
  characteristics parsed out of the official Crawl/Walk/Run prose (rubric
  states an assessor checks for, not to-do steps).

Enable both with an environment variable or flag:

```bash
FINOPS_MCP_EXPERIMENTAL=1 npx finops-framework-mcp
# or
npx finops-framework-mcp --experimental
```

Everything experimental is labeled `official: false` / EXPERIMENTAL wherever
it appears, and the default surface never mentions it. The v0.1 capability
relationship graph (`get_prerequisites`/`get_related`) was evaluated and
**deleted outright** — see `.agents/specs/v1-official-only.md` — because
neither the harvested nor the inferred edges cleared the accuracy bar.

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
