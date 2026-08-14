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

**Merge reconciliation (2026-08-07):** `origin/main` merged into the
release line — main carried PR #15 (guide large-viewport widening from a
parallel session) which `dev` lacked, leaving rolling PR #17 conflicted.
Its task collided on ID **T-073** (already the npm-harness task on this
chain) and was renumbered **T-078** with the chain recomputed; journal
`20260806-t073-guide-wide-viewport.md` keeps the old ID (same precedent as
the T-065..T-067 renumbering — second occurrence of upstream feedback
item 13). The guide widening itself (`--wrap` custom property in the
shared chrome, datamodel flex) merged cleanly alongside this branch's
`npx -y`/unofficial edits.

**Pre-publish hardening COMPLETE (T-077, 2026-08-07, branch
claude/session-k75rxy).** A 3-expert review panel (MCP design, npm
publishing, OSS readiness) audited the repo for open-sourcing + npm publish;
the owner approved every finding. Landed, one commit per item:

- **B1:** both bins resolve data/package.json via `fileURLToPath` —
  `URL.pathname` broke npx on Windows and space-containing paths (reproduced,
  then regression-covered by space-containing scratch dirs in
  `src/packaging.test.ts`).
- **B2:** both `server.json` manifests now validate against the 2025-09-29
  registry schema (descriptions were over the 100-char max); env vars +
  websiteUrl declared.
- **Identity/version:** servers report their package names (framework was
  `finops-framework`), plus `title`; ALL versions moved to **0.9.0** (owner
  call: first public release is deliberately not v1). Sync tests:
  `tests/version-sync.test.ts` (server.ts ↔ package.json),
  `src/servers/focus/default-version.test.ts` (DEFAULT_VERSION ↔ data
  latest). SERVER_VERSION stays a literal — Worker fs boundary.
- **Docs/UX:** instructions counts derived from artifact; FOCUS "every tool
  takes version" overclaim fixed; `npx -y` everywhere; "official" phrasing
  now "unofficial" in package descriptions/README/guide; root NOTICE.md
  carries the trademark non-affiliation sentence.
- **Pipeline:** `publish.yml` (tag-triggered, npm trusted publishing/OIDC);
  `pack-focus.mjs` rebuilds on stale dist (mtime check), stale local .tgz
  deleted; **`docs/release-runbook.md` is the publish procedure now** —
  first publish per package is manual (trusted publishing needs an existing
  package), then per-package trusted-publisher config on npmjs.com.
- **Community:** CONTRIBUTING split into external (registry-free npm
  commands, matching CI gates-fast) vs maintainer (harness) paths;
  AI-attribution ground rule corrected to `allow`; CODE_OF_CONDUCT
  (Contributor Covenant 2.1, GitHub private reporting as contact); YAML
  issue forms replace the markdown template; PR template harness items are
  maintainer-only.

Prior state (Pages live at aaronmsoto.github.io/finops-framework-mcp,
solo_maintainer + ai_attribution toggles working, Phase C npm-harness
complete on @aaronmsoto/agentic-harness@0.2.1) is unchanged — see journal
20260806-* files.

**T-080 complete (2026-08-07):** description audit across both servers
(6 genuine inaccuracies + 10 friction fixes) implemented — completable
ordering bug on the map-personas persona arg, param-naming guidance in
search_framework + both overview navs, get_capability persona validation,
findAttribute cross-version hint, and assorted description corrections.
Gates pass (413 tests), live stdio probes verified, reviewer verdict PASS,
pushed to claude/session-k75rxy.

