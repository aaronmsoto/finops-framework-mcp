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

Nothing — **v1 is built and shipped to PR #4**, awaiting owner review.
The loop (T-005..T-009) delivered the owner-approved descope: relationship
graph deleted, markdown-canonical pipeline (compose + offline derive),
Actions/Pre-Crawl hidden behind FINOPS_MCP_EXPERIMENTAL, npm publish prep.
Post-loop verification + eval run 3 (10/10, text-only) recorded in
docs/eval-results.md and the 20260723 loop journal.

## Next steps


1. T-005..T-008 done — see 20260723-t00{5,6,7,8}-*.md (relationships
   deleted, markdown compose layer, offline derive step, experimental flag +
   official-only maturity surface).
2. T-009 done (this session, spec §5): docs, revised evals, npm publish
   prep. `docs/architecture.md` §1-§10 rewritten for v1 (relationship graph
   documented as deleted rather than described as present; markdown
   compose/derive stages; final 11/12-tool surface + experimental flag;
   flag-matrix + round-trip tests called out in §8; risk table and
   definition-of-done updated to match). `README.md`: official-only framing,
   `npx finops-framework-mcp` quickstart (Claude Code/Desktop configs
   updated to match), experimental-extensions section replacing the old
   relationship-graph mention. `.agents/specs/finops-framework-mcp-server.md`
   got a superseded-by banner. `evals/framework/eval.xml`: Q1 now points at
   `get_maturity_assessment`/`get_capability include maturity` and drops the
   "unofficial parsing" phrasing; Q2 replaced entirely (was a prerequisite-
   graph question, now "quote two statements from the official Sustainability
   Walk assessment" — verified the exact quoted sentences exist verbatim in
   `data/framework/content/capabilities.json`); Q10 replaced (was a
   get_actions/pre-crawl question, now "how many official levels" with an
   explicit "must not volunteer Pre-Crawl" bar). `package.json`: un-privated,
   version 1.0.0, `files` whitelist (dist, data/framework, README, LICENSE,
   NOTICE.md), `mcpName`, `repository`, `keywords`, `prepublishOnly`. New
   root `server.json` (MCP registry manifest: npm package, stdio transport).
   Verified `npm pack --dry-run` (after `rm -rf dist && npm run build` —
   the first dry-run attempt still had stale `dist/**/infer.js` and
   `graph.js` from before those source files were deleted in T-005; tsc
   doesn't clean removed outputs) ships exactly `dist/`, `data/framework/`,
   `README.md`, `LICENSE`, `NOTICE.md`, `package.json` — 183 files, ~402KB
   packed / 1.6MB unpacked, confirmed via `npm pack --dry-run --json` parsed
   for top-level paths. `./scripts/agentic gates --tier all` green (format,
   lint, typecheck, 182/182 tests unchanged, designs, integrity — same
   impl+docs-in-one-diff warning as prior tasks in this chain, expected —,
   memory, build). Manually probed the built server via a throwaway
   in-memory-client script: default `tools/list` = 11 tools (no
   `get_actions`, no "pre-crawl" substring anywhere in the JSON),
   `--experimental` = 12 tools including `get_actions`, and does mention
   pre-crawl — matches what the rewritten docs claim exactly. Also ran
   `node dist/servers/framework/main.js` directly (the npx-quickstart entry
   point) and confirmed the startup line loads data v2.1.1/22 capabilities
   with no error. Manifest `schema_version` is 2.0.0 (confirmed, unchanged
   from T-005); `data_version` is 2.1.1, not the spec's literal "2.0.0"
   example value, because T-006/T-007 already did legitimate minor content
   regens after the schema bump — did not force it back down artificially,
   since the task's actual acceptance criterion only names schema_version.
3. Loop tasks are all complete. Remaining work is for the supervising
   session, not the loop: fresh-agent eval re-run on the revised eval.xml
   (target ≥9/10), PR #4 title/body update reflecting the full v1 scope,
   final independent verification pass, then the owner runs the actual
   `npm publish` (this session only verified `--dry-run`).
4. Owner: install docs/proposed/refresh-data.yml per its checklist.
5. v1.1 candidates: Cloudflare Workers remote endpoint (artifact-from-memory
   loader), Action rename decision (moot while hidden), cheerio slimming.

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

2026-07-23 — T-009 complete (v1 docs, revised evals, npm publish prep).
