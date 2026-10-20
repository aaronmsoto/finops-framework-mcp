# 2026-10-20 — tokenomics-overview-mcp 0.2.1 to validate trusted publishing

## Tokenomics-only patch release prep — 2026-10-20T17:00:00Z

- Did: the re-pointed `v0.2.0` tag run (4fda051) published finops-framework-mcp
  and finops-focus-mcp 0.2.0 via OIDC (their trusted publishers now show as
  valid). It skipped tokenomics-overview-mcp, because 0.2.0 had been
  published by hand, so its trusted publisher stayed "pending validation"
  (it expires 2026-10-22 15:24 UTC unless a CI publish uses it). All three
  are listed in the MCP Registry at 0.2.0.
- Did: bumped only tokenomics to 0.2.1 (package.json, server.json,
  SERVER_VERSION). Added scripts/mcp-registry-publish-once.sh, which checks
  /v0/servers/{name}/versions/{version} (200 = listed). publish.yml's
  registry steps use it, so a tag that bumps one package does not fail on
  the others' duplicate manifests. Owner-approved release wiring (protected path).
- Result: dry run with a stub `publisher`: framework@0.2.0 and focus@0.2.0
  skipped, tokenomics submitted; npm skip check: framework and focus skip,
  tokenomics@0.2.1 publishes. See the PR for test output.
- Next (owner): merge to dev → main, tag `v0.2.1` before 2026-10-22 15:24 UTC.
