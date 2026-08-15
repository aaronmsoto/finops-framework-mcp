# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

**Nothing mid-task.** Recent history (full detail in `.agents/journal/`,
`decisions.md`, and git — this is a compact index, not a re-narration):

- **2026-08-07:** T-077 pre-publish hardening (bins, `server.json` schema
  validation, identity/version = 0.9.0, docs/UX fixes, publish pipeline,
  community docs) — merged via PR #17.
- **2026-08-13:** T-080 (tool-description audit), T-081 (`get_capability`'s
  `slug`→`capability`, `get_attribute`'s `slug`→`attribute` — decisions.md
  2026-08-13 amendment to the 2026-08-07 no-rename ruling), T-079
  (`get_kpi_mapping` capability-filter validation), version 0.9.0 → 0.1.0
  (decisions.md 2026-08-13, supersedes T-077's call), and the guide nav
  restructure (6-label nav → 4 + Examples sub-nav, 7th page
  `example-quick-qa.html` transcribing a live Q&A session).
- **2026-08-14:** PR #20 (bundling all of the above) and the rolling
  "Release: dev → main" PR #21 it triggered both merged by the owner
  within minutes. Confirmed live at
  https://aaronmsoto.github.io/finops-framework-mcp/. Root README.md
  reorganized for FinOps-practitioner readability (guide linked in the
  first section, not the sixth; plain-language "why this exists" before
  any MCP/pipeline internals) and audited both READMEs for stale `0.9`
  references the earlier version-bump grep missed (`@0.9` npm dist-tag
  hints, not caught by a literal `0.9.0` search) — fixed both to `@0.1`;
  also added the missing "unofficial" self-description to
  `packages/finops-focus-mcp/README.md`'s opening line (its own
  `package.json` description already said it; the README didn't) and
  added the README's guide table's missing 7th row.
- **2026-08-15:** T-082 public-launch surface pass. Repo is now **public**
  and PRs #22/#23 are merged (`dev` survived #23's merge this time). Added
  a persistent "Source on GitHub" link to the shared header of all 7 guide
  pages plus a callout on `index.html` and a link on `404.html` — the
  guide had no repo link at all. Scrubbed every *public* mention of the
  flag-gated extensions (`FINOPS_MCP_EXPERIMENTAL`, `--experimental`,
  `get_actions`, Pre-Crawl) from README.md, the guide, root `server.json`,
  and `docs/mcp-surface.md`; the code, the flag, and their tests are
  untouched (decisions.md 2026-08-15).

- **2026-08-15 (later):** T-083 dependency bump, caught during the npm
  publish pre-flight — `npm audit` on the production tree showed 2 high +
  2 moderate advisories, all transitive through
  `@modelcontextprotocol/sdk@1.29.0`. Bumped to `^1.30.0` in both
  `package.json`s; `npm install` alone did **not** move the already-resolved
  transitive versions, so `npm update` was needed on `hono`,
  `@hono/node-server`, `ip-address`, `express-rate-limit`, plus `fast-uri`
  (via `ajv`, 3.1.4 → 3.1.5) and four dev-only ones. Whole tree now audits
  clean.

- **2026-08-15 (launch):** **Both packages are published to npm at 0.1.0**
  (`finops-framework-mcp`, `finops-focus-mcp`) — verified by clean-cache
  `npx` and a real MCP handshake against the published tarball (11 tools,
  `get_actions` still gated out). **Cloudflare is live**: Worker at
  `https://finops-mcp-worker.soto-c30.workers.dev` (`/mcp/framework`,
  `/mcp/focus`) and the demo at `https://finops-mcp-demo.pages.dev`.
  T-084 then made the demo wiring durable — `wrangler.toml`'s
  `ALLOWED_ORIGINS` and `demo/config.js`'s `workerBaseUrl` now hold the real
  values, so a plain `wrangler deploy` no longer resets CORS.

## Next steps

1. **Owner (blocks everything below):** set the GitHub About description —
   the session token is proxied and 403s on repository-settings writes
   ("Repository settings writes are not permitted through this proxy"), so
   this cannot be automated from an agent session. Agreed wording:
   `Two unofficial MCP servers giving AI assistants sourced answers from
   the FinOps Framework and the FOCUS billing-data spec.` While in there:
   set the website field to the Pages URL, add topics (`mcp`,
   `model-context-protocol`, `finops`, `focus`, `cloud-cost`), and confirm
   Settings → General → "Automatically delete head branches" is **off** —
   it deleted `dev` when PR #21 merged; it did not fire for #23, but an
   unconfirmed setting will bite again on a future rolling release.
2. **Owner, npm web UI:** configure a **trusted publisher** on *each*
   package (settings are per-package): Package → Settings → Trusted
   publisher → GitHub Actions → repo `aaronmsoto/finops-framework-mcp`,
   workflow `publish.yml`, and **explicitly tick the allowed `npm publish`
   action** — configurations created after May 2026 require at least one
   allowed action or the publish 403s. Until this exists, **do not push a
   `v0.1.0` tag**: `.github/workflows/publish.yml` fires on tag push and
   would fail. 0.1.0 was published manually and carries no provenance;
   provenance starts with the first CI publish.
3. **Owner:** `mcp-publisher publish` for the root and
   `packages/finops-focus-mcp/` `server.json` manifests. The npm packages
   are live now, so registry ownership validation (which reads `mcpName`
   from the published tarball) will pass. `mcp-publisher` was not present
   in the session container — install it locally.
4. **Done (T-085):** both READMEs and the guide now say the packages are
   live on npm (badge rows + links). **The hosted Worker and demo URLs are
   deliberately NOT advertised** — owner decision, 2026-08-15: the Worker
   has no auth and no rate limiting by design, so publishing it invites
   unbounded public traffic onto the owner's Cloudflare account. It exists
   for the demo, not as a public service. A consequence worth revisiting on
   purpose rather than by accident: the live demo is currently
   undiscoverable to readers, since linking it would surface the Worker URL
   indirectly (it is in the demo's `config.js`).

## Open questions

- `src/shared/index.ts` `export *` barrel: any new server code importing a
  real binding from it can silently reintroduce fs-reachability in the
  Worker; `fs-boundary.test.ts` only catches code reachable from
  `src/workers/index.ts`. Splitting the barrel is a real refactor (queued
  observation since T-037).
- `validateFocusCsv` can't validate JSON-typed columns whose
  `allowed_values` are embedded-key names (1.2 `SkuPriceDetails`); the
  generator emits null as a workaround (decisions.md 2026-07-28).
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind `FINOPS_MCP_EXPERIMENTAL`.
- MCP SDK zod validation silently strips unknown tool params
  (docs/eval-results.md #3) — revisit when the SDK supports strict input
  schemas.
- Trademark posture (decisions.md, accepted-risk, phrasing now "unofficial"
  everywhere outward-facing): revisit only if the FinOps Foundation objects.
- Panel nice-to-haves deliberately deferred: README badges, `exports` field
  for `dist/index.js` (currently shipped but unimportable), markdown text
  blocks for `get_capability`/`get_kpis`, dropping `get_actions`' `level`
  alias, glossary lookup tool, trimming `dist/shared/focus/*` from the root
  tarball.
- Guide mobile overflow (pre-existing, noted by T-078) — **partially fixed
  2026-08-13**: shortening the nav eliminated the leak on `index.html` and
  `focus-server.html` (confirmed via `document.documentElement.scrollWidth`
  at 390px). **Still open** on `framework-server.html`,
  `example-showback.html` and `example-forecasting.html`: a *different*,
  content-driven leak — certain wide `.tbl-wrap` tables (long unbroken
  `.mono` strings in cells) escape their `overflow-x:auto` container and
  widen `document.documentElement` itself (verified real via
  `window.scrollTo` actually moving `scrollX`). `.tbl-wrap` and its
  ancestor chain measure correctly bounded via `getBoundingClientRect`, so
  the cause is deeper than the container CSS — still deserves its own task.
- Upstream porting status: the two policy toggles (`solo_maintainer`,
  `ai_attribution`) ALREADY shipped in harness 0.2.0 (starter T-012/T-013);
  the remaining harness feedback (incl. task-ID collisions) lives in
  agentic-starter-repo's activeContext Next steps 9–14.
  `.agents/specs/upstream-port-to-agentic-starter-repo.md` (from PR #15)
  is the fuller port brief; its toggle diffs are done, its smaller
  feedback list is superseded by the starter-repo list.

## Last updated

2026-08-15 — **Launch day.** T-082 (repo link in the guide + experimental
scrub), T-083 (MCP SDK → ^1.30.0, clearing 2 high + 2 moderate transitive
advisories found in the publish pre-flight), then the launch itself: both
packages published to npm at 0.1.0 and the Cloudflare Worker + demo
deployed, each verified end to end. T-084 replaced the deploy-time `--var`
CORS override with real values in `wrangler.toml` and `demo/config.js`.
Remaining owner steps are the npm trusted-publisher config and the two
`mcp-publisher` manifest submissions.
