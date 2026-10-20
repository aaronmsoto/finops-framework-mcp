# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated
-->

## In flight

- Docs PR to `dev`: README / package READMEs / NOTICE and the usage guide
  now cover all three servers (new guide pages: tokenomics-server,
  example-ai-caching).

## Next steps

1. Owner: merge the docs PR, then dev → main; the Pages workflow republishes
   the guide on that push to `main`.
2. Released: finops-framework-mcp and finops-focus-mcp 0.2.0,
   tokenomics-overview-mcp 0.2.1. All three trusted publishers are valid and
   all three servers are in the MCP Registry.
3. Next FOCUS work, in order (`docs/research/focus-version-support.md`):
   size multi-dataset parsing for 1.3/1.4, then ingest 1.5 after its 3 Dec
   2026 ratification and re-point the tokenomics FOCUS links.
4. Parked: Sprint 2 drafts (routing guide, terminology & KPIs, measuring
   AI value in SE). They show up in `manifest.json` `unregistered`; ingest
   when final (`docs/research/tokenomics-routing-guide-draft.md`).

## Open questions

- Routing guide: are cost per outcome and cost per task two metrics? Wait
  for the final text.
- Curriculum privacy and the remaining unregistered pages: owner decides.

## Last updated

2026-10-20 — Released 0.2.0 / 0.2.1; docs and the Pages guide updated for
all three servers.
