# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight

**v1 descope build, running via the autonomous loop** (owner-approved plan,
2026-07-22): delete relationship functionality, adopt a markdown-canonical
pipeline (compose + derive), hide Actions and Pre-Crawl behind
FINOPS_MCP_EXPERIMENTAL, npm publish prep. Spec:
`.agents/specs/v1-official-only.md` (binding; tasks T-005..T-009 cite its
sections). Work lands on branch claude/session-k75rxy — open PR #4 becomes
the v1 PR. The v0.1 state (all critique gates + 10/10 evals) is journaled in
20260721-server-build.md.

## Next steps
      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

**v1 descope build, running via the autonomous loop** (owner-approved plan,
2026-07-22): delete relationship functionality, adopt a markdown-canonical
pipeline (compose + derive), hide Actions and Pre-Crawl behind
FINOPS_MCP_EXPERIMENTAL, npm publish prep. Spec:
`.agents/specs/v1-official-only.md` (binding; tasks T-005..T-009 cite its
sections). Work lands on branch claude/session-k75rxy — open PR #4 becomes
the v1 PR. The v0.1 state (all critique gates + 10/10 evals) is journaled in
20260721-server-build.md.

## Next steps

1. T-005 done (this session): relationship functionality fully deleted —
   `infer.ts`/`infer.test.ts`/`graph.ts` removed; `CapabilityRelationship`
   and friends gone from types/schemas/artifact loader; `get_prerequisites`/
   `get_related` tools and the `graph` resource removed; `relationships`
   dropped from `get_capability` INCLUDE and `assess_maturity_path` lost
   `related_prerequisites_hint`; `parse/capability.ts` no longer extracts
   `definition_capability_links`/`inputs_outputs_capability_links` (KPI
   `related_capability_slugs` untouched, as required). `emit.ts`
   `bumpVersion` now takes the previous manifest and forces
   `<new schema major>.0.0` on a schema major bump. Artifact regenerated
   offline (seeded cache, zero network) at data_version/schema_version
   2.0.0; `data/framework/derived|schema/relationships-*` removed via
   `git rm`. `./scripts/agentic gates --tier all` green (format, lint,
   typecheck, 79/79 tests, designs, integrity — 1 warning re: impl+tests in
   one diff, expected for a deletion task —, memory, build).
2. Loop: T-006 → T-009 next in order (spec sections §2-§5).
3. Post-loop (supervising session): fresh-agent eval re-run ≥9/10, PR #4
   title/body update, final verification, owner runs npm publish.
4. Owner: install docs/proposed/refresh-data.yml per its checklist.
5. v1.1 candidates: Cloudflare Workers remote endpoint (artifact-from-memory
   loader), Action rename decision (moot while hidden), cheerio slimming.

## Open questions

- M11 rename (above) — owner call.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); also the
  refresh-workflow GITHUB_TOKEN/CI caveats mirror the template's item 3.

## Last updated

2026-07-23 — T-005 complete (relationship deletion + schema 2.0.0 bump).
