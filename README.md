# finops-framework-mcp

[![finops-framework-mcp on npm](https://img.shields.io/npm/v/finops-framework-mcp?label=finops-framework-mcp)](https://www.npmjs.com/package/finops-framework-mcp)
[![finops-focus-mcp on npm](https://img.shields.io/npm/v/finops-focus-mcp?label=finops-focus-mcp)](https://www.npmjs.com/package/finops-focus-mcp)
[![tokenomics-overview-mcp on npm](https://img.shields.io/npm/v/tokenomics-overview-mcp?label=tokenomics-overview-mcp)](https://www.npmjs.com/package/tokenomics-overview-mcp)
[![license MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Three unofficial [MCP](https://modelcontextprotocol.io) servers that give AI
assistants a structured, sourced interface to published FinOps and AI-cost
guidance, so an assistant answers with the publishers' actual text and
formulas instead of improvising:

| Server | Covers | Source |
| --- | --- | --- |
| [**finops-framework-mcp**](https://www.npmjs.com/package/finops-framework-mcp) | The **FinOps Framework**: capabilities, Crawl/Walk/Run maturity, KPIs, personas | [finops.org/framework](https://www.finops.org/framework/) |
| [**finops-focus-mcp**](https://www.npmjs.com/package/finops-focus-mcp) | The **FOCUS** billing-data specification, pinned per version (1.0, 1.2) | [focus.finops.org](https://focus.finops.org) |
| [**tokenomics-overview-mcp**](https://www.npmjs.com/package/tokenomics-overview-mcp) | **AI tokenomics**: the Seven-Layer Stack, Big-T notation, prompt-cache metrics, consumption levers incl. model routing, FOCUS 1.5 AI cost | [tokeneconomics.com](https://www.tokeneconomics.com) |

All three are **read-only** (an agent can read guidance, never change your
practice or data) and **offline once installed** (no network access at
runtime, no telemetry). Use any one on its own; together they cover what good
looks like, which billing columns prove it, and what drives AI token cost.

## Start here: the usage guide

**[aaronmsoto.github.io/finops-framework-mcp](https://aaronmsoto.github.io/finops-framework-mcp/)**
is a free, no-install walkthrough written for FinOps practitioners as much as
engineers. It explains what each server does, connects them to Claude in a
couple of minutes, and works through five examples, from a showback report to
whether prompt caching is paying off. Every number and quote in it comes from
a real run of these servers. See [Documentation](#documentation) for the page
list.

## Why this exists

Ask an AI assistant "how mature is our Allocation practice?", "which FOCUS
columns feed Effective Savings Rate?" or "is our prompt caching paying off?"
without these servers, and it will happily improvise a plausible answer. With
them, every response is the publisher's own text and formulas, structured for
an assistant to read, with the source URL and license attached.

Anything a server had to work out itself is labeled, never passed off as
published guidance:

- The FOCUS server's KPI-to-column mapping, computed KPI values and
  cross-version diff are marked **UNOFFICIAL** (`official: false`).
- The tokenomics server states each source's **publication status** on every
  answer, because most Tokenomics Foundation guidance is a working draft or
  release candidate. Its curated crosswalk is unofficial and only appears
  with `FINOPS_MCP_EXPERIMENTAL=1`.
- The framework server is official-only out of the box: no invented
  relationships between capabilities, no maturity levels beyond the
  Foundation's Crawl/Walk/Run.

## Quickstart

All three are on npm, so there is nothing to clone or build. Each package
ships its own data and runs offline. **Node >= 22** is the only requirement.

```bash
npx -y finops-framework-mcp
npx -y finops-focus-mcp
npx -y tokenomics-overview-mcp
```

(`-y` skips npx's first-run install prompt, which can hang non-interactive
MCP clients. Pin a version with, for example, `npx -y finops-focus-mcp@0.2`.)

**Claude Code:**

```bash
claude mcp add finops-framework -- npx -y finops-framework-mcp
claude mcp add focus-spec -- npx -y finops-focus-mcp
claude mcp add tokenomics-overview -- npx -y tokenomics-overview-mcp
```

**Claude Desktop** (`claude_desktop_config.json`), or a project-scoped
`.mcp.json`, or any stdio MCP client:

```json
{
  "mcpServers": {
    "finops-framework": {
      "command": "npx",
      "args": ["-y", "finops-framework-mcp"]
    },
    "focus-spec": {
      "command": "npx",
      "args": ["-y", "finops-focus-mcp"]
    },
    "tokenomics-overview": {
      "command": "npx",
      "args": ["-y", "tokenomics-overview-mcp"]
    }
  }
}
```

**Environment variables** (all optional):

| Variable | Server | Effect |
| --- | --- | --- |
| `FINOPS_MCP_DATA` | framework | Use a locally refreshed artifact instead of the packaged `data/framework` |
| `FOCUS_MCP_DATA` | FOCUS | Same, for `data/focus` |
| `TOKENOMICS_MCP_DATA` | tokenomics | Same, for `data/tokenomics` |
| `FINOPS_MCP_EXPERIMENTAL=1` | framework, tokenomics | Turn on clearly labeled unofficial extras: the framework's parsed maturity `get_actions`, the tokenomics crosswalk |

Each server also accepts the data directory as its first CLI argument, and
answers `--version` with its package version plus its data version (FOCUS:
the spec versions it serves).

## How to use them

Start a session with each server's entry point, then follow its suggestions:

| Server | Start with | Then |
| --- | --- | --- |
| framework | `get_framework_info {}` | `search_framework`, `list_capabilities`, `get_capability` (with `include` to control size), `get_kpis`, `assess_maturity_path` |
| FOCUS | `list_versions {}` | `search_focus`, `get_column`, `get_requirements`, `compare_versions`, `get_kpi_mapping`, `calculate_kpi` |
| tokenomics | `get_tokenomics_info {}` | `list_layers`, `get_bigt_notation`, `list_levers`, `get_metric`, `calculate_cache_metrics`, `get_crosslinks` |

Questions each one answers well:

- **Framework:** "What does Walk-level Forecasting require?", "Which KPIs
  does the Foundation feature for Rate Optimization?", "Who does what in
  Anomaly Management?"
- **FOCUS:** "What does `BilledCost` mean in 1.2, and what changed since
  1.0?", "Which columns do I need to compute Effective Savings Rate?"
- **Tokenomics:** "Which layer owns model routing and AI gateways?", "How
  does this agent's token use scale with autonomy?", "Our cache read, write
  and uncached input tokens were X, Y, Z: is caching saving money?"

**Using them together.** The servers ship separately and never call each
other. Instead, answers hand off by URI: each of the tokenomics server's 35
`get_crosslinks` links is backed by a verbatim quote from the Tokenomics
Foundation page, and carries a `finops://framework/…` or `focus://spec/…` URI
for the agent to read with the other two servers. FOCUS 1.5 working-draft
names, which no ratified release contains yet, come back with no URI. The
[prompt-caching example](https://aaronmsoto.github.io/finops-framework-mcp/example-ai-caching.html)
walks one question through all three.

### Server surfaces

- **finops-framework-mcp**: 11 tools — `get_framework_info` (entry point),
  `search_framework`, `list_capabilities`, `get_capability`,
  `get_maturity_assessment`, `get_kpis`, `assess_maturity_path`,
  `map_personas`, `get_entity`, `get_maturity_model`, `get_changelog` — plus
  `finops://framework/…` resources and 4 prompts (`explain-framework`,
  `assess-capability-maturity`, `plan-maturity-roadmap`,
  `map-personas-to-capabilities`). Data: 6 Principles, 3 Phases, 4 Domains,
  22 Capabilities, 11 Personas, 5 Technology Categories, the Scopes concept,
  and an 88-entry KPI library.
- **finops-focus-mcp**: 9 tools for column and attribute lookup, normative
  requirements, search, the 1.0 → 1.2 diff, and unofficial KPI-to-column
  mappings with sample-data KPI calculation, plus `focus://spec/…` resources
  and 3 prompts. See [`packages/finops-focus-mcp`](packages/finops-focus-mcp/).
- **tokenomics-overview-mcp**: 20 tools across documents, the Seven-Layer
  Stack, Big-T notation, levers, metrics (with a cache-metrics calculator),
  personas, value classification, the FOCUS 1.5 AI-cost capabilities and
  cross-links, plus `tokenomics://overview/…` resources and 3 prompts
  (`optimize_consumption`, `assess_prompt_caching`, `bigt_review`). Data: 14
  source documents, 7 layers, 6 Big-T classes, 32 levers, 7 metrics, 12
  personas, 35 stated cross-links. See
  [`packages/tokenomics-overview-mcp`](packages/tokenomics-overview-mcp/).

The full prompts, resources and tools of all three servers (names, arguments,
URIs, defaults and limits) are generated from live MCP output in
[`docs/mcp-surface.md`](docs/mcp-surface.md).

### Remote option: the Cloudflare Worker

The framework and FOCUS servers can also run over **Streamable HTTP** from a
bundled Cloudflare Worker (`src/workers/`, endpoints `/mcp/framework` and
`/mcp/focus`; see [`docs/deploy-worker.md`](docs/deploy-worker.md)), and
[`demo/`](demo/) is a static browser walkthrough that drives both through it.
The tokenomics server is stdio-only for now.

## How it's built

Every server is the same three decoupled parts, so a content refresh never
needs a code change:

```
crawler ──▶ data artifact ──▶ MCP server (stdio)
src/crawlers/<name>   data/<name>/   src/servers/<name>
```

for `<name>` in `framework`, `focus` and `tokenomics`. The framework and
tokenomics crawlers go fetch → parse → compose → derive → validate → emit:
`content/markdown/` is the **canonical** intermediate, composed from parsed
HTML, and every JSON file is regenerated from it by an offline `derive` step,
so a schema or JSON-only fix never needs a re-crawl. Their artifacts carry
JSON Schemas and a sha256 manifest, and each server validates its artifact at
startup and refuses to start on a bad one. The FOCUS crawler instead ingests
each pinned spec release by git tag into `data/focus/<version>/`, with the
derived diff and KPI mapping under `data/focus/derived/`.

The framework server's early capability relationship graph
(`get_prerequisites`/`get_related`) was built, evaluated and **deleted**
because its edges didn't clear the accuracy bar; see
`.agents/specs/v1-official-only.md`.

## Refreshing the data

```bash
npm run build
npm run refresh                                   # framework: crawl → artifact + diff report
node dist/crawlers/focus/cli.js                   # FOCUS: ingest the pinned spec tags (1.0, 1.2)
node dist/crawlers/tokenomics/cli.js refresh      # tokenomics: Tokenomics Foundation pages
node dist/crawlers/framework/cli.js derive        # framework: offline markdown → JSON, byte-identical
node dist/crawlers/tokenomics/cli.js derive       # tokenomics: same, for data/tokenomics
```

Crawls are polite, cached and robots-honoring. No upstream changes produce a
byte-identical artifact and no version bump; content changes produce a
changelog entry and a semver bump of the data version. The tokenomics refresh
also lists pages it found but doesn't ingest (for example working-group
drafts) under `unregistered` in its manifest. A scheduled refresh workflow is
provided at `docs/proposed/refresh-data.yml`; `.github/workflows/` is a
protected path here, so the owner installs it:

```bash
git mv docs/proposed/refresh-data.yml .github/workflows/refresh-data.yml
```

## Data versioning policy

Consumers pin a data version by pinning a package version or a git ref of
this repo. Each `manifest.json` carries `data_version`, `schema_version`,
`crawled_at`, per-file sha256 and entity counts; `derived/changelog.json`
records what changed between versions (served by the framework server as
`get_changelog`). Schema-breaking changes bump `schema_version` and require a
server release. Releases are cut from a `v*` tag; see
[`docs/release-runbook.md`](docs/release-runbook.md).

## License and attribution

Code: MIT (see `LICENSE`). Content, each **CC BY 4.0**, restructured and
adapted — see [`NOTICE.md`](NOTICE.md) for the required attribution and
modification notices:

- `data/framework/**`: © FinOps Foundation
- `data/focus/**`: © FinOps Foundation / FOCUS project contributors
- `data/tokenomics/**`: © Tokenomics Foundation (a Series of LF Projects, LLC)

FinOps™, FinOps Foundation™ and FOCUS™ are trademarks of the FinOps
Foundation. This project is independent and not affiliated with or endorsed
by the FinOps Foundation, the FOCUS project, or the Tokenomics Foundation.

## Documentation

[**`docs/guide/`**](docs/guide/index.html) is the usage guide: nine
self-contained pages in which every number, quote and transcript was captured
from a live probe of these servers or computed from the committed sample
data. It is also the published site: `.github/workflows/pages.yml` deploys
`docs/guide/`, and only that directory, to
<https://aaronmsoto.github.io/finops-framework-mcp/> on every push to `main`
that touches it (setup and smoke test in
[`docs/deploy-pages.md`](docs/deploy-pages.md)).

| Page | What it covers |
| --- | --- |
| [Intro & Getting Started](docs/guide/index.html) | All three servers side by side; install, Claude Code / Claude Desktop / `.mcp.json` config, the Worker remote option, the first call against each server |
| [Framework MCP reference](docs/guide/framework-server.html) | Data model, all 11 tools grouped by job, prompts and resources, pagination, an Anomaly Management demo |
| [FOCUS MCP reference](docs/guide/focus-server.html) | Version model, all 9 tools, `focus://` resources, a BilledCost deep-dive and the 1.0→1.2 diff |
| [Tokenomics MCP reference](docs/guide/tokenomics-server.html) | Sources and their status, the Seven-Layer Stack and Big-T, all 20 tools, prompts, `tokenomics://` resources, cross-links, a model-routing and AI-gateway demo |
| [Showback Reporting](docs/guide/example-showback.html) | Allocation + Reporting & Analytics → the FOCUS columns a showback needs → a report computed from the official sample |
| [Rate Optimization (ESR)](docs/guide/example-esr.html) | Capability → featured KPIs → FOCUS columns at 1.0 vs 1.2 → Effective Savings Rate on the official sample |
| [Forecasting Journey](docs/guide/example-forecasting.html) | A maturity journey to Walk-level Forecasting: official Crawl/Walk characteristics, KPIs, and the data that feeds a forecast |
| [Quick Q&A](docs/guide/example-quick-qa.html) | Four unscripted live prompts in one session across the framework and FOCUS servers |
| [Is Prompt Caching Paying Off?](docs/guide/example-ai-caching.html) | All three servers: the framework's Cache Hit Rate KPI → the Tokenomics formula and calculator on two workloads → where cached-token data lives in FOCUS 1.2 and 1.5 |

Every page opens over `file://` too; the guide has no external assets. Guide
pages are rich HTML by design, an intentional exception to this repo's
markdown-for-docs convention recorded in `.agents/memory/decisions.md`.

## Development

- Agent instructions: [AGENTS.md](AGENTS.md) · design: `docs/architecture.md`
  (adversarial reviews: `docs/critique-1.md`, `docs/critique-2.md`,
  `docs/critique-3-publish-gate.md`, `docs/critique-4-focus-gate.md`,
  `docs/final-status-review.md`) · tokenomics design:
  [`docs/designs/tokenomics-overview-mcp.html`](docs/designs/tokenomics-overview-mcp.html)
- Gates: `./scripts/agentic gates` · tests: `npm test` (fixture-based, no
  network) · evals: `evals/framework/` (`docs/eval-results.md`)
- Working in a clone: the checked-in `.mcp.json` loads **all three** servers
  into MCP clients that read it, running the published packages via `npx` so
  a fresh clone works with no build. To exercise your working tree instead,
  `cp .mcp.json.example .mcp.json` and build first (`dist/` is gitignored),
  then restart the client; clients read MCP config only at startup. See
  [CONTRIBUTING.md](CONTRIBUTING.md#testing-the-servers-locally).
- Releasing: [`docs/release-runbook.md`](docs/release-runbook.md).
