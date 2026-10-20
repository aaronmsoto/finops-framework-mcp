# tokenomics-overview-mcp

[![tokenomics-overview-mcp on npm](https://img.shields.io/npm/v/tokenomics-overview-mcp?label=tokenomics-overview-mcp)](https://www.npmjs.com/package/tokenomics-overview-mcp)
[![finops-framework-mcp on npm](https://img.shields.io/npm/v/finops-framework-mcp?label=finops-framework-mcp)](https://www.npmjs.com/package/finops-framework-mcp)
[![finops-focus-mcp on npm](https://img.shields.io/npm/v/finops-focus-mcp?label=finops-focus-mcp)](https://www.npmjs.com/package/finops-focus-mcp)
[![license MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An unofficial [MCP](https://modelcontextprotocol.io) server that gives AI
agents grounded context on **AI tokenomics** from the
[Tokenomics Foundation](https://www.tokeneconomics.com):

- the **Seven-Layer Tokenomics Stack**: L0 Energy through L6 Demand, with L5
  AI access and control covering proxies, model routers and AI gateways
- **Big-T notation** (`T(n · k · a)`) for how token consumption scales with
  usage, model calls and agent depth
- prompt-caching mechanics and the two reference metrics, **Cache Hit Rate**
  and **Cache Cost Efficiency**, with a calculator for your own token counts
- consumption levers: caching, batching, right-sizing, quantization,
  complexity routing, budgets, agent caps
- model-routing market and survey context from the Tokenomics Brief, personas,
  value classification, and what **FOCUS 1.5** does for AI cost

Most Foundation sources are working drafts or release candidates. Every answer
states its source's status, and agents are instructed never to present them as
ratified standards.

It is one of three servers in the
[finops-framework-mcp](https://github.com/aaronmsoto/finops-framework-mcp)
monorepo and works alongside
[`finops-framework-mcp`](https://www.npmjs.com/package/finops-framework-mcp)
(the FinOps Framework) and
[`finops-focus-mcp`](https://www.npmjs.com/package/finops-focus-mcp) (the
FOCUS billing spec): each `get_crosslinks` link is backed by a quote from the
Foundation page that names the target, with a `finops://framework/…` or
`focus://spec/…` URI to read with those servers (no URI yet for FOCUS 1.5
working-draft names).

**Usage guide:**
[aaronmsoto.github.io/finops-framework-mcp/tokenomics-server.html](https://aaronmsoto.github.io/finops-framework-mcp/tokenomics-server.html)

## Quickstart

Node >= 22 is the only requirement; the data ships inside the package and the
server runs offline.

```bash
npx -y tokenomics-overview-mcp
```

Claude Code:

```bash
claude mcp add tokenomics-overview -- npx -y tokenomics-overview-mcp
```

Claude Desktop (`claude_desktop_config.json`), with all three servers:

```json
{
  "mcpServers": {
    "tokenomics-overview": {
      "command": "npx",
      "args": ["-y", "tokenomics-overview-mcp"]
    },
    "finops-framework": {
      "command": "npx",
      "args": ["-y", "finops-framework-mcp"]
    },
    "focus-spec": {
      "command": "npx",
      "args": ["-y", "finops-focus-mcp"]
    }
  }
}
```

Check the installed package and data version with
`npx -y tokenomics-overview-mcp --version`.

### Remote option

The same 20 tools are also served over Streamable HTTP at `/mcp/tokenomics`
by the monorepo's Cloudflare Worker (stateless; no experimental tools). Point
a Streamable HTTP client at a deployed Worker instead of running `npx`:

```bash
claude mcp add --transport http tokenomics-overview "$WORKER_URL/mcp/tokenomics"
```

See
[`docs/deploy-worker.md`](https://github.com/aaronmsoto/finops-framework-mcp/blob/main/docs/deploy-worker.md)
to deploy one.

## How to use it

Start with `get_tokenomics_info {}`: it lists every source document with its
status and suggests next calls. Then, for example:

- "Which layer owns model routing and AI gateways?" → `list_layers`,
  `get_layer {layer: "l5"}`, `list_levers {layer: 5}`
- "How does this agent's token use scale?" → `get_bigt_notation`,
  `get_bigt_class`, or the `bigt_review` prompt
- "Is our prompt caching saving money?" → `calculate_cache_metrics` with your
  cache read, cache write and uncached input token counts
- "What does FOCUS 1.5 add for AI cost?" → `get_focus_ai_tracker`, then
  `get_crosslinks` to hand off to the FOCUS server

`calculate_cache_metrics` applies the cache explainer's published formulas:

```
Cache hit rate           = cache read / (cache read + cache write + uncached input)
Cache cost efficiency    = 1 − actual prompt cost / uncached equivalent cost
uncached equivalent cost = (cache read + cache write + uncached input) × base input price
```

## Tool surface

20 tools by default:

| Job | Tools |
| --- | --- |
| Orientation & documents | `get_tokenomics_info`, `list_documents`, `get_document`, `search_tokenomics` |
| Stack, Big-T & levers | `list_layers`, `get_layer`, `get_bigt_notation`, `get_bigt_class`, `list_levers`, `get_lever` |
| Metrics & calculation | `list_metrics`, `get_metric`, `calculate_cache_metrics`, `get_provider_cache_snapshot` |
| People, value & vocabulary | `list_personas`, `get_persona`, `list_value_categories`, `define_term` |
| FOCUS 1.5 & the other servers | `get_focus_ai_tracker`, `get_crosslinks` |

Prompts: `optimize_consumption`, `assess_prompt_caching`, `bigt_review`.
Resources live under `tokenomics://overview/…` (5 fixed resources and 6 URI
templates for documents, layers, Big-T classes, levers, metrics and personas).

With `FINOPS_MCP_EXPERIMENTAL=1`, the server also registers `get_crosswalk`:
21 curated mappings into the other two servers that no Foundation page states,
each labeled UNOFFICIAL with its reasoning.

The full prompts/resources/tools hierarchy of all three servers is generated
from live MCP output at
[`docs/mcp-surface.md`](https://github.com/aaronmsoto/finops-framework-mcp/blob/main/docs/mcp-surface.md).

## Configuration

| Variable | Effect |
| --- | --- |
| `TOKENOMICS_MCP_DATA` | Use a locally refreshed artifact directory instead of the packaged `data/tokenomics` |
| `FINOPS_MCP_EXPERIMENTAL=1` | Register the unofficial `get_crosswalk` tool |

## Data and attribution

Content © Tokenomics Foundation (a Series of LF Projects, LLC), licensed
CC BY 4.0 and adapted — see [`NOTICE.md`](NOTICE.md). The data is crawled
from tokeneconomics.com; working-group drafts the Foundation marks as internal
are not ingested until they are final, and the State of Tokenomics report (all
rights reserved) is not included.

MIT licensed code. Not affiliated with or endorsed by the Tokenomics
Foundation.
