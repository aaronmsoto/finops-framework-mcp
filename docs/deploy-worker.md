# Deploying the MCP Cloudflare Worker

Owner-only checklist (deploying is a human approval point per
`approvals.yaml` — no automation in this repo runs `wrangler deploy`).
Deploys both MCP servers (finops-framework and finops-focus-mcp) over HTTPS
from one Worker, at `/mcp/framework` and `/mcp/focus`.

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
`[vars]` block. Before pointing a browser-based client (e.g. the demo app) at
the Worker, add that client's origin there and redeploy:

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

## 3. First-time Cloudflare setup

```sh
npx wrangler login          # opens a browser, authorizes this machine
npx wrangler whoami         # confirm the right account
```

## 4. Deploy

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
unsupported method (e.g. `PUT`) should 405.

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
- No authentication and no rate limiting: deliberate, not an oversight. The
  Worker serves only public, read-only FinOps Foundation/FOCUS content
  (§CORS above already restricts browser callers, not API access) with no
  per-user state to protect — there is nothing behind it worth gating. If
  abuse becomes a problem, add rate limiting at the edge via [Cloudflare
  Rate Limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
  rather than in application code.
