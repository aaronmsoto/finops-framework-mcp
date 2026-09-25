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

## tokenomics-overview-mcp — a third MCP server for AI tokenomics  —  specced

Serve Tokenomics Foundation guidance (Five-Layer Stack, Big-T notation,
prompt-cache mechanics and metrics, consumption levers, personas, value
classification, FOCUS 1.5 AI tracker) to agents alongside the framework and
FOCUS servers, with stated cross-links into both. Owner answered the design
questions 2026-09-25 (answers = approval to build).
Design: `docs/designs/tokenomics-overview-mcp.html`; spec:
`.agents/specs/tokenomics-overview-mcp.md`.
