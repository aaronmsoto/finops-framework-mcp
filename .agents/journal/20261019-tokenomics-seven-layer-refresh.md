# 2026-10-19 — Tokenomics re-crawl (Seven-Layer Stack) + 0.2.0 release prep

## Re-crawled tokeneconomics.com and prepared the lockstep 0.2.0 release — 2026-10-19T00:00:00Z

- Did: the site replaced the Five-Layer Stack (old URLs now 404) with the
  Seven-Layer Stack (L0 Energy … L6 Demand). It moved most project pages
  under /projects/ and moved the definition to /what-is-ai-tokenomics/
  (the old /docs/overview URL is a redirect loop). The FOCUS 1.5 page was
  rewritten as capability cards. Updated the registry, renamed the slugs
  cleanly (owner decision), rewrote the glossary/cost-per-token/FOCUS
  parsers, and changed the FOCUS buckets to done|review|out. Bumped schema
  2.0.0, so data v2.0.0.
- Did: added Tokenomics Brief ep.15 and ep.18 for routing/gateway context.
  The Sprint 2 working-group drafts stay out (owner: drafts wait for
  final). Dropped the "Token Economics: The Atomic Unit" insight: it uses
  the FinOps Foundation page template with no <main> element, so it would
  need a one-off parser.
- Did: the new FOCUS page names columns in prose ("SKU Price Details"), so
  cross-links now also match multi-word FOCUS 1.2 display names, evidence
  can be scoped to the card, and quotes are still verbatim. 35 links (the
  old 39 came from the previous page layout).
- Did: added rest-modified.json to the fixtures, so the offline drift guard
  is byte-identical. Two pages no longer carry JSON-LD dates.
- Did (protected paths, owner-approved): publish.yml publishes, validates
  and submits tokenomics; scripts/npm-publish-once.sh skips a version
  already on npm (needed because tokenomics' first publish is manual);
  version-sync covers tokenomics and server.json. All three packages are
  at 0.2.0.
- Did: FOCUS version-support research and recommendation
  (docs/research/focus-version-support.md, roadmap idea).
- Result: live refresh fetched 18; derive is byte-identical; vitest 517/517;
  eslint, prettier and tsc are clean; the stdio smoke test shows 7 layers,
  get_layer("demand") → l6, L5 components (Proxy, Router, Policy &
  Guardrails…), FOCUS review bucket, and router/gateway search hits.
  `./scripts/agentic gates` is unavailable here (the harness is not
  installed in this container), so the npm checks stood in.
- Next (owner): merge to dev → main; publish tokenomics-overview-mcp@0.2.0
  by hand; set up its trusted publisher; tag v0.2.0 (runbook top note).

## v0.2.0 publish run failed in npm test (npm 12 pack JSON) — 2026-10-20T16:00:00Z

- Did: the owner published tokenomics-overview-mcp@0.2.0 by hand. npm put
  it in staged publishing (it published the 0.0.0-stage placeholder first),
  and the owner approved it in the web UI; `latest` is 0.2.0. Verified with
  a fresh install: --version prints data v2.0.0, 20 tools, L0–L6.
- Result: the tag `v0.2.0` publish run failed at `npm test`, before any
  publish step. publish.yml installs npm@latest (now 12.2.0), and npm 12
  prints `npm pack --json` as an object keyed by package name instead of
  an array. That broke all 5 tests in src/packaging.test.ts. Reproduced
  locally under npm 12.2.0 (5 failed, same TypeErrors). The parse now
  accepts both shapes: npm 12 gives 518/518 under `npm test` with
  coverage, and npm 10 gives 5/5 packaging tests.
  npm-publish-once.sh exit codes behave the same under npm 12.
- Next (owner): merge to dev → main, then re-point the `v0.2.0` tag at the
  new main commit (nothing was published from the old tag).
