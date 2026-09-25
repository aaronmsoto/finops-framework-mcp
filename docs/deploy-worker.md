# Deploying the MCP Cloudflare Worker

Deploys both MCP servers (finops-framework and finops-focus-mcp) over HTTPS
from one Worker, at `/mcp/framework` and `/mcp/focus`.

**As of 2026-09-25, deploys run via CI** (`.github/workflows/deploy-worker.yml`,
§0 below) — see that section for the one-time setup. Deploying is still a
human approval point per `approvals.yaml`: the workflow builds and tests
automatically on every push to `main` that touches Worker-relevant paths, but
the actual deploy step **pauses for a required reviewer** in the
`cloudflare-production` GitHub Environment before it runs. Sections 1-6 below
are the manual/local path — still the right tool for first-time Cloudflare
account setup, a one-off test deploy from a branch, or an emergency deploy if
CI is unavailable.

## What ships

- `src/workers/index.ts` — the Worker entry point (`wrangler.toml`'s `main`).
  Loads both data artifacts once per isolate from
  `src/workers/generated/*.ts` (see below) and builds a fresh MCP `Server` +
  `WebStandardStreamableHTTPServerTransport` per request (stateless: no
  session state persists across requests or isolates).
- `src/workers/app.ts` — the routing/Origin-allowlist logic, framework-
  agnostic and unit-tested with native `Request` objects
  (`src/workers/app.test.ts`) — never against a running `wrangler dev`.
- `src/workers/generated/framework-artifact.ts` and `focus-store.ts` — the
  build-time-validated data snapshots (see next section). Committed to the
  repo; `src/workers/bundle-data.test.ts` fails CI if they drift from
  `data/framework`/`data/focus`.

The Worker never touches `node:fs` at runtime — `src/workers/fs-boundary.test.ts`
statically walks the import graph from `src/workers/index.ts` and fails if
anything reachable (following real imports, not `import type`) resolves to
`node:fs`. All disk access happens at build time, in
`scripts/bundle-worker-data.mjs`.

## 0. Automated deploys (CI)

`.github/workflows/deploy-worker.yml` triggers on push to `main` when
`src/workers/**`, `src/shared/**`, the two server files it builds on,
`data/framework/**`, `data/focus/**`, `wrangler.toml`, or the lockfile
change — or manually via `workflow_dispatch` (Actions tab → deploy-worker →
Run workflow). It runs `npm ci`, `npm run build`, `npm test` (which includes
`bundle-data.test.ts`'s drift check — see §1), then deploys via
[`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action).

One-time owner setup, not doable from an agent session:

1. Repo **Settings → Environments → New environment**, name it exactly
   `cloudflare-production`, and add yourself as a **required reviewer**. An
   environment with no reviewer configured is unprotected — a matching push
   would deploy immediately, which defeats the point.
2. On that environment, add secrets `CLOUDFLARE_API_TOKEN` (scope it to
   **Account → Workers Scripts: Edit** for this account only — never the
   Global API Key) and `CLOUDFLARE_ACCOUNT_ID`. Environment secrets, not
   repository secrets, so only a job that declares this environment can read
   them.

Cloudflare does not yet support GitHub OIDC trusted deploys the way
`publish.yml`'s npm/registry jobs do ([tracked upstream](https://github.com/cloudflare/wrangler-action/issues/402),
unimplemented as of this writing) — a stored API token is the only option
today, unlike the rest of this project's release pipeline.

Once a run reaches the deploy step, GitHub emails/notifies the configured
reviewer; approving it in the Actions UI is the human-approval act — never
approve it from an agent session.

## 1. Regenerate the data bundle (whenever data/framework or data/focus changed)

```sh
npm run bundle:worker   # = npm run build && node scripts/bundle-worker-data.mjs
```

This re-validates both artifacts with the same ajv schemas + manifest
sha256 checks the stdio servers use (`loadArtifact`/`loadFocusStore`), then
rewrites `src/workers/generated/framework-artifact.ts` and `focus-store.ts`
as plain TypeScript modules (formatted with prettier so the format gate
stays green). Commit the result — `./scripts/agentic gates --tier all`
should stay green, including the drift check in `bundle-data.test.ts`.

## 2. Configure the Origin allowlist

`ALLOWED_ORIGINS` is a comma-separated allowlist declared in `wrangler.toml`'s
`[vars]` block. It ships set to this project's own demo origin
(`https://finops-mcp-demo.pages.dev`), so on a fork **replace** that value with
your own client's origin rather than appending to it — otherwise your Worker
keeps allowlisting someone else's page. Then redeploy:

```toml
# wrangler.toml
[vars]
ALLOWED_ORIGINS = "https://your-demo.pages.dev,https://your-other-client.example.com"
```

Edit the file — do not reach for `wrangler secret put ALLOWED_ORIGINS`. A
secret cannot shadow a `[vars]` binding of the same name: the API rejects it
with `Binding name 'ALLOWED_ORIGINS' already in use [code: 10053]`. A
`--var ALLOWED_ORIGINS:...` override on the deploy command does work, but only
until the next plain `wrangler deploy` silently restores this file's value —
fine for a one-off test, wrong for the deployed configuration.

A request with no `Origin` header is always allowed regardless of this
list (that's how stdio-bridged and server-to-server MCP clients call it);
only browser-originated requests with a _present but unlisted_ `Origin` get
a `403`.

This allowlist is also what drives CORS: `src/workers/app.ts` answers an
`OPTIONS` preflight with `204` and echoes the request's `Origin` back as
`Access-Control-Allow-Origin` only when that Origin is on the list (plus
`Access-Control-Allow-Methods`/`-Headers`), and every subsequent
non-preflight response for that Origin carries the same `Access-Control-
Allow-Origin` header. Without an Origin on this list, a browser's `fetch()`
against the Worker still gets a same-shaped JSON-RPC response over the
wire, but the browser itself discards it before your client code ever sees
it — the allowlist is not just a server-side gate, it is also what makes
the response visible to browser JavaScript at all. There's no separate
switch to "turn CORS on" — putting an origin on `ALLOWED_ORIGINS` and
redeploying is both steps.

## 3. First-time Cloudflare setup (manual path only — CI uses a stored token)

```sh
npx wrangler login          # opens a browser, authorizes this machine
npx wrangler whoami         # confirm the right account
```

## 4. Deploy manually

Prefer letting §0's CI workflow deploy `main`. Use this for a one-off test
from a branch or if CI is unavailable:

```sh
npx wrangler deploy
```

`wrangler.toml` already declares `compatibility_flags = ["nodejs_compat"]`
(required by `src/shared/tools.ts`'s use of `node:crypto` for cursor
hashing — not by the MCP data path, which is fs-free by design) and
`main = "src/workers/index.ts"`.

## 5. Smoke test

```sh
WORKER_URL="https://<your-worker-subdomain>.workers.dev"

curl -s "$WORKER_URL/mcp/framework" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.0.0"}}}'

curl -s "$WORKER_URL/mcp/focus" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expect a `200` with a JSON-RPC `result` from both. An unknown path (e.g.
`/mcp/nope`) should 404; a disallowed `Origin` header should 403; an
unsupported method (e.g. `PUT`) should 405; more than 60 requests to the same
route within 60 seconds from the same IP should 429 with `Retry-After: 60`.

## 6. Rollback

```sh
npx wrangler deployments list
npx wrangler rollback [deployment-id]
```

## Notes / limits

- The Worker is stateless by design (spec non-goal: no session state, no
  user-supplied datasets — `calculate_kpi` only computes over the bundled
  samples, same as the stdio servers).
- Bundle size: `data/framework` + `data/focus` together are a few MB on
  disk; re-serialized as the two generated TypeScript modules they're a
  similar order of magnitude before Worker bundling/compression. If a
  future data refresh pushes past Cloudflare's Worker size limit for your
  plan, the fix is scoped to `scripts/bundle-worker-data.mjs` (e.g. per-
  version code-splitting) — not a reason to reach for `node:fs` at runtime.
- Refreshing the framework/FOCUS data (`npm run refresh`, FOCUS ingestion)
  does not auto-deploy anything — re-run step 1, review the diff, commit,
  then repeat step 4 when ready.
- No authentication: deliberate, not an oversight. The Worker serves only
  public, read-only FinOps Foundation/FOCUS content (§CORS above already
  restricts browser callers, not API access) with no per-user state to
  protect — there is nothing behind it worth gating.
- **Rate limiting** (added 2026-09-25, decisions.md): `wrangler.toml` declares
  a `[[ratelimits]]` binding (`RATE_LIMITER`, 60 requests/60s per caller IP),
  enforced in `src/workers/app.ts` on `/mcp/framework` and `/mcp/focus` only —
  a denied request gets `429` with `Retry-After: 60`. This is edge-adjacent
  [Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
  **not** the zone-level [Rate Limiting (WAF) rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
  product this doc previously pointed at — that product is configured on a
  Cloudflare **zone** (a custom domain you've added to the account), and this
  Worker is served from the shared `*.workers.dev` subdomain, which isn't a
  zone the owner controls WAF rules on. The Workers Rate Limiting binding is
  Cloudflare's supported mechanism for gating a Worker's own routes
  regardless of domain, requires Wrangler >= 4.36.0, and needs no separate
  dashboard/CLI provisioning step — it activates on the next `wrangler
  deploy`. If this Worker is later put behind a custom domain/zone, the WAF
  product becomes available too, but the in-Worker binding still works and
  there's no need to run both.
