# 2026-07-23 — T-009: v1 docs, revised evals, npm publish prep

Spec: `.agents/specs/v1-official-only.md` §5.

## What I did

- `docs/architecture.md`: rewrote §1 (status line points at the v1 spec,
  goal statement drops the relationship graph and calls out the
  experimental gate), §2 (added `crawlers/framework/markdown/` to the
  layout diagram), §3 (Action row now says experimental-only with the real
  gating mechanism; replaced the `CapabilityRelationship` row and the whole
  "Relationship inference pass" subsection with a paragraph documenting the
  v1 deletion decision and why — Problem statement from the spec, files
  removed), §4 (added `content/markdown/**` to the artifact tree, wrote up
  the compose→derive pipeline and the refresh↔derive parity rule), §5
  (added the experimental-flag paragraph; rewrote the resource table to
  drop the graph resource and describe conditional pre-crawl behavior;
  rewrote the tool table against the actual current `tools.ts` — verified
  every row against source rather than trusting the spec's summary, since
  `get_actions` is now conditionally registered and `assess_maturity_path`'s
  shape changed in T-008; added the 11/12-tool count; rewrote the prompt
  table against `prompts.ts`), §6 (split the old 4-stage pipeline into 7
  stages to include compose/derive explicitly), §8 (added markdown-layer
  test descriptions, replaced "Graph tests" with the flag-matrix
  description), §9 (dropped the "Inferred edges wrong" risk row, added a
  markdown-dialect-drift row and an unofficial-extensions-mistaken-for-
  official row), §10 (definition-of-done points 3 and 5 rewritten — the
  graph-queryable line doesn't apply anymore).
- `README.md`: rewrote the intro (official-only framing, dropped "capability
  relationship graph" from the feature list), the pipeline diagram
  (fetch→parse→sanitize→compose→derive→validate→diff→emit), added a
  paragraph on markdown being canonical, quickstart now leads with
  `npx finops-framework-mcp` (Claude Code/Desktop configs updated to use
  `npx` instead of a local `dist/` path), rewrote the tool-count sentence
  against the real 11-tool default list, added an "Experimental extensions
  (opt-in)" section documenting Pre-Crawl + `get_actions` and explicitly
  noting the relationship graph was deleted (not hidden).
- `.agents/specs/finops-framework-mcp-server.md`: added a superseded-by
  blockquote at the top pointing at `v1-official-only.md`, per spec
  instruction ("old spec gets a superseded note").
- `evals/framework/eval.xml`:
  - Q1: `expected_calls` now says `get_maturity_assessment` (was
    `get_actions`); dropped the "must note unofficial parsing" bonus clause
    from `<expected>` since the default path no longer touches unofficial
    content for this question.
  - Q2: fully replaced. Old Q2 asked about a prerequisite-graph relationship
    that no longer exists. New Q2: "What does a Walk-level Sustainability
    practice look like? Quote two statements from the official maturity
    assessment." I pulled `sustainability.maturity_raw.walk` from the
    committed artifact to confirm the exact sentences a grader would check
    against are real, verbatim text (not paraphrased).
  - Q10: fully replaced. Old Q10 asked "what does Pre-Crawl mean in this
    server" via `get_actions` — but that tool and pre-crawl are both hidden
    by default now, so the question would be unanswerable tools-only in the
    v1 default posture. New Q10: "how many maturity levels does the official
    model define, and what are they" with an explicit bar that the server
    must not volunteer Pre-Crawl.
- `package.json`: removed `"private": true`, bumped version to `1.0.0`,
  added `files` (dist, data/framework, README.md, LICENSE, NOTICE.md),
  `mcpName`, `repository`, `keywords`, `description` update,
  `prepublishOnly: "npm run build && npm test"`.
- New `server.json` at repo root (MCP registry manifest): name
  `io.github.aaronmsoto/finops-framework-mcp`, npm package identifier
  `finops-framework-mcp`, stdio transport. Not in the `files` whitelist —
  it's for registry publish, not the npm tarball.

## A build hygiene bug I found and fixed along the way

First `npm pack --dry-run` (before I'd rebuilt `dist/` fresh) still listed
`dist/crawlers/framework/infer.js` and `dist/servers/framework/graph.js` —
files whose *source* was deleted back in T-005. `tsc` doesn't clean stale
outputs for removed inputs, so the checked-in `dist/` from before this loop
chain started still had them. `rm -rf dist && npm run build` fixed it; this
isn't a `.gitignore`d directory issue (dist/ is gitignored, so this was a
purely local build-cache staleness problem, not something in git) but it's
worth remembering for a real publish: **always clean-build before packing.**

## Verification

- `rm -rf dist && npm run build` then `npm pack --dry-run --json | jq` (via
  a small python parse): tarball top-level paths are exactly `LICENSE`,
  `NOTICE.md`, `README.md`, `data`, `dist`, `package.json` — 183 files total,
  402.0 kB packed / 1.6 MB unpacked. No `src/`, `tests/`, fixtures, or
  `.cache` leaked in.
- `./scripts/agentic gates --tier all`: **PASS** — format, lint, typecheck,
  test (182/182, unchanged from T-008 — this task touched no test files),
  designs, integrity (same impl+docs-in-one-diff warning as every task in
  this chain, expected), memory, build.
- Manually probed the built server with a throwaway in-memory-client script
  (`createServer(artifact, {experimental})` both ways): default `tools/list`
  has exactly 11 tools, no `get_actions`, and `JSON.stringify(tools)`
  contains no "pre-crawl" substring (case-insensitive); `--experimental`
  path has 12 tools including `get_actions` and does mention pre-crawl.
  Matches the tool tables and counts I wrote into both docs exactly, rather
  than trusting the spec's tool-list summary from before T-008 changed it.
- Ran `node dist/servers/framework/main.js` directly (the command the
  README's non-npx quickstart path effectively runs) — printed
  `finops-framework MCP server ready on stdio (data v2.1.1, 22 capabilities)`
  and exited cleanly, confirming the packaged artifact loads with the
  default `./data/framework` path and no environment variables set.
- Confirmed `data/framework/manifest.json` `schema_version` is `2.0.0` (set
  in T-005, unchanged since). `data_version` is `2.1.1`, not the literal
  "2.0.0" the spec's §5 bullet uses as its example — T-006 and T-007 already
  ran legitimate `refresh`/`derive` cycles after the schema bump that
  correctly incremented it further. I did not force it back to 2.0.0 since
  doing so would mean fabricating a manifest that doesn't reflect the
  artifact's real regeneration history; the task's actual acceptance
  criterion only names `schema_version`, which is correct.

## Next

All five loop tasks in `.agents/specs/v1-official-only.md` (T-005..T-009)
are complete. What's left is explicitly out of loop scope per the spec's
Acceptance section: a fresh-agent re-run of the revised `eval.xml` (target
≥9/10), updating PR #4's title/body to describe the full v1 scope, a final
independent verification pass, and the owner actually running `npm publish`
(this session only verified `npm pack --dry-run`).
