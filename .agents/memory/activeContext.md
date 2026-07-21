# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

The FinOps Framework MCP server is BUILT (owner build brief of 2026-07-21,
executed overnight): crawler → versioned data artifact (v1.1.0: 22
capabilities, 489 assessment items, 88 KPIs, 65 official + 19 inferred
edges) → stdio MCP server (13 read-only tools, finops:// resources, 4
prompts). Two adversarial critique gates passed with all blockers fixed
(docs/critique-1.md, docs/critique-2.md); eval suite 10/10
(docs/eval-results.md); 89 tests; gates --tier all green. PR to dev opened
at the end of the overnight run — see the session journal
(20260721-server-build.md) and the PR body for the definition-of-done
checklist.

## Next steps

1. Owner: review/merge the build PR (squash to dev, then release train).
2. Owner decision (critique-1 M11): rename derived entity `Action` →
   `MaturityCharacteristic`? Semantics already rubric-framed everywhere;
   rename is mechanical (types, schema file name, tool name get_actions →
   get_maturity_characteristics would be a breaking tool rename — decide).
3. Owner: install docs/proposed/refresh-data.yml per its checklist to
   activate monthly data refreshes (until then, refreshes are manual
   `npm run refresh`).
4. Optional next feature: streamable HTTP entry point (design keeps it a
   new main only); FOCUS sibling server reusing src/shared.

## Open questions

- M11 rename (above) — owner call.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); also the
  refresh-workflow GITHUB_TOKEN/CI caveats mirror the template's item 3.

## Last updated

2026-07-21 — overnight build session (owner brief), phases 0-7 complete.
