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

- PR from `claude/tokenomics-overview-mcp-cz5jqn` to `dev`: tokenomics data
  v2.0.0 (Seven-Layer Stack, 14 docs), release wiring, all packages 0.2.0.

## Next steps

1. Owner: merge the PR to `dev`, then the rolling dev → main release PR.
2. Owner: publish `tokenomics-overview-mcp@0.2.0` by hand from `main`, set up
   its npm trusted publisher, then tag `v0.2.0`
   (`docs/release-runbook.md` top note).
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

2026-10-19 — Re-crawled for the Seven-Layer Stack; release wiring for
0.2.0 added.