**T-079 complete (2026-08-13):** FOCUS `get_kpi_mapping`'s `capability`
filter now validates against the set of capability slugs referenced by the
KPI mapping (case-insensitive) and errors with `nearestMatches` suggestions
on an unknown value, instead of silently returning `total: 0` — mirrors the
`findCapability` pattern in the framework server. `get_column`'s description
now explicitly names its identifying param ("Look up by the `column`
parameter — a Column ID or its lowercase slug"), matching `get_attribute`'s
existing phrasing (which T-081 already made self-documenting). Updated the
stale "empty, non-error result" test to assert the new error behavior, plus
a new case-insensitivity test. Gates pass (415 tests); live stdio probes
confirm `capability: "forecastin"` errors with "Did you mean: forecasting?"
and `capability: "Forecasting"` returns the same rows as the correctly-cased
slug.

**T-081 complete (2026-08-13):** a follow-up Q&A session found the
2026-08-07 decision's own stated rule didn't hold — `get_actions`,
`get_maturity_assessment`, `assess_maturity_path` already use `capability`
as their sole required param, the same role `get_capability`'s `slug`
played, making `get_capability` the actual outlier (and `get_attribute`'s
generic `slug` vs `get_column`'s `column` the same shape in FOCUS). Since
neither param has a collision risk and nothing is published yet (no git
tag, `docs/release-runbook.md` still open), the ruling was narrowly
reopened (decisions.md 2026-08-13): `get_capability`'s `slug`→`capability`,
`get_attribute`'s `slug`→`attribute`. Renamed across both tool schemas, all
call sites (server.test.ts ×2, demo-requests.test.ts, demo/requests.js —
the live Worker demo's request builder), both render.ts navs,
search_framework's description, docs/mcp-surface.md (regenerated),
docs/guide/*.html (6 files), evals/*.xml (3 files). Gates pass (413 tests);
live stdio probes confirm the new param names work and the old ones now
error loudly (missing-required-field) instead of silently misbehaving.

**Guide restructured to 7 pages, nav shortened (2026-08-13).** Owner request
after a live Q&A session against both servers (capabilities-by-domain,
sustainability summary, Walk-maturity gap, Unit Economics starter KPIs).
Top nav dropped from 6 long labels to 4 short ones (Intro / Framework MCP /
FOCUS MCP / Examples); the 3 existing worked examples plus a new 4th page
(`example-quick-qa.html`, the live Q&A session verbatim, real MCP output)
became "virtual sub-pages" under Examples via a second nav row shown only
on those 4 pages. `index.html`'s next-grid, the 3 existing examples'
closing cross-links, `docs/README.md`, `docs/deploy-pages.md` and
`docs/guide/404.html` updated for the new 7-page count.
`.github/workflows/pages.yml` (protected path) intentionally NOT touched —
its file-existence guard still lists only the original 7 filenames (6 pages
+ 404), so it doesn't explicitly check `example-quick-qa.html`, though the
upload step ships the whole directory regardless; noted as a known gap in
deploy-pages.md rather than silently fixed. See the mobile-overflow open
question below for what this incidentally fixed and what's still open.

**Version dropped to 0.1.0 (2026-08-13), superseding T-077's 0.9.0 call.**
Owner reasoning: an initial supported-beta launch conventionally starts at
0.1.0, not 0.9.0 (which reads as "nearly 1.0/stable"); 0.x semver signals
"expect breaking changes between releases," which is the more accurate
signal pre-1.0. Updated every hardcoded/referenced occurrence: both
`SERVER_VERSION` literals (`src/servers/{framework,focus}/server.ts`), both
`package.json`s, both `server.json` manifests (2 version fields each — the
manifest's own + the nested npm package entry), and the
`bug_report.yml` issue-template placeholder. `tests/version-sync.test.ts`
enforces `SERVER_VERSION` ↔ `package.json` on every gate run, so these
can't drift apart silently. See decisions.md 2026-08-13 for the full
rationale note.

## Next steps

1. **PR #20 (`claude/session-k75rxy` → `dev`) is merged** — bundled T-080,
   T-081, T-079, the 0.1.0 version bump, and the guide nav restructure.
   That automatically refreshed the rolling **"Release: dev → main" PR #21**
   (same pattern as the already-merged #17) — Owner: review and merge **PR
   #21** next; nothing lands on GitHub Pages or npm until it does.
   (Correction: the old "merge the T-077 PR" step here was stale — T-077
   merged to `main` via PR #17 on 2026-08-07, before this note was last
   rewritten.)
2. Owner: flip the repo public — still **private** as of 2026-08-14
   (confirmed via the GitHub API), which is why `docs/release-runbook.md`'s
   npm trusted-publishing flow and the "flip public" step are both still
   open.
3. Owner: follow `docs/release-runbook.md` — manual first `npm publish` of
   both packages (0.1.0), configure trusted publishers, submit both
   `server.json` manifests via `mcp-publisher`.
4. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages deploy
   demo/`; smoke-test the demo against the deployed Worker.
5. **Resolved:** the long-pending "`governance` CI job green on a real PR"
   observable is now satisfied — PR #20 (merged) shows `governance:
   success` (not skipped), proving the package-access grant works.
   `gates-fast: success`, `gates-full: skipped` (expected — that tier is
   manual/scheduled, not run on every PR).

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
  2026-08-13**: shortening the nav to 4 top-level items + a 4-item Examples
  sub-nav (see "In flight" below) eliminated the leak on `index.html` and
  `focus-server.html` — the nav row was that overflow's source, confirmed by
  `document.documentElement.scrollWidth` measurement at 390px width dropping
  to exactly the viewport width on both. **Still open** on
  `framework-server.html`, `example-showback.html` and
  `example-forecasting.html`: a *different*, content-driven leak — certain
  wide `.tbl-wrap` tables (long unbroken `.mono` strings in cells) escape
  their `overflow-x:auto` container and widen `document.documentElement`
  itself (verified real via `window.scrollTo` actually moving `scrollX`, not
  just an inert `scrollWidth` reading). `.tbl-wrap` and its ancestor chain
  measure correctly bounded via `getBoundingClientRect`, so the cause is
  deeper than the container CSS — still deserves its own task.
- Upstream porting status: the two policy toggles (`solo_maintainer`,
  `ai_attribution`) ALREADY shipped in harness 0.2.0 (starter T-012/T-013);
  the remaining harness feedback (incl. task-ID collisions — bit again in
  THIS merge) lives in agentic-starter-repo's activeContext Next steps
  9–14. `.agents/specs/upstream-port-to-agentic-starter-repo.md` (from
  PR #15) is the fuller port brief; its toggle diffs are done, its smaller
  feedback list is superseded by the starter-repo list.

## Last updated

2026-08-14 — PR #20 opened and merged same-day; rolling PR #21
(dev → main) now the next owner action. `governance` CI green observable
resolved. Repo confirmed still private via the GitHub API.
