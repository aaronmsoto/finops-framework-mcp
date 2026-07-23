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

1. T-005 done: relationship functionality fully deleted (see
   20260723-t005-delete-relationships.md); artifact at 2.0.0.
2. T-006 done (this session): markdown compose layer —
   `src/crawlers/framework/markdown/{frontmatter,compose}.ts` serialize
   `ParsedCapabilityPage`/section-parser records/`Persona`/`Kpi` to canonical
   markdown; `emit.ts` writes string payloads verbatim (whole-file diff/
   hash, not per-entity); `cli.ts refresh` composes and emits all 127 docs
   (22 capabilities + 11 personas + 88 kpis + 6 section docs) under
   `data/framework/content/markdown/`. Escaping guard (`ComposeError`) throws
   on dialect-breaking plain-text items. Artifact regenerated offline (0
   network fetches) — data_version 2.0.0 → 2.1.0 (minor, entity add);
   double-refresh confirmed byte-idempotent ("No changes") by direct
   observation, not just unit test. `./scripts/agentic gates --tier all`
   green (format, lint, typecheck, 148/148 tests, designs, integrity — same
   impl+tests-in-one-diff warning as T-005, expected —, memory, build).
   IMPORTANT for T-007: this session had to invent the non-capability doc
   layouts (spec only fully specifies the capability doc) — see
   decisions.md 2026-07-23 entry and 20260723-t006-markdown-compose.md
   before writing `derive.ts`'s parser.
3. Loop: T-007 → T-009 next in order (spec sections §3-§5).
4. Post-loop (supervising session): fresh-agent eval re-run ≥9/10, PR #4
   title/body update, final verification, owner runs npm publish.
5. Owner: install docs/proposed/refresh-data.yml per its checklist.
6. v1.1 candidates: Cloudflare Workers remote endpoint (artifact-from-memory
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

2026-07-23 — T-006 complete (markdown compose layer, artifact 2.1.0).
