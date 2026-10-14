# tokenomics-overview-mcp

[![license MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An unofficial [MCP](https://modelcontextprotocol.io) server that gives AI
agents grounded context on **AI tokenomics** from the
[Tokenomics Foundation](https://www.tokeneconomics.com): the Five-Layer
Tokenomics Stack, **Big-T notation** (`T(n · k · a)`), prompt-caching
mechanics and the two reference metrics — **Cache Hit Rate** and **Cache
Cost Efficiency** — consumption levers (caching, batching, right-sizing,
quantization, complexity routing, budgets, agent caps), personas, value
classification, and the FOCUS 1.5 AI-cost tracker.

Most Foundation sources are Working Drafts or Release Candidates. Every
answer states the source's status, and agents are instructed never to
present them as ratified standards.

It is the third server in the
[finops-framework-mcp](https://github.com/aaronmsoto/finops-framework-mcp)
monorepo and works alongside its siblings: `get_crosslinks` returns
`finops://framework/…` URIs for
[`finops-framework-mcp`](https://www.npmjs.com/package/finops-framework-mcp)
and `focus://spec/…` URIs for
[`finops-focus-mcp`](https://www.npmjs.com/package/finops-focus-mcp), each
backed by a quote from the Foundation page that names the target.

## Quickstart

Node >= 22 is the only requirement; the data ships inside the package.

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
    "focus-spec": { "command": "npx", "args": ["-y", "finops-focus-mcp"] }
  }
}
```

## Tool surface

`get_tokenomics_info`, `list_documents`, `get_document`, `list_layers`,
`get_layer`, `get_bigt_notation`, `get_bigt_class`, `list_levers`,
`get_lever`, `list_metrics`, `get_metric`, `calculate_cache_metrics`,
`get_provider_cache_snapshot`, `list_personas`, `get_persona`,
`list_value_categories`, `define_term`, `get_focus_ai_tracker`,
`get_crosslinks`, `search_tokenomics`. Prompts: `optimize_consumption`,
`assess_prompt_caching`, `bigt_review`. Resources live under
`tokenomics://overview/…`.

`calculate_cache_metrics` applies the cache explainer's published formulas
to your own token counts:

```
Cache hit rate        = cache read / (cache read + cache write + uncached input)
Cache cost efficiency = 1 − actual prompt cost / uncached equivalent cost
uncached equivalent cost = (cache read + cache write + uncached input) × base input price
```

The full prompts/resources/tools hierarchy of all three servers is generated
from live MCP output at
[`docs/mcp-surface.md`](https://github.com/aaronmsoto/finops-framework-mcp/blob/main/docs/mcp-surface.md).

## Data and attribution

Content © Tokenomics Foundation (a Series of LF Projects, LLC), licensed
CC BY 4.0 and adapted — see [`NOTICE.md`](NOTICE.md). Override the bundled
data with `TOKENOMICS_MCP_DATA=/path/to/data/tokenomics`.

MIT licensed code. Not affiliated with or endorsed by the Tokenomics
Foundation.
