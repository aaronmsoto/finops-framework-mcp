# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight

Nothing — **v1 is built and shipped to PR #4**, awaiting owner review.
The loop (T-005..T-009) delivered the owner-approved descope: relationship
graph deleted, markdown-canonical pipeline (compose + offline derive),
Actions/Pre-Crawl hidden behind FINOPS_MCP_EXPERIMENTAL, npm publish prep.
Post-loop verification + eval run 3 (10/10, text-only) recorded in
docs/eval-results.md and the 20260723 loop journal.

## Next steps
      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

T-018 done (this session, spec: loop-harness-improvements.md v1.1 candidate
list): cheerio moved `dependencies` → `devDependencies` in package.json
(package-lock.json regenerated via `npm install --package-lock-only`; its
transitive deps now carry `"dev": true`; incidentally also synced the
lockfile's stale root `version` field 0.1.0 → 1.0.0 to match package.json).
`src/crawlers/framework/parse/helpers.ts` no longer statically imports
cheerio — `resolveCheerio()` requires it lazily via
`createRequire(import.meta.url)` on the first `load()` call, memoized after
that, throwing `CHEERIO_MISSING_MESSAGE` (names
`npm install --save-dev cheerio`) on resolution failure.
`src/crawlers/framework/cli.ts` dropped its own static `import * as cheerio`
and reuses `load` from parse/helpers.js in `htmlFragmentToMd`. `derive`
never touches cheerio (markdown/derive.ts has no cheerio references beyond
a comment) and the MCP server never imports crawler code (existing ESLint
boundary), so both are unaffected by the move. New test
`src/crawlers/framework/parse/helpers.test.ts` exercises the missing-cheerio
path via an injected failing `requireFn` — no need to actually uninstall
the package for the test suite to cover it.

Verified beyond gates: `mv node_modules/cheerio node_modules/cheerio.hidden`,
then confirmed (a) `node dist/crawlers/framework/cli.js derive` still
derives 22 capabilities/88 kpis/489 actions with 0 changes, (b)
`node dist/servers/framework/main.js` still starts and prints "data v2.1.1,
22 capabilities", (c) calling `parsePrinciples` directly (a section-page
parser that goes through `load()`) throws exactly
`CHEERIO_MISSING_MESSAGE`; restored cheerio afterward and confirmed parsing
works again. `./scripts/agentic gates` green throughout (189/189 tests, up
from 186 — the 3 new helpers.test.ts cases).

Otherwise nothing else in flight — **v1 is built and shipped to PR #4**,
awaiting owner review. The loop (T-005..T-009) delivered the owner-approved
descope: relationship graph deleted, markdown-canonical pipeline (compose +
offline derive), Actions/Pre-Crawl hidden behind FINOPS_MCP_EXPERIMENTAL,
npm publish prep. Post-loop verification + eval run 3 (10/10, text-only)
recorded in docs/eval-results.md and the 20260723 loop journal.

## Next steps

1. T-019 (`--version` flag) and other v1.1 candidates (Cloudflare Workers
   remote endpoint, Action rename decision) remain pending/queued.
2. T-005..T-009 done — see 20260723-t00{5..9}-*.md for detail (relationships
   deleted, markdown compose layer, offline derive step, experimental flag +
   official-only maturity surface, v1 docs/evals/npm publish prep). Remaining
   work is for the supervising session, not the loop: fresh-agent eval re-run
   on the revised eval.xml (target ≥9/10), PR #4 title/body update reflecting
   the full v1 scope, final independent verification pass, then the owner
   runs the actual `npm publish` (only `--dry-run` verified so far).
3. Owner: install docs/proposed/refresh-data.yml per its checklist.

## Open questions

- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind FINOPS_MCP_EXPERIMENTAL.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); also the
  refresh-workflow GITHUB_TOKEN/CI caveats mirror the template's item 3.

## Last updated

2026-07-23 — T-018 complete (cheerio moved to devDependencies, loaded
lazily).
