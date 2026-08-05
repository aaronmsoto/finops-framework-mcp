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

Code: MIT (see `LICENSE`). Framework content in `data/framework/**` and
FOCUS specification content in `data/focus/**`: © FinOps Foundation /
FOCUS project contributors, **CC BY 4.0**, restructured/adapted — see
`NOTICE.md` for the required attribution and modification notices.

## Sibling server: finops-focus-mcp

What the Roadmap once sketched is now built and ships from this repo: a
version-aware **FOCUS specification** MCP server (`src/crawlers/focus`,
`src/servers/focus`, `data/focus/` — FOCUS 1.0 and 1.2) reusing
`src/shared`. It publishes separately as
[`packages/finops-focus-mcp`](packages/finops-focus-mcp/) (npm bin
`finops-focus-mcp`) with its own README, NOTICE, and registry manifest:
9 tools covering column/attribute lookup, normative requirements, search,
cross-version diffs, plus clearly-flagged **unofficial** KPI-to-FOCUS
mappings and sample-data KPI calculation.

Both servers are also deployable over **Streamable HTTP** via the bundled
Cloudflare Worker (`src/workers/`, endpoints `/mcp/framework` and
`/mcp/focus` — see [`docs/deploy-worker.md`](docs/deploy-worker.md)), and
[`demo/`](demo/) is a static browser walkthrough that drives both servers
end-to-end through the Worker.

The full prompts/resources/tools hierarchy of both servers — names, args,
URIs, param defaults/limits — is generated from live MCP output at
[`docs/mcp-surface.md`](docs/mcp-surface.md).

## Documentation

[**`docs/guide/`**](docs/guide/index.html) is the usage guide — six
self-contained pages in which every number, quote, and transcript was
captured from a live probe of these servers or computed from the committed
sample data. It is also the published site: once the staged workflow is
installed and Pages is enabled, `docs/guide/` — and only that directory —
serves at <https://aaronmsoto.github.io/finops-framework-mcp/> (setup and
smoke test in [`docs/deploy-pages.md`](docs/deploy-pages.md)).

| Page                                                       | What it covers                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Intro &amp; Getting Started](docs/guide/index.html)       | Both servers side by side; install, Claude Code / Claude Desktop / `.mcp.json` config, the Worker remote option, first call per server                 |
| [finops-framework-mcp](docs/guide/framework-server.html)   | Data model, all 11 tools grouped by job, prompts and resources, pagination, an Anomaly Management demo                                                 |
| [finops-focus-mcp](docs/guide/focus-server.html)           | Version model, all 9 tools, `focus://` resources, a BilledCost deep-dive and the 1.0→1.2 diff                                                          |
| [Showback Reporting](docs/guide/example-showback.html)     | Understand Usage &amp; Cost → Allocation + Reporting &amp; Analytics → the FOCUS columns a showback needs → a report computed from the official sample |
| [Rate Optimization (ESR)](docs/guide/example-esr.html)     | Capability → featured KPIs → FOCUS columns at 1.0 vs 1.2 → Effective Savings Rate on the official sample                                               |
| [Forecasting Journey](docs/guide/example-forecasting.html) | A maturity journey to Walk-level Forecasting: official Crawl/Walk characteristics, KPIs, and the data that feeds a forecast                            |

Every page opens over `file://` too — the guide has no external assets.
Guide pages are rich HTML by design — an intentional exception to this
repo's markdown-for-docs convention, recorded in
`.agents/memory/decisions.md`.

## Development

- Agent instructions: [AGENTS.md](AGENTS.md) · design: `docs/architecture.md`
  (adversarial reviews: `docs/critique-1.md`, `docs/critique-2.md`,
  `docs/critique-3-publish-gate.md`, `docs/critique-4-focus-gate.md`,
  `docs/final-status-review.md`)
- Gates: `./scripts/agentic gates` · tests: `npm test` (fixture-based, no
  network) · evals: `evals/framework/` (`docs/eval-results.md`)
- Working in a clone: the checked-in `.mcp.json` loads **both** servers from
  `dist/` into MCP clients that read it — build first (`dist/` is
  gitignored), then restart the client. See
  [CONTRIBUTING.md](CONTRIBUTING.md#testing-the-servers-locally); the
  `npx` config in the guide is the end-user form.
