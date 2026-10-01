## Explain the demo's "Run walkthrough" errors and add Worker rate limiting — 2026-09-25T06:00:00Z

**Untracked work — the harness CLI is unavailable this session**, same
failure mode as 2026-08-21: `npm ci --prefix .agentic` returns `401
Unauthorized` fetching `@aaronmsoto/agentic-harness` from
`npm.pkg.github.com` (needs a `read:packages` token in `NPM_TOKEN`, none
available here). No `tasks add/start/complete`, no hash-chain extension, no
`./scripts/agentic gates`. `.agents/tasks.json` not hand-edited. Gates run as
the individual npm commands instead (AGENTS.md's documented fallback).

- did: Investigated the owner's report of "errors after clicking Run
  Walkthrough" on the live demo (`https://finops-mcp-demo.pages.dev/`).
  Loaded the live page in a real headless Chromium (Playwright, global
  install at `/opt/pw-browsers`, routed through the container's proxy with
  `--ignore-certificate-errors` since the proxy's CA isn't in Chromium's
  trust store by default) and clicked the actual button rather than reading
  the code and guessing.
  - **No defect.** All 6 request/response round trips against the live
    Worker succeed (CORS, Origin allowlist, JSON-RPC — all fine). The
    "errors" are 3 of 4 `calculate_kpi` calls in step 6 rendering in a
    red-bordered `.step-error` box, because `commitment-utilization-score`,
    `consumption-versus-commitment`, and
    `percentage-of-commitment-based-discount-waste` are structurally
    uncomputable over the FOCUS **1.0** bundled sample (it has zero
    `ChargeCategory="Purchase"` rows carrying a `CommitmentDiscountId`, so
    their shared denominator is 0) — `calculate_kpi`'s own contract is to
    report that with guidance rather than fabricate a 0%/100%/0 answer. This
    is deliberate and already covered by an existing assertion in
    `src/workers/demo-requests.test.ts` (`notComputable[...]` for exactly
    those three slugs, exact ESR value for the fourth) and a comment in
    `demo/app.js` calling it "an expected per-KPI outcome, not a walkthrough
    failure." It happens on **every single run**, for **every visitor** —
    not an edge case — because `demo/requests.js`'s `CALCULATE_VERSION` is
    hardcoded to `"1.0"`.
  - Did not change `CALCULATE_VERSION` or the KPI-calculation step: that
    would invalidate `demo-requests.test.ts`'s hardcoded expected values and
    reverses the walkthrough's own narrative (steps 3-5 exist specifically
    to show FOCUS 1.2 added the commitment-tracking columns 1.0 lacks) —
    a design call for the owner to make deliberately, not a side effect of
    answering a support question. Left as an open question below.
- did: Added per-IP rate limiting to the Cloudflare Worker, on the owner's
  explicit instruction, scoped to "add it now, purely to test, before any
  decision to publish/advertise an endpoint" — not the publish decision
  itself. `wrangler.toml` gains a `[[ratelimits]]` binding (`RATE_LIMITER`,
  60 req/60s per caller IP); `src/workers/app.ts` enforces it on
  `/mcp/framework` and `/mcp/focus` only, after the Origin/CORS/method checks
  and before routing, returning `429` + `Retry-After: 60` (CORS header still
  echoed when applicable). The limiter is injected via `FetchHandlerOptions`
  (optional — `undefined` disables it, so every pre-existing test keeps
  passing unchanged) the same way `allowedOrigins` already is, keeping
  `app.ts` testable with native `Request` objects and no real Cloudflare
  runtime.
  - This **reverses** `docs/deploy-worker.md`'s prior text, which pointed at
    Cloudflare's zone-level WAF Rate Limiting rules instead of application
    code — that product needs a custom-domain zone, which this
    `*.workers.dev`-hosted Worker doesn't have, so it was never actually
    reachable as originally written. Full rationale, alternatives considered,
    and the reversal are in decisions.md 2026-09-25.
  - **Not deployed.** Deploying is a human approval point
    (`approvals.yaml`/AGENTS.md hard rules) — no `wrangler deploy` was run.
    Validated instead with `npx wrangler deploy --dry-run`, which parses
    `wrangler.toml` and reports `env.RATE_LIMITER (60 requests/60s)` as a
    recognized Rate Limit binding, and bundles clean (3298.54 KiB / gzip
    578.92 KiB). The owner runs `wrangler deploy` to actually activate it.
- result: `src/workers/app.test.ts` gained a 7-case "rate limiting" describe
  block (allow; deny → 429 + Retry-After + CORS-echoed Origin; applies to
  both routes; does not gate a non-MCP path; Origin-check and method-check
  both still short-circuit before the limiter runs; IP-keying via
  `cf-connecting-ip` with an `"unknown"` fallback when absent). Full suite:
  `format:check`, `lint`, `typecheck`, `build` all clean;
  `npm test` → 419 passed, 1 failed
  (`src/packaging.test.ts`'s shim-install case, `ETARGET`/`ajv@^8.20.0` not
  found under `--prefer-offline`) — **reproduced identically on the
  unmodified tree** (`git stash` + rerun), so this is the same
  cold-npm-packument-cache flake documented 2026-08-21, not caused by this
  change. Targeted worker test files alone: 37/37 passed.
- next:
  - **Owner:** run `wrangler deploy` when ready to load-test the rate
    limiter live, then exercise the smoke test in
    `docs/deploy-worker.md` step 5 (now includes the 429 case) against the
    real endpoint.
  - **Open question, needs an explicit owner call, not a silent fix:** should
    `demo/requests.js`'s `CALCULATE_VERSION` move from `"1.0"` to `"1.2"` so
    the walkthrough's featured-KPI step actually computes real numbers for
    all 4 KPIs instead of 3-of-4 "not computable" boxes on every run? Doing
    so would need `demo-requests.test.ts`'s hardcoded expected values
    (`notComputable[...]`, the ESR `toBeCloseTo`) rewritten against FOCUS
    1.2's sample, and changes what the walkthrough demonstrates (currently:
    "the tool refuses to lie about a missing denominator"; after: "here are
    real numbers, made possible by 1.2's richer commitment tracking"). Both
    are legitimate demo designs; not decided here.
  - Iteration A (publish the Worker as a real advertised endpoint) still has
    its second half open: advertise the URL in the guide/README with client
    config (`claude mcp add --transport http ...`). Explicitly deferred by
    the owner's own framing this session ("only... until we test it and
    decide to publish").
