# 2026-10-20 — Tokenomics on the Cloudflare Worker, caching demo, FOCUS 1.3–1.5 ADR

## /mcp/tokenomics route, search-index caching, AI caching demo walkthrough — 2026-10-20T19:30:00Z

- Did: added `/mcp/tokenomics` to the Worker (`src/workers/app.ts`,
  `data.ts`, `index.ts`). `scripts/bundle-worker-data.mjs` now bundles
  `data/tokenomics` into `src/workers/generated/tokenomics-artifact.ts`;
  `documentBodies` (a Map) is serialized as an object and rehydrated in
  `loadWorkerData()`. The route serves the default 20-tool surface: no
  experimental crosswalk, no curriculum overlay. The rate limit covers it.
- Did: memoized `buildSearchIndex` per artifact (WeakMap) in all three
  servers, because the stateless Worker builds a server per request. Warm
  `createServer`: framework 25→5.7 ms, FOCUS 10.4→3.7 ms, tokenomics
  39.7→5.9 ms. `src/servers/search-cache.test.ts` pins reuse and no mutation.
- Did: the demo has a walkthrough picker. New default "Is prompt caching
  paying off?" runs six calls across all three servers (framework KPI →
  tokenomics formula → `calculate_cache_metrics` on the form's token counts
  → L3 lever → crosslinks → FOCUS `SkuPriceDetails`), with a result card
  and two presets. Rate Optimization is unchanged.
- Did: docs for three routes (deploy-worker, deploy-demo, README, guide
  index, tokenomics README, AGENTS.md, architecture.md). Bundle size and
  CPU notes say to run on the Workers Paid plan.
- Did: wrote `docs/adr/0001-focus-1-3-to-1-5-support.md` (Proposed,
  deferred). Owner chose to build 1.3, 1.4 and 1.5 together after 1.5
  ratifies (3 Dec 2026); nothing in FOCUS ingest was changed.
- Result: `npm test` 534 tests; packaging.test.ts timed out once under the
  parallel run (known locally) and passed 5/5 alone. format:check, lint
  and tsc are clean. The harness CLI is not installed in this container, so
  `./scripts/agentic gates` could not run; CI runs it.
  `wrangler deploy --dry-run`: 3992 KiB upload, 762 KiB gzip. In local
  workerd plus Chromium, the demo ran both walkthroughs:
  - stable preset: 80.0% hit rate, 70.8% efficiency, $0.88 vs $3.00
  - churning preset: −1.0% efficiency, flagged
  - no horizontal overflow at 390px
- Next (owner): `npx wrangler deploy`, then redeploy the demo
  (`npx wrangler pages deploy demo --project-name=…`).
