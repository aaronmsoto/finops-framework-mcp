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

- PR to `dev`: tokenomics on the Cloudflare Worker (`/mcp/tokenomics`),
  per-artifact search-index caching, the "Is prompt caching paying off?"
  demo walkthrough, and proposed ADR-0001 for FOCUS 1.3–1.5.

## Next steps

1. Owner: merge the PR, then `npx wrangler deploy` and redeploy the demo
   (`docs/deploy-worker.md`, `docs/deploy-demo.md`). Smoke test
   `/mcp/tokenomics` with the curl in deploy-worker step 5.
2. FOCUS: nothing until 1.5 ratifies (3 Dec 2026). Then build 1.3, 1.4 and
   1.5 together per `docs/adr/0001-focus-1-3-to-1-5-support.md`, and accept
   the ADR.
3. Parked: Sprint 2 drafts (routing guide, terminology & KPIs, measuring
   AI value in SE). They show up in `manifest.json` `unregistered`; ingest
   when final (`docs/research/tokenomics-routing-guide-draft.md`).

## Open questions

- ADR-0001: whether 1.3+ ingest should read `specification/requirements_model/`
  JSON instead of the column markdown. Decide when building.
- Routing guide: are cost per outcome and cost per task two metrics? Wait
  for the final text.
- Curriculum privacy and the remaining unregistered pages: owner decides.

## Last updated

2026-10-20 — Tokenomics added to the Worker and demo; FOCUS 1.3–1.5 plan
written as a proposed ADR.
