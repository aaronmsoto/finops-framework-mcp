# Deploying the MCP Cloudflare Worker

Owner-only checklist (deploying is a human approval point per
`approvals.yaml` — no automation in this repo runs `wrangler deploy`).
Deploys all three MCP servers over HTTPS (Streamable HTTP, stateless JSON
responses) from one Worker:

| Route | Server | Same tools as |
| --- | --- | --- |
| `/mcp/framework` | FinOps Framework | `npx -y finops-framework-mcp` |
| `/mcp/focus` | FOCUS spec | `npx -y finops-focus-mcp` |
| `/mcp/tokenomics` | Tokenomics Foundation guidance | `npx -y tokenomics-overview-mcp` |

`/mcp/tokenomics` serves the tokenomics server's default surface (20 tools):
the experimental `get_crosswalk` tool is never registered on the Worker, and
neither is the local curriculum overlay — both stay stdio-only.

## What ships

- `src/workers/index.ts` — the Worker entry point (`wrangler.toml`'s `main`).
  Loads all three data artifacts once per isolate from
  `src/workers/generated/*.ts` (see below) and builds a fresh MCP `Server` +
  `WebStandardStreamableHTTPServerTransport` per request (stateless: no
  session state persists across requests or isolates).
- `src/workers/app.ts` — the routing/Origin-allowlist logic, framework-
  agnostic and unit-tested with native `Request` objects
  (`src/workers/app.test.ts`) — never against a running `wrangler dev`.
- `src/workers/generated/framework-artifact.ts`, `focus-store.ts` and
  `tokenomics-artifact.ts` — the build-time-validated data snapshots (see
  next section). Committed to the repo; `src/workers/bundle-data.test.ts`
  fails CI if they drift from `data/framework`, `data/focus` or
  `data/tokenomics`.

The Worker never touches `node:fs` at runtime — `src/workers/fs-boundary.test.ts`
statically walks the import graph from `src/workers/index.ts` and fails if
anything reachable (following real imports, not `import type`) resolves to
`node:fs`. All disk access happens at build time, in
`scripts/bundle-worker-data.mjs`.

## 1. Regenerate the data bundle (whenever anything under data/ changed)

```sh
npm run bundle:worker   # = npm run build && node scripts/bundle-worker-data.mjs
```

This re-validates all three artifacts with the same ajv schemas + manifest
sha256 checks the stdio servers use (`loadArtifact`/`loadFocusStore`/
`loadTokenomicsArtifact`), then rewrites the three
`src/workers/generated/*.ts` files as plain TypeScript modules (formatted with prettier so the format gate
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

curl -s "$WORKER_URL/mcp/tokenomics" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate_cache_metrics","arguments":{"cache_read_tokens":800000,"cache_write_tokens":50000,"uncached_input_tokens":150000,"base_input_price_per_mtok":3,"cache_read_multiplier":0.1,"cache_write_multiplier":1.25}}}'
```

Expect a `200` with a JSON-RPC `result` from all three; the tokenomics call
should report `cache_hit_rate: 0.8` and `cache_cost_efficiency: 0.7075`. An unknown path (e.g.
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
- Bundle size: with all three servers, `npx wrangler deploy --dry-run`
  reports about 3.9 MiB total upload, **about 760 KiB gzipped** (measured
  2026-10-20). That is well under the Workers Paid plan's 10 MB compressed
  limit, and under the Free plan's 3 MB too. If a future data refresh
  pushes past your plan's limit, the fix is scoped to
  `scripts/bundle-worker-data.mjs` (e.g. per-version code-splitting) — not
  a reason to reach for `node:fs` at runtime.
- CPU: each request builds a fresh MCP server (the Worker is stateless), so
  per-request cost is server construction plus the tool call. Each server
  memoizes its search index per data artifact, and the artifacts live at
  module scope, so only the first request in an isolate pays for building
  indexes. Measured warm `createServer` times are about 6 ms (framework),
  4 ms (FOCUS) and 6 ms (tokenomics); a cold isolate's first request is
  25–40 ms. The Workers Paid plan (the $5/month Standard usage model)
  allows 30 s of CPU per request by default, so this is comfortable; on the
  Free plan's 10 ms CPU limit, a cold-isolate first request can be refused.
  Run the Worker on the Paid plan.
- Refreshing data (`npm run refresh`, FOCUS ingestion, the tokenomics crawler)
  does not auto-deploy anything — re-run step 1, review the diff, commit,
  then repeat step 4 when ready.
- No authentication: deliberate, not an oversight. The Worker serves only
  public, read-only FinOps Foundation, FOCUS and Tokenomics Foundation content (§CORS above already
  restricts browser callers, not API access) with no per-user state to
  protect — there is nothing behind it worth gating.
- **Rate limiting** (added 2026-09-25, decisions.md): `wrangler.toml` declares
  a `[[ratelimits]]` binding (`RATE_LIMITER`, 60 requests/60s per caller IP),
  enforced in `src/workers/app.ts` on the three `/mcp/*` routes only —
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
