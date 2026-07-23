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

1. T-005..T-007 done — see 20260723-t00{5,6,7}-*.md (relationships deleted,
   markdown compose layer, offline derive step).
2. T-008 done (this session): experimental flag + official-only maturity
   surface. `createServer(artifact, {experimental})` threads an
   `experimental` opt into `registerTools/registerResources/registerPrompts`;
   `main.ts` reads `FINOPS_MCP_EXPERIMENTAL=1` or `--experimental` (argv
   flags are filtered out before picking the positional artifact-dir arg —
   a real bug caught by manually running `main.js --experimental`, not by
   tests). Default surface: `get_actions` unregistered; new
   `get_maturity_assessment(capability, level?)` returns verbatim
   `capability.maturity_raw` per level + attribution + resource_link;
   `assess_maturity_path` reshaped to `gap: [{maturity, assessment_md}]`
   with crawl/walk/run-only enums **unconditionally** (it never needed
   Actions/pre-crawl once `maturity_raw` was available — same behavior in
   both modes, confirmed by a flag-matrix test); `get_maturity_model`'s
   `unofficial_extension` field is optional and omitted by default;
   `maturityLevelMd` no longer appends the parsed-Actions section for
   official levels unless experimental (this was leaking unofficial content
   into the default capability-maturity resource — found while implementing,
   not in the original spec bullet list, fixed same as everything else here);
   resource template `levels` list/completions, `overviewMd`,
   `collectionMd("maturity-model")`, prompt texts, and server `instructions`
   all drop pre-crawl/get_actions mentions unless experimental. Tests:
   `server.test.ts` now builds both a default and an experimental
   in-memory client (`client`/`expClient`), with a `describe("flag matrix")`
   block asserting tools/list shape, `get_maturity_model` output shape, and
   `assess_maturity_path`'s enum staying official-only in both modes.
   `./scripts/agentic gates --tier all` green (format, lint, typecheck,
   182/182 tests, designs, integrity — same impl+tests-in-one-diff warning,
   expected —, memory, build). Manually ran the built server both ways
   (`node dist/servers/framework/main.js` and `--experimental`) and via a
   direct `createServer`+in-memory-client probe — tool lists and
   `get_maturity_model.unofficial_extension` presence verified live. See
   20260723-t008-experimental-flag.md.
3. Loop: T-009 next (spec §5 — docs, artifact v2, evals, npm prep).
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

2026-07-23 — T-007 complete (derive step, artifact 2.1.1).
