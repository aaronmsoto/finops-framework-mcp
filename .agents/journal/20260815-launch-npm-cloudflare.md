## Launch: npm publish + Cloudflare deploy — 2026-08-15T00:00:00Z

Not a tracked task — publishing and deploying are owner approval points, not
code work. Recorded here because the hash chain has no other place for it and
a future session needs to know these exist.

- did: With PR #26 (T-083's SDK bump) merged to `main`, ran the first publish
  of both packages and the first Worker/demo deploy. Owner supplied an npm
  automation token and a Cloudflare API token; `npm publish` is an `ask` rule
  compiled from `approvals.yaml`'s `release: human`, and that prompt was the
  human gate.
  - Pre-flight on merged `main` (`a8e5a43`): `npm ci`, `npm audit --omit=dev`
    → 0 vulnerabilities (confirming T-083 landed), `gates --tier all` PASS.
    Confirmed both names were unclaimed before publishing.
  - `npm publish --access public` from the root, then from
    `packages/finops-focus-mcp/` (its `prepack` restages `dist` + `data/focus`
    from the repo root). Both `+ <name>@0.1.0`.
  - Token was written to a scratch `.npmrc` **outside the repo and outside
    `~`** via `NPM_CONFIG_USERCONFIG`, `chmod 600`, and deleted immediately
    after the publish. No `~/.npmrc` was ever created.
  - Cloudflare: `wrangler deploy` → `finops-mcp-worker.soto-c30.workers.dev`;
    `wrangler pages project create finops-mcp-demo` (the project did not
    exist, so the first `pages deploy` failed with a misleading "did you mean
    `wrangler deploy`?" error) then `pages deploy demo/ --branch main`. The
    `--branch` flag matters: without it wrangler uses the current git branch
    and the deploy lands on a preview URL rather than the canonical
    `finops-mcp-demo.pages.dev`.
- result: **verified, not assumed.**
  - `npm view` → `0.1.0` for both. Clean-cache `npx -y --cache <tmp>` →
    `finops-framework-mcp v0.1.0 (data v2.1.1)` and `finops-focus-mcp v0.1.0
    (FOCUS spec versions: 1.0, 1.2; latest 1.2)`. Then a real MCP handshake
    against the *published* tarball (installed into a temp dir, probed over
    stdio): **11 tools, `get_actions` absent** — T-082's gating survives the
    publish path.
  - Worker: `initialize` on `/mcp/framework` → `finops-framework-mcp` v0.1.0,
    data v2.1.1; on `/mcp/focus` → `finops-focus-mcp` v0.1.0, FOCUS 1.0/1.2.
    A real `tools/call get_framework_info` returned the full overview payload
    with its CC BY licence line. Negative cases all as documented: unknown
    path 404, `PUT` 405, unlisted `Origin` 403.
  - Demo: `finops-mcp-demo.pages.dev` serves 200 with the right title.
- implementer notes / gap: **the browser-driven demo run could not be
  verified.** Chromium cannot egress from this container — `ERR_CONNECTION_
  RESET` through the agent proxy regardless of `proxy.server`, `--no-sandbox`,
  or proxy env. The only workaround is disabling TLS verification, which the
  environment rules forbid, so it was left undone rather than worked around.
  What *is* proven is that the Worker answers correctly and that the CORS
  contract is right for the demo's exact origin (preflight 204 with matching
  `access-control-allow-origin`, unlisted origin 403), plus
  `src/workers/demo-requests.test.ts` covering the demo's request sequence.
  A human should load the page once and click through.

## T-084 — point the demo at the deployed Worker, allowlist its origin

- did: Follow-up to the deploy above, and a correction of a shortcut taken
  during it. `ALLOWED_ORIGINS` had been set with a `--var` override on the
  deploy command, because `wrangler secret put ALLOWED_ORIGINS` is **rejected
  outright** — the API returns `Binding name 'ALLOWED_ORIGINS' already in use
  [code: 10053]` when a `[vars]` binding of that name exists. The override
  worked but was silently temporary: the next plain `wrangler deploy` would
  have reset it to `""` and broken the demo's CORS with no error anywhere.
  - `wrangler.toml`: `ALLOWED_ORIGINS = "https://finops-mcp-demo.pages.dev"`,
    with a comment recording *why* it lives here rather than as a secret or a
    deploy flag, so the next person doesn't retry either dead end.
  - `demo/config.js`: `workerBaseUrl` now defaults to the deployed Worker
    instead of `http://localhost:8787`; the localhost value is documented
    inline as the `wrangler dev` fallback.
  - `docs/deploy-demo.md` step 1 rewritten — it told the reader the default
    was localhost, which is no longer true.
- result: `./scripts/agentic gates --tier all` PASS. Redeployed with a
  **plain `wrangler deploy`** (no `--var`) specifically to prove the override
  is no longer load-bearing: the binding table printed
  `env.ALLOWED_ORIGINS ("https://finops-mcp-demo.pages.dev")`, the preflight
  from the Pages origin still returns 204 with a matching
  `access-control-allow-origin`, and an unlisted origin still 403s.
  `curl https://finops-mcp-demo.pages.dev/config.js` confirms the deployed
  demo now carries the Worker URL.
- next: owner configures npm trusted publishers per package (and must not
  push a `v0.1.0` tag before then — `publish.yml` fires on tag push and would
  403), then submits both `server.json` manifests with `mcp-publisher`.
  Separately: nothing in the README or guide yet tells a reader the packages
  are actually on npm or that a hosted Worker exists.
