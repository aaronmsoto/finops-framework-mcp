# 2026-10-20 — Docs and Pages site cover all three MCP servers

## README, package READMEs and the usage guide updated for three servers — 2026-10-20T18:00:00Z

- Did: rewrote README.md (also the finops-framework-mcp npm page) around all
  three servers: overview table, quickstart for each, env vars, how to use
  each, how they hand off by URI, per-server refresh commands, attribution
  for all three sources. Rewrote packages/tokenomics-overview-mcp/README.md;
  gave packages/finops-focus-mcp/README.md a siblings section. Added a
  Tokenomics Foundation section to the root NOTICE.md (the repo redistributes
  data/tokenomics). Added tokenomics to .mcp.json and to CONTRIBUTING's copy.
- Did: added two guide pages, docs/guide/tokenomics-server.html (page 4,
  reference) and docs/guide/example-ai-caching.html (page 9, the first
  example using all three servers). Every count, quote and transcript in them
  comes from live probes (framework data v2.1.1, FOCUS 1.2, tokenomics
  data v2.0.0). Updated the shared chrome on all pages: a "Tokenomics MCP"
  nav item, an "AI Caching" item in the Examples sub-nav, "Page N of 9", and
  a footer with Tokenomics Foundation attribution. Updated index.html (three
  server cards, install, first call, next steps). Corrected the Worker
  section, which said "no rate limiting"; #35 added a per-IP limit.
- Result: all internal links and anchors resolve. Chromium shows no
  horizontal overflow at 390px on the new and updated pages.
  framework-server, example-showback and example-forecasting overflow at
  390px (53–91px, wide tables), identically on dev, so that predates this
  change and was left alone.
- Next (owner): optionally add the two new pages to the pages.yml guard list
  (protected path); docs/deploy-pages.md notes the gap.
