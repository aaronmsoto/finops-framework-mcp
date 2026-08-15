## T-085 — announce the npm release in the README and guide — 2026-08-15T00:00:00Z

- did: Both packages went live earlier today, but nothing user-facing said so.
  Neither README had a badge of any kind, no link to either npm package page
  existed anywhere in the repo, and the guide's install step described the
  packages in the abstract ("Each server publishes as its own npm package").
  A reader had no way to tell the packages were real without trying `npx` and
  seeing whether it resolved.
  - **`README.md`**: badge row (net-new — there was none) with npm version
    badges for both packages linking to their npm pages, plus a license badge.
    Quickstart gained a lead-in stating both are published, with links, and
    naming the two things a reader actually wants to know before installing:
    the data ships inside the package and it runs offline, Node >= 22.
  - **`packages/finops-focus-mcp/README.md`**: same treatment. This one
    matters more for discovery than the root README — it *is* the npm package
    page for `finops-focus-mcp`. Its lead-in specifically calls out that the
    sample datasets ship in the package, so `calculate_kpi` works offline
    straight after install; that was a real question raised this session and
    the package page was the place it went unanswered.
  - **`docs/guide/index.html`** STEP 3: reworded to state plainly that both
    are on npm, with text links to both package pages.
  - The `@0.1` pin sentences in both READMEs were left alone: that is a
    major.minor range which stays valid across every `0.1.x` patch and only
    needs touching at `0.2.0`.
- **Deliberately not done** (owner decision, decisions.md 2026-08-15): the
  hosted Worker URL and the demo URL are not named anywhere public. The
  guide's "There is no public hosted endpoint to point you at here" paragraph
  and the README's "deployable" Worker framing are untouched and remain true.
  The Worker has no auth and no rate limiting *by design* — sound for a demo
  endpoint, not for one advertised in a launch README. Consequence recorded
  rather than glossed: the live demo is currently undiscoverable to readers.
- **Scope addition, done on purpose**: `docs/deploy-worker.md` step 2
  recommended `npx wrangler secret put ALLOWED_ORIGINS` as the primary path.
  We proved during yesterday's deploy that this **cannot work** — the API
  rejects it with `Binding name 'ALLOWED_ORIGINS' already in use [code:
  10053]` whenever a `[vars]` binding of that name exists, which is always
  here. `wrangler.toml` already carried a comment saying so, so the runbook
  and the config actively contradicted each other and the runbook was the
  wrong one. Rewrote the step to show the `[vars]` edit as the way, and to
  name both dead ends (the secret, and the `--var` override that silently
  reverts on the next plain deploy) so nobody rediscovers them. Fixed here
  rather than filed because leaving a known-failing command in a deploy
  runbook is worse than a slightly wider diff.
- result: `./scripts/agentic gates --tier all` **PASS** (format, lint,
  typecheck, test, designs, integrity, memory, build).
  - **Badges verified live before shipping them**, so the README does not
    ship a broken image: both shields.io endpoints return 200 and both report
    `0.1.0`. The `npmjs.com/package/...` links return 403 *from this
    container* — that is the agent proxy blocking npm's web pages, not a
    missing package; confirmed against `registry.npmjs.org`, which returns
    `latest: 0.1.0` for both names.
  - **Guide external-asset invariant re-checked**, since this is the exact
    way this change could have broken the guide: grep across all 8
    `docs/guide/*.html` for `<img`, `src=`, `rel="stylesheet"`, `@import`,
    `shields.io` → **zero matches**. Badges are images and would have been
    the guide's first external asset; that is why the guide gets text links
    and only the READMEs get badges.
  - **Guide rendered headless** at 390px and 1280px across all 8 pages:
    `document.documentElement.scrollWidth` is byte-identical to the recorded
    baseline — `index.html` and `focus-server.html` clean at 390/390, and
    `framework-server.html` 481, `example-showback.html` 443,
    `example-forecasting.html` 456, i.e. exactly the pre-existing
    content-driven `.tbl-wrap` leak and nothing new.
  - **Non-disclosure verified as a check, not an intention**: grep for
    `soto-c30.workers.dev` and `finops-mcp-demo.pages.dev` across
    `README.md`, `packages/finops-focus-mcp/README.md` and all guide pages →
    zero matches.
- implementer notes: this change is exactly the class the missing docs drift
  guard would protect — a stale badge, a stale version pin, or a Worker URL
  leaking into public docs would all pass gates silently today. Still queued
  as follow-on; it needs a protected-path edit to `agentic.config.json`.
- next: reviewer pass, then PR into `dev`. Owner still has the npm
  trusted-publisher config (per package) and the two `mcp-publisher` manifest
  submissions outstanding; no `v0.1.0` tag until the former exists.
