# Roadmap — product intent

<!--
  The owner's prioritized feature backlog: the tier ABOVE specs and tasks.
  One entry per feature, newest thinking wins, ordered by priority.

  Entry format:
    ## <feature title>  —  <status>
    One paragraph: what and why. Links to design/spec once they exist.

  Statuses: idea → designing → specced → building → done (or dropped).
  Flow: idea lands here → /design-feature produces docs/designs/<slug>.html
  + .agents/specs/<slug>.md and sets "designing" → owner approves the design
  (the human checkpoint) → /plan-feature decomposes the spec into tasks.json
  and sets "building" → loop completes the tasks → "done".
-->

## FOCUS 1.3 / 1.4 / 1.5 support in finops-focus-mcp  —  idea

Hyperscalers export FOCUS 1.0/1.2 (Azure and GCP 1.2 still preview); 1.3 is
only at a few SaaS/data providers and nobody emits 1.4 yet, so 1.0/1.2 stay
the default. Owner decision (2026-10-20): build 1.3, 1.4 and 1.5 together
right after 1.5's 3 Dec 2026 ratification — dataset-aware ingest, a
`## Requirements` parser fix, dataset in URIs (Cost and Usage default), a
general from/to diff, re-point the tokenomics FOCUS links to real 1.5 URIs,
and a provider-support resource. Plan: `docs/adr/0001-focus-1-3-to-1-5-support.md`
(proposed); evidence: `docs/research/focus-version-support.md`.

## tokenomics-overview-mcp — a third MCP server for AI tokenomics  —  specced

Serve Tokenomics Foundation guidance (Five-Layer Stack, Big-T notation,
prompt-cache mechanics and metrics, consumption levers, personas, value
classification, FOCUS 1.5 AI tracker) to agents alongside the framework and
FOCUS servers, with stated cross-links into both. Owner answered the design
questions 2026-09-25 (answers = approval to build).
Design: `docs/designs/tokenomics-overview-mcp.html`; spec:
`.agents/specs/tokenomics-overview-mcp.md`.

## Tokenomics: ingest the Organizational Routing Guide  —  idea

Waiting on the source. Tokenomics Foundation's "Routing AI Requests: An
Organizational Guide" is a Consumption WG Sprint 2 draft ("Not a working
group position", 2026-10-08). When it is final, ingest it as document 13:
cost per outcome, cost per task and misroute rate metrics, five routing
patterns, proxy/router/gateway terms, and a possible
`calculate_routing_metrics` tool. Comparison and ingest plan:
`docs/research/tokenomics-routing-guide-draft.md`.
