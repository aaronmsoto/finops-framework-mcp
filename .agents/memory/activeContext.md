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

- Nothing. tokenomics-overview-mcp is built and merged to `dev` (#37, #38);
  rolling release PR #36 (dev → main) is green and awaits the owner.

## Next steps

1. Owner: merge #36, publish `tokenomics-overview-mcp` to npm for the first
   time by hand, then set up trusted publishing (`docs/release-runbook.md`).
2. With owner approval only (protected paths): add tokenomics steps to
   `.github/workflows/publish.yml` and a case to `tests/version-sync.test.ts`.
3. Parked: when the Tokenomics Foundation finalizes the Organizational Routing
   Guide, ingest it per `docs/research/tokenomics-routing-guide-draft.md`.

## Open questions

- Routing guide: are "cost per outcome" and "cost per task" separate metrics?
  Our `routing-wars` doc conflates them. Does the proxy/router/gateway split
  replace the L5 "Provider Router (Proxy)" grouping? Wait for the final text;
  don't decide either one now.
- Curriculum privacy, and what to do with the 29 unregistered pages: owner decides.

## Last updated

2026-10-16 — Reviewed the routing-guide draft; owner parked ingest until it
is final.
