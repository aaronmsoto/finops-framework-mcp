# Deploying the demo app

Owner-only checklist (deploying is a human approval point per
`approvals.yaml` — no automation in this repo deploys anything). Publishes
the static Rate Optimization walkthrough (T-038) that drives the deployed
Worker (`docs/deploy-worker.md`) from a browser.

## What ships

`demo/` is a plain static site — no build step, no bundler, no framework:

- `demo/index.html` — the page (inline `<style>`, a "Worker base URL"
  field, a "Run walkthrough" button, and a log area).
- `demo/config.js` — the **one endpoint-config object** (`CONFIG`), the
  default Worker base URL plus the two route suffixes
  (`/mcp/framework`, `/mcp/focus`).
- `demo/requests.js` — pure JSON-RPC request-body builders for the
  walkthrough's steps (no fetch, no DOM — also imported directly by
  `src/workers/demo-requests.test.ts`, so the request bodies the browser
  sends are exactly the ones that test exercises against the real worker
  fetch handler).
- `demo/client.js` — a thin `fetch` wrapper (JSON-RPC request/response,
  `tools/call` error unwrapping).
- `demo/app.js` — drives the walkthrough: capability → featured KPIs (from
  `get_capability`) → FOCUS columns needed for those KPIs per version, 1.0
  and 1.2 (`get_kpi_mapping`) → whether 1.2 added a dedicated column
  (`compare_versions`) → calculate each featured KPI over the bundled
  sample (`calculate_kpi`). Mirrors
  `evals/focus/combined-scenario.xml` steps 1-5.

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

- The demo only ever calls `tools/call` against `/mcp/framework` and
  `/mcp/focus` — it holds no API keys or secrets, and sends no data beyond
  the fixed walkthrough's arguments (capability/KPI/column slugs, spec
  version strings).
- `calculate_kpi` only computes over the Worker's bundled sample data
  (never user-supplied data — same constraint as the stdio servers and the
  Worker itself).
- Regenerating the Worker's data bundle (`docs/deploy-worker.md` step 1)
  does not require redeploying the demo — the demo has no data of its own,
  it only calls the Worker.
