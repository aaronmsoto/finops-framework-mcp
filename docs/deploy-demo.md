# Deploying the demo app

Owner-only checklist (deploying is a human approval point per
`approvals.yaml` — no automation in this repo deploys anything). Publishes
the static demo that drives the deployed Worker (`docs/deploy-worker.md`)
from a browser. Visitors pick one of two walkthroughs:

- **Is prompt caching paying off?** (the default; framework → tokenomics →
  FOCUS). Six calls: the framework's Cache Hit Rate KPI (`get_kpis`), the
  Tokenomics Foundation's published formula (`get_metric`), the formula run
  on the visitor's own token counts (`calculate_cache_metrics`), the L3
  caching lever (`get_lever`), the quote-backed hand-off to FOCUS
  (`get_crosslinks`), and the `SkuPriceDetails` column in FOCUS 1.2
  (`get_column`). A result card shows hit rate, cost efficiency and actual
  vs uncached prompt cost; two presets show a stable prompt prefix (about
  71% cheaper) and one that keeps changing (caching costs more than it
  saves).
- **Rate Optimization** (T-038; framework → FOCUS), described below.

## What ships

`demo/` is a plain static site — no build step, no bundler, no framework:

- `demo/index.html` — the page (inline `<style>`, the walkthrough picker,
  the workload form for the caching walkthrough, a "Worker base URL" field,
  a "Run walkthrough" button, the result card, and a log area).
- `demo/config.js` — the **one endpoint-config object** (`CONFIG`), the
  default Worker base URL plus the three route suffixes
  (`/mcp/framework`, `/mcp/focus`, `/mcp/tokenomics`).
- `demo/requests.js` — pure JSON-RPC request-body builders for both
  walkthroughs' steps (`STEPS`, `AI_CACHING_STEPS`, `WALKTHROUGHS`) (no fetch, no DOM — also imported directly by
  `src/workers/demo-requests.test.ts`, so the request bodies the browser
  sends are exactly the ones that test exercises against the real worker
  fetch handler).
- `demo/client.js` — a thin `fetch` wrapper (JSON-RPC request/response,
  `tools/call` error unwrapping).
- `demo/app.js` — drives the selected walkthrough. Rate Optimization:
  capability → featured KPIs (from
  `get_capability`) → FOCUS columns needed for those KPIs per version, 1.0
  and 1.2 (`get_kpi_mapping`) → whether 1.2 added a dedicated column
  (`compare_versions`) → calculate each featured KPI over the bundled
  sample (`calculate_kpi`). Mirrors
  `evals/focus/combined-scenario.xml` steps 1-5. AI caching: the six steps
  above, with step 3 built from the form's values.

Any static host works (`python3 -m http.server` from `demo/` for local
testing). These instructions cover Cloudflare Pages, since the Worker
(`docs/deploy-worker.md`) is already on Cloudflare.

## 1. Point the demo at your Worker

`demo/config.js`'s `workerBaseUrl` defaults to this project's own deployed
Worker (`https://finops-mcp-worker.soto-c30.workers.dev`). Point it at your
own (`https://<your-worker-subdomain>.workers.dev`, or a custom domain), or
set it to `http://localhost:8787` for a local `wrangler dev`. Either way
visitors can override it from the page's "Worker URL" field at runtime —
the field's value is used as-is and never persisted.

## 2. Allow the demo's origin on the Worker

The Worker's `ALLOWED_ORIGINS` (`docs/deploy-worker.md` step 2) must
include the demo's deployed origin (e.g.
`https://your-demo.pages.dev`) once you know it — Cloudflare Pages assigns
the `*.pages.dev` origin on first deploy, so deploy the demo once, then
update the Worker's allowlist and redeploy the Worker.

## 3. Deploy to Cloudflare Pages

```sh
npx wrangler pages deploy demo --project-name=<your-project-name>
```

First run creates the Pages project and prints its `*.pages.dev` URL. No
build command or output-directory override is needed — `demo/` is served
as-is.

(Any static host works identically: Cloudflare Pages, GitHub Pages, S3 +
CloudFront, `npx serve demo`, etc. — `demo/` has no server-side dependency
beyond the Worker it calls.)

## 4. Smoke test

Open the deployed URL, confirm/enter the Worker base URL, click "Run
walkthrough", and confirm all steps complete without an error step
appearing. If step 1 fails with a network error, check the Worker URL; if
a step's response is a 403, the demo's origin is missing from
`ALLOWED_ORIGINS` (step 2 above).

## Rollback

```sh
npx wrangler pages deployment list --project-name=<your-project-name>
npx wrangler pages deployment rollback --project-name=<your-project-name>
```

## Notes / limits

- The demo only ever calls `tools/call` against the three `/mcp/*` routes —
  it holds no API keys or secrets, and sends no data beyond the
  walkthroughs' arguments (capability/KPI/column slugs, spec version
  strings, and the six numbers in the caching form, which the Worker uses
  for that one calculation and does not store).
- `calculate_kpi` only computes over the Worker's bundled sample data
  (never user-supplied data — same constraint as the stdio servers and the
  Worker itself).
- Regenerating the Worker's data bundle (`docs/deploy-worker.md` step 1)
  does not require redeploying the demo — the demo has no data of its own,
  it only calls the Worker.
