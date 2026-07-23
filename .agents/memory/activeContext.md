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
2. T-006 done: markdown compose layer —
   `src/crawlers/framework/markdown/{frontmatter,compose}.ts` serialize
   `ParsedCapabilityPage`/section-parser records/`Persona`/`Kpi` to canonical
   markdown; `emit.ts` writes string payloads verbatim (whole-file diff/
   hash, not per-entity); `cli.ts refresh` composes and emits all 127 docs
   (22 capabilities + 11 personas + 88 kpis + 6 section docs) under
   `data/framework/content/markdown/`. Escaping guard (`ComposeError`) throws
   on dialect-breaking plain-text items. See 20260723-t006-markdown-compose.md.
3. T-007 done (this session): derive step —
   `src/crawlers/framework/markdown/derive.ts` is the exact inverse parser
   of compose.ts (per-doc derivers for every content/derived entity type,
   including maturity-list → Action ordinal/parent_ordinal reconstruction).
   `cli.ts`: new `derive` subcommand (zero network — reads
   `content/markdown/` off disk only); `refresh` now composes markdown then
   runs it through the SAME `deriveFromDocs` before validating/emitting, so
   JSON is authoritatively derived, not taken from the HTML parse directly.
   Fixed a real bug surfaced by this (not by inspection): two capabilities'
   API-excerpt summary fallback wasn't mirrored onto `page.summary`, so it
   was silently absent from markdown — see decisions.md. Verified live,
   offline: refresh→refresh = no changes, refresh→derive = zero diff,
   derive→derive = byte-identical (md5). `./scripts/agentic gates --tier
   all` green (format, lint, typecheck, 169/169 tests, designs, integrity —
   same impl+tests-in-one-diff warning as T-005/T-006, expected —, memory,
   build). See 20260723-t007-derive-step.md.
4. Loop: T-008 → T-009 next in order (spec sections §4-§5).
5. Post-loop (supervising session): fresh-agent eval re-run ≥9/10, PR #4
   title/body update, final verification, owner runs npm publish.
6. Owner: install docs/proposed/refresh-data.yml per its checklist.
7. v1.1 candidates: Cloudflare Workers remote endpoint (artifact-from-memory
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

2026-07-23 — T-007 complete (derive step, artifact 2.1.1).
