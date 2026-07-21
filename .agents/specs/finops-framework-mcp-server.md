# Spec: FinOps Framework MCP server (crawler + data artifact + server)

## Problem

The FinOps Framework exists only as website prose at finops.org/framework.
An AI agent asked to reason about FinOps capabilities, maturity, personas, or
prerequisites has no structured, queryable interface — it must scrape pages
ad hoc, cannot distinguish official guidance from interpretation, and cannot
traverse relationships between capabilities.

## Outcome

`npm run refresh` crawls finops.org into a versioned, schema-validated data
artifact under `data/framework/`; `@finops-mcp/server-framework` serves that
artifact over MCP stdio with resources (`finops://…` for all framework
entities), read-only tools (search, list/get capability, actions, KPIs,
prerequisite closure, maturity path, persona map, version diff), and prompts
(explain-framework, assess-capability-maturity, plan-maturity-roadmap,
map-personas-to-capabilities). Full design: `docs/architecture.md`.

## Non-goals

- No write/mutating tools; no external publishing (npm, registries).
- No headless-browser crawling; no scraping beyond framework/KPI pages.
- No FOCUS server (layout leaves room; nothing built).
- No changes to the official maturity vocabulary beyond the flagged
  `pre-crawl` extension approved in the build brief.

## Acceptance criteria

- [ ] `npm run refresh` produces `data/framework/{schema,content,derived,manifest.json}` + diff report; second run with unchanged site is a no-op diff.
- [ ] Committed artifact contains 6 Principles, 3 Phases, 4 Domains, 22 Capabilities, 11 Personas, 4 MaturityLevels, KPI library; every record carries source_url/retrieved_at/license.
- [ ] `official: false` flags on pre-crawl, all Actions, all inferred edges; inferred edges live only in `derived/` with rationale + confidence.
- [ ] Server refuses startup on artifact schema violation with actionable error; starts and serves resources/tools/prompts per architecture §5 otherwise.
- [ ] All tools are readOnlyHint, structured output, paginated where list-shaped; unknown slug returns nearest-match suggestions in-band.
- [ ] `./scripts/agentic gates --tier full` passes; parser tests run from fixtures without network.
- [ ] Eval suite ≥9/10 (docs/eval-results.md); critique gates 1 and 2 show zero unresolved BLOCKERs (docs/critique-1.md, docs/critique-2.md).

## Open questions

- None blocking — owner pre-approved the plan shape, gates, and `pre-crawl`
  extension in the 2026-07-21 build brief (recorded in the journal).
