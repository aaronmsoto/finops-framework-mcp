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

Critique gate #4 (`docs/critique-4-focus-gate.md`) fix batch (T-039..T-047)
is **complete**. **T-047 done this session** (C1-protocol-3+4, C3-version-3,
MINOR, the batch's last item): two independent fixes in
`src/servers/focus/tools.ts`. First, `get_attribute`'s inline example slug
(`'CurrencyCodeFormat'`, renamed to `CurrencyFormat` in 1.2 — the server's own
example failed at the default version) is now `'datetime_format'` (present as
`DateTimeFormat` in both served versions); the tool's top-level description,
which previously never named the `slug` parameter or explained discovery at
all, now says to look up "by the `slug` parameter" and to discover attribute
slugs via `search_focus` with `entity_types=['attribute']`. Second,
`findColumn` (shared by `get_column`/`get_requirements`) gained a
cross-version probe: on a miss in the requested version, it now checks every
*other* served version in `store.versions` for an exact id/slug match before
falling back to fuzzy suggestions — `get_column
'{"column":"ServiceSubcategory","version":"1.0"}'` now says `"ServiceSubcategory"
does not exist in FOCUS 1.0 — it exists in FOCUS 1.2 (added in 1.1). Retry
with version="1.2" or see compare_versions.` instead of fuzzy-suggesting
unrelated columns; same fix covers `SkuMeter@1.0`. When a column resolves in
no served version, the fallback message now names the version consulted
(`Unknown column "X" in FOCUS {version}.`). `findColumn`'s signature grew a
`currentVersion` param; both call sites updated. `findAttribute` and
`compare_versions`' own separate not-found branch (already names both
versions) were untouched — out of scope. `server.test.ts` gained 4 new cases
(ServiceSubcategory/SkuMeter cross-version hints, version-named fallback,
datetime_format example success). Gates green (379 tests, up from 375).
Live-probed via `node evals/framework/mcp-call.mjs --server=focus call ...`:
`get_column` ServiceSubcategory@1.0 and SkuMeter@1.0 both name FOCUS 1.2;
`get_attribute` datetime_format succeeds at the default version (spec_version
1.2); a typo'd column at 1.0 names "in FOCUS 1.0"; `get_requirements` (the
other `findColumn` caller) unaffected. Docs-only-adjacent — no artifact regen
needed (server-side strings/descriptions only). Full detail:
`.agents/journal/20260730-t047-slug-hints-polish.md`.

**T-046 done in an earlier session this batch** (C2-fidelity-3, MAJOR):
`packages/focus-spec-mcp/README.md:14` called the sibling
`finops-framework-mcp` package "the official FinOps Framework server" —
"official" grammatically modified the *server* (this software), contradicting
the same package's own `NOTICE.md` ("independent, unofficial integration ...
not affiliated with or endorsed by the FinOps Foundation"). Fixed: reworded to
"the companion unofficial server for the FinOps Framework published at
finops.org/framework" — "official" now attaches only to the Framework.
Grepped both package READMEs, both package.json descriptions, and both
server.json files for other "official" occurrences per the fix's second
requirement: every remaining hit (root README's "official FinOps Framework"/
"official Crawl/Walk/Run", focus-spec-mcp README's "official FOCUS-to-FinOps-
KPI mapping"/"official sample dataset", both package descriptions' "official
FinOps Framework") modifies the upstream Framework/FOCUS/dataset, never the
software itself — none needed changing. Docs-only; no artifact regen. Gates
green. Full detail:
`.agents/journal/20260730-t046-focus-readme-official-phrasing.md`.

**T-045 done in an earlier session this batch** (C3-version-2, MAJOR):
`src/crawlers/focus/kpi-mapping-data.ts`'s 18 KPI entries all shared the
`perVersion()` helper, so `columns_by_version['1.0']`/`['1.2']` were
byte-identical everywhere and the shared `caveat` string for the three
commitment KPIs (`commitment-utilization-score`,
`percentage-of-commitment-based-discount-waste`,
`consumption-versus-commitment`) self-contradicted at version=1.2: it said
a quantity-based ratio "would need CommitmentDiscountQuantity, which FOCUS
only introduced in 1.2" while the *requested* version was 1.2, where that
column exists. Fixed: those three entries now write `columns_by_version`
by hand ('1.0' unchanged four columns; '1.2' adds
CommitmentDiscountQuantity/CommitmentDiscountUnit, both confirmed present
in `data/focus/1.2/columns.json` and in `derived/diff-1.0-1.2.json`'s
added_columns) and their `caveat` is rewritten as a single version-neutral
string ("...at FOCUS 1.0, which has no dedicated committed-quantity
column; FOCUS 1.2 adds CommitmentDiscountQuantity/CommitmentDiscountUnit,
which a quantity-based ... ratio should prefer instead.") — deliberately
not split into a `caveat_by_version`/`focus_formula_by_version` structural
field, since `calculate_kpi`'s actual registered formula (unchanged, still
spend-based at every version per T-044) would then display a
recommend-quantity-based caveat next to a spend-based computed value, a
new mismatch; see decisions.md / the T-045 journal for the full reasoning.
`focus_formula` text itself was untouched (it only ever made a true,
version-scoped claim about 1.0). Re-ran `node dist/crawlers/focus/cli.js`
(cache-only, 0 network fetches — only `derived/kpi-mapping.json` +
`index.json` changed) and `node scripts/bundle-worker-data.mjs`.
`server.test.ts` gained a new `get_kpi_mapping` case asserting, for all
three KPIs: at 1.2, `columns` includes both quantity columns and `caveat`
matches "FOCUS 1.2 adds CommitmentDiscountQuantity" but not "only
introduced in 1.2"; at 1.0, `columns` excludes the quantity columns and
`caveat` still explains the spend proxy. Gates green (375 tests, up from
374). Live-probed: `get_kpi_mapping
'{"kpi":"consumption-versus-commitment","version":"1.2"}'` — columns now
include CommitmentDiscountQuantity/CommitmentDiscountUnit, caveat no
longer claims 1.2 lacks them; the same call at `version:"1.0"` still
explains the spend proxy and correctly omits the quantity columns; both
carry `official: false`. `calculate_kpi` at 1.2 unaffected
(`0.4982433908723174`, unchanged from T-044). Full detail:
`.agents/journal/20260730-t045-kpi-mapping-version-diff.md`.

**T-044 done in an earlier session this batch** (C3-version-1 + C4-community-2,
MAJOR): `calculateKpi`'s three commitment KPIs (commitment-utilization-score,
percentage-of-commitment-based-discount-waste, consumption-versus-commitment)
shared a `ratio()` helper that coerced a zero denominator to 0 — at FOCUS
1.0, whose official sample has zero `ChargeCategory="Purchase"` rows, this
fabricated a definite-looking "0%"/"100%"/"0" instead of erroring, violating
the server's own "uncomputable KPIs error with guidance" design. Fixed:
`src/shared/focus/kpi-calc.ts` gains `commitmentUsageAndPurchase(t)`, used by
all three formulas, which throws (naming the missing Purchase rows and
suggesting `version="1.2"`, verified true — 1.2's synthetic sample has 12
qualifying rows) instead of returning when the purchase sum is 0; caught by
the existing `calculate_kpi` handler's try/catch into the clean `err(...)`
guidance path — no handler change needed. ESR's zero-ListCost return-0 is
untouched (semantically true: 0 spend really is 0% savings). This task
explicitly authorized updating the fixtures that pinned the old fabricated
values: `kpi-calc.test.ts` (new zero-denominator throw test, all three
KPIs), `src/servers/focus/server.test.ts` (new not-computable-at-1.0 +
computes-at-1.2 tests), `src/workers/demo-requests.test.ts` (asserts
not-computable instead of 0/100/0), `demo/app.js` (the step-6 per-KPI loop
now catches a per-iteration `calculate_kpi` failure as an expected
error-with-guidance outcome and continues to the next KPI, rather than
treating it as a walkthrough-stopping failure), and
`evals/focus/combined-scenario.xml` (step 5/6 rewritten: the three
commitment KPIs now expect a tool error with guidance, and the author
annotation explains why the guard is correct and supersedes the prior
"not a bug" framing gate 4 found to be a fabrication). Gates green
(`--tier all`: 374 tests). Live-probed:
`calculate_kpi '{"kpi":"commitment-utilization-score","version":"1.0"}'` →
`isError: true`, guidance text naming the missing Purchase rows and
`version="1.2"`, no 0% value; ESR at 1.0 unchanged
(`26.552972346576816%`); commitment-utilization-score at 1.2 computes
normally (`49.82433908723174%` over the 60-row synthetic sample). Full
detail: `.agents/journal/20260730-t044-kpi-zero-denominator-guard.md`.

**T-043 done in an earlier session this batch** (C2-fidelity-4 + C2-fidelity-5,
MAJOR + MINOR): two independent findings, one change set. First, the
bundled upstream CHANGELOG (`data/focus/{version}/CHANGELOG.md`, ingested
since T-029 but never exposed) is now a resource,
`focus://spec/{version}/changelog` (`src/servers/focus/uris.ts` gains
`URI.changelog`/`TEMPLATES.changelog`; `render.ts` gains `changelogMd()` —
verbatim `changelog_md` + the same CC BY `footer()` every other
content-bearing surface uses, source-citing the raw CHANGELOG URL found in
`manifest.source_urls`; `resources.ts` registers it mirroring the glossary
resource's list/complete shape). Second, `compare_versions`'s shared banner
(`src/servers/focus/tools.ts`, all five response branches) now cites the
upstream materiality caveat verbatim-paraphrased ("most changes are not
material unless specifically called out") and points at the new changelog
resource plus each entry's `from_source_url`/`to_source_url` to judge
materiality — previously the "43 changed" count was bare, and the bundled
CHANGELOG (which states outright that formatting reflow explains most of
those 43) was reachable by no tool or resource. Third, `FocusDiff` gains an
`official: false` field (`types.ts`, set in `diffColumns`/`diff.ts`) so
`data/focus/derived/diff-1.0-1.2.json` now actually carries the
`official: false` marker `packages/focus-spec-mcp/NOTICE.md` already
claimed every derived record has (true before only for
`kpi-mapping.json`); `compare_versions`'s `outputSchema` and every
structuredContent payload echo `official: false` alongside `from`/`to`.
Re-ran `node dist/crawlers/focus/cli.js` (cache-only, 0 network fetches) —
only `derived/diff-1.0-1.2.json` and `index.json` changed (the new field);
column/attribute/manifest content is byte-identical. Re-ran
`node scripts/bundle-worker-data.mjs` so `src/workers/generated/
focus-store.ts` matches. `server.test.ts`: new tests for the changelog
resource (upstream heading + materiality sentence + CC BY footer present),
for the compare_versions banner (materiality sentence + changelog URI in
text), and `official: false` assertions on the full-diff and per-column
`changed` structuredContent; `diff.test.ts`/`emit.test.ts` updated for the
new required field. Gates green (`--tier all`: 370 tests, up from 367).
Live-probed via a scratch MCP client script (deleted after use): reading
`focus://spec/1.2/changelog` returns text starting with the real upstream
CHANGELOG heading, containing the exact upstream materiality sentence, and
ending with the CC BY 4.0 footer citing
`https://raw.githubusercontent.com/.../v1.2/CHANGELOG.md`; `compare_versions
'{}'` text now reads "...read focus://spec/1.2/changelog and each entry's
source_url(s) below to judge materiality..." with `structuredContent.
official: false`.

**T-042 done in an earlier session this batch** (C1-protocol-2, MAJOR):
`compare_versions`'s fallthrough branch (`src/servers/focus/tools.ts`)
returned `status: "unchanged"` for *any* column not in the diff's added/
removed/changed lists — including typos, since with today's data (14
added, 0 removed, 43 changed, i.e. every real overlapping column already
flagged changed) "unchanged" was reachable *exclusively* via bad input.
Fixed: before falling through to "unchanged", the column is looked up
against both `store.versions.get(diff.from)`/`get(diff.to)`'s column sets
(same matcher `findColumn` uses); if it resolves in neither, returns
`err(...)` with the same `nearestMatches` did-you-mean suggester
`get_column` uses, `isError: true`. Only resolving in at least one artifact
falls through to `status: "unchanged"`, now reporting the canonical id
(mirrors added/removed/changed already doing so) instead of the raw input.
`server.test.ts`: tightened the pre-existing BilledCost test from
`toContain(["changed","unchanged"])` to `.toBe("changed")` (the loose
assertion was the old bug's cover); added a typo'd-column error test; and
since the real diff has zero naturally-unchanged columns, added a
synthetic-store test (clone real store, drop one real `changed_columns`
entry from the clone's diff, confirm `status: "unchanged"` for that real,
both-versions column). Gates green (367 tests, up from 365). Live-probed:
`compare_versions '{"column":"BilledCosts"}'` → isError true, "Did you
mean: billedcost?"; `'{"column":"BilledCost"}'` → still "changed"
unaffected. Independently verified by the `reviewer` subagent (traced
logic, live-probed the built server, ran gates itself): pass, no defects.
Full detail: `.agents/journal/20260730-t042-compare-versions-unknown-column.md`.

**T-041 done in an earlier session this batch** (C1-protocol-1, MAJOR):
`get_requirements` (`src/servers/focus/tools.ts`) built its bullet list
directly and returned it with no attribution, unlike every other
content-bearing tool which routes through `render.ts`'s `footer()`. Fixed:
the handler now appends `footer(resolved.artifact, c.source_url)` to the
text response (same helper, same trailing line `get_column` uses) and its
`outputSchema`/structured payload gain `source_url: z.string()` and
`license: z.literal("CC-BY-4.0")` alongside the existing `spec_version`/
`column`/`requirements` fields — mirrors `columnRecordSchema`'s existing
`source_url`/`license` pair. `render.js` needed a new import (`footer`
alongside the existing `attributeMd`/`columnMd`); no change to `render.ts`
itself. `server.test.ts` gained a new case
("get_requirements carries the same CC BY attribution as get_column")
asserting the footer's licensed-CC-BY-4.0 substring in the text and
`source_url`/`license` in structuredContent; the pre-existing
"returns the verbatim MUST/SHOULD bullets" test wasn't pinning the old
footer-less text (it only asserted on `requirements`), so no rewrite was
needed there. Gates green (`--tier` default: 365 tests, up from 364).
Live-probed via `node evals/framework/mcp-call.mjs --server=focus call
get_requirements '{"column":"BilledCost"}'`: text now ends "...Source:
https://raw.githubusercontent.com/.../billedcost.md — © FinOps Foundation,
licensed CC BY 4.0 (...). Content restructured and adapted by
focus-spec-mcp..."; structuredContent gained
`"source_url":"https://raw.githubusercontent.com/.../billedcost.md"` and
`"license":"CC-BY-4.0"`, matching get_column's attribution verbatim.

**T-040 done in an earlier session this batch** (the batch's other BLOCKER,
C4-community-1): `src/workers/app.ts`'s `createFetchHandler` never
answered OPTIONS preflights and never emitted `Access-Control-Allow-
Origin`, so no browser (including the T-038 demo) could ever read a
cross-origin response regardless of `ALLOWED_ORIGINS`. Fixed: OPTIONS now
short-circuits to a 204 with ACAO (echoing the Origin) + `Access-Control-
Allow-Methods: POST, GET, DELETE, OPTIONS` + `Access-Control-Allow-Headers:
Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version`; every other
response also gets ACAO set whenever an Origin was sent (it's already
passed the existing allowlist gate by that point — no new reject path
needed, unlisted-Origin OPTIONS 403s the same as any other method).
`src/workers/app.test.ts` gained a `CORS preflight` describe block (both
routes, allowed + unlisted Origin) plus two `Origin allowlist` cases for
ACAO presence/absence on POST. `docs/deploy-worker.md` §2 now says
`ALLOWED_ORIGINS` also drives CORS (a browser silently discards the
response client-side without matching ACAO, even though the same JSON-RPC
response crossed the wire); `demo/client.js`'s error hint no longer implies
a separate "allowlist configured?" toggle. Gates green (`--tier all`:
364 tests, up from 359; `app.ts` 100% statement coverage). Live-probed via
a scratch native-Request script (`dist/workers/app.js`,
`allowedOrigins:['https://demo.pages.dev']`, deleted after use): allowed-
Origin OPTIONS → 204 + all three CORS headers; allowed-Origin POST → 200 +
ACAO; unlisted-Origin OPTIONS → 403, no ACAO — reverses the gate's
pre-fix repro (`PREFLIGHT status: 405`, `POST ACAO: null`). Full detail:
`.agents/journal/20260730-t040-worker-cors.md`.

**T-039 done in an earlier session this batch**: fixed the two
BLOCKERs/MAJORs that share one root cause — `extractRequirements`
(`src/crawlers/focus/parse/table.ts`) was flattening nested normative
bullets and dropping RECOMMENDED/MAY. Now:
- `NORMATIVE` extended to the full RFC-2119 family FOCUS uses: `MUST NOT`,
  `MUST`, `SHOULD NOT`, `SHOULD`, `RECOMMENDED`, `MAY` (longest-first).
- `buildBulletForest`/`collectNormative` (new) parse the requirements
  section into an indentation-based bullet tree (2-space nesting, up to 3
  levels observed live in `CommitmentDiscountQuantity` 1.2) instead of
  filtering to indent-0 lines only. Every normative bullet at any depth is
  emitted, nested ones prefixed with the full chain of ancestor bullet
  text (trailing `:` stripped, joined `": "`) — see decisions.md
  2026-07-30 for why the whole ancestor text is used rather than a
  hand-trimmed clause.
- `parse/table.test.ts`'s old "ignoring nested bullets" assertion (wrong
  per gate 4) rewritten; added fixture tests pinning EffectiveCost 1.2's
  reconciliation MUSTs, SkuId 1.2's nullability MUSTs/MAY, and InvoiceId
  1.2's RECOMMENDED/MAY bullets surviving parsing.
- Re-ran `node dist/crawlers/focus/cli.js` (cache-only, 0 network fetches)
  to regenerate `data/focus/{1.0,1.2}/{columns,attributes}.json` +
  manifests; `data/focus/derived/diff-1.0-1.2.json` came out byte-identical
  (the 43 "changed" columns were already flagged changed pre-fix, so
  recovering more requirements text into an already-changed column doesn't
  move the diff counts — expected, not a bug). Re-ran
  `scripts/bundle-worker-data.mjs` so `src/workers/generated/focus-store.ts`
  matches.
- Live-probed via `node evals/framework/mcp-call.mjs --server=focus call
  get_requirements '{"column":"EffectiveCost","version":"1.2"}'` (10
  requirements now, incl. both `CommitmentDiscountId`-scoped MUSTs) and
  same for `InvoiceId` 1.2 (7 requirements: RECOMMENDED presence, both
  nullability MUSTs, and the MAY pre-invoice bullet all present). Also
  confirmed the 1.0 `tags.md` MAY-recovery from gate 4's count (`git diff
  data/focus/1.0/columns.json` shows the added "Tag key with a null value
  ... MAY be included" bullet).
- `packages/focus-spec-mcp/data/` is gitignored and re-staged from
  `data/focus/` at `npm pack`/prepack time (confirmed in the gates test
  run's "pack-focus: staged ... data/focus" log line) — no separate
  regen needed there.
- Gates green (`--tier all`: format/lint/typecheck/test 359 passed/
  designs/integrity/memory/build all pass; coverage/e2e optional-skip as
  before).

Gate-4 fix batch (T-039..T-047) is now fully closed. Package trademark
naming (C4-community-3) remains an owner decision point, not yet a queued
task.

---

Prior batch: focus-spec-mcp v1 build loop (`.agents/specs/focus-mcp-v1.md`,
tasks T-027..T-038) — **all of T-027..T-038 are DONE**.

T-038 this session: static demo web app (`demo/`) for the combined
Rate Optimization walkthrough — capability → featured KPIs →
`get_kpi_mapping` (FOCUS columns per version, 1.0 and 1.2) →
`compare_versions` → `calculate_kpi` per featured KPI, against the T-037
Worker's `/mcp/framework` + `/mcp/focus` routes. No build step: plain ESM
`.js` files (`demo/config.js` — the one endpoint-config object;
`demo/requests.js` — pure JSON-RPC request-body builders, no fetch/DOM,
mirrors `evals/focus/combined-scenario.xml` steps 1-5 which that file's own
header says doubles as this demo's source script; `demo/client.js` — thin
`fetch()` wrapper; `demo/app.js` — the browser driver, which reads step 2's
`featured_kpis` at runtime rather than hardcoding the KPI list, so the
walkthrough is a real capability→KPI→column→calculate chain, not a canned
script) plus `demo/index.html`. `demo/requests.d.ts` is a hand-written
ambient-types shim (TS resolves a sibling `.d.ts` for a same-named `.js`
without `allowJs`) so `src/workers/demo-requests.test.ts` gets real types
without pulling `demo/` into tsconfig's `include` (format/lint/typecheck
gates are `src tests`-scoped, so `demo/`'s plain JS is untouched by them —
confirmed against `agentic.config.json`/`tsconfig.json` before relying on
it). That test imports `demo/requests.js` directly and drives the exact
request bodies through T-037's `createFetchHandler` with the real
`data/framework`/`data/focus` fixtures, asserting against
combined-scenario.xml's fixture numbers (ESR 26.552972346576816%, etc.) —
all matched on first run, no drift since that eval was written. Also ran a
throwaway (uncommitted, scratchpad) Node script standing up a real
`http.createServer` in front of the same handler and driving
`demo/client.js`'s actual `fetch()` calls over a real socket end-to-end, as
the closest substitute for a browser in this headless environment.
`docs/deploy-demo.md`: owner checklist (point `demo/config.js` at the
deployed Worker → add the demo's deployed origin to the Worker's
`ALLOWED_ORIGINS` → `wrangler pages deploy demo` → smoke test → rollback).
Gates green (`--tier all`). Full detail:
`.agents/journal/20260728-t038-demo-webapp.md`.

T-037 (earlier session): Cloudflare Worker (`src/workers/`) serving both MCP
servers over HTTPS. `src/workers/app.ts` exports `createFetchHandler` — a
factory routing `/mcp/framework` + `/mcp/focus`, building a fresh
`McpServer` + `WebStandardStreamableHTTPServerTransport`
(`sessionIdGenerator: undefined`, `enableJsonResponse: true` — stateless)
per request, plus an Origin allowlist (absent Origin always allowed;
present-but-unlisted → 403 before any server work). `src/workers/index.ts`
is the actual Worker entry (`wrangler.toml`'s `main`): loads both data
artifacts once per isolate via `src/workers/data.ts` and reads
`ALLOWED_ORIGINS` from a `[vars]`/env binding. `scripts/bundle-worker-data.mjs`
is the build-time bundler — reuses `loadArtifact`/`loadFocusStore` from
`dist/shared/` (same ajv schema + manifest sha256 validation the stdio
servers use, so no separate ajv dependency needed in the worker bundle) and
re-emits the two artifacts as committed TypeScript modules under
`src/workers/generated/` (`framework-artifact.ts` is the `Artifact` object
literal as-is; `focus-store.ts` serializes `FocusStore`'s two `Map` fields
— `versions`, `sampleCsv` — as plain objects, since Maps aren't
JSON-representable; `data.ts` rehydrates them into real `Map`s at read
time). The bundler self-formats its output with prettier so re-running it
never breaks the format gate.

Key fix required to satisfy "no node:fs reachable from src/workers/index.ts":
`src/servers/{framework,focus}/tools.ts` and `resources.ts` imported
`nearestMatches` (and, in framework/resources.ts, `ALL_MATURITY_LEVELS`/
`OFFICIAL_MATURITY_LEVELS`) from the `../../shared/index.js` **barrel**,
which does `export * from "./artifact.js"` / `export { loadFocusStore }
from "./focus/artifact.js"` — both of which import `node:fs` at module top
level. ANY import from the barrel (even of an fs-free name) pulls the
whole barrel's static import graph in per ESM semantics. Fixed by importing
`nearestMatches` directly from `../../shared/slugs.js` and the maturity
constants from `../../shared/types.js` (both genuinely fs-free) in all four
files — no behavior change, pure import-path fix. `src/workers/fs-boundary.test.ts`
statically walks the real import graph from `src/workers/index.ts`
(following non-type-only `import`/`export ... from` statements — re-exports
matter because that's exactly the barrel's own shape, and a naive
`import`-only regex would silently miss it, verified by deliberately
reintroducing the barrel import and confirming the test failed with the
exact chain before re-fixing it) and fails if anything resolves to
`node:fs`; a second "sanity" test in the same file guards against the walk
passing vacuously by asserting it actually reaches
`servers/{framework,focus}/tools.ts`. `src/workers/bundle-data.test.ts`
guards the two committed generated files against drifting from
`data/framework`/`data/focus` (re-derives via the same loaders, `toEqual`).
`src/workers/app.test.ts` drives initialize/tools-list/tools-call on both
routes with native `Request` objects (no wrangler), plus 403 (unlisted
Origin)/404 (unknown path)/405 (unsupported method, via the transport's own
handling). `wrangler.toml`: `main = "src/workers/index.ts"`,
`compatibility_flags = ["nodejs_compat"]` (needed for `shared/tools.ts`'s
`node:crypto` cursor hashing — unrelated to the fs-free data path),
`[vars] ALLOWED_ORIGINS = ""` default. `docs/deploy-worker.md`: owner
checklist (regenerate bundle → configure allowlist → `wrangler login` →
`wrangler deploy` → curl smoke test → rollback). Independently verified by
the `reviewer` subagent (traced the import graph by hand, ran gates and the
worker test suite directly). Gates green (`--tier all`: format/lint/
typecheck/test 354 passed/coverage/designs/integrity/memory/build all
pass). Full detail: `.agents/journal/20260728-t037-cloudflare-worker.md`.

T-036 (earlier session): `packages/focus-spec-mcp/` publish shim. See
`.agents/journal/20260728-t036-focus-pack-shim.md` for detail.

T-035 (earlier session): eval design (`evals/focus/`), no source changes.
See `.agents/journal/20260728-t035-focus-eval-suite.md`.

Earlier (T-027..T-034, condensed): T-029 ingested FOCUS spec text for
versions 1.0/1.2 into `data/focus/`; T-030 built `src/servers/focus/` (the
version-aware FOCUS stdio server, mirrors `src/servers/framework/`'s module
layout); T-031 built `src/shared/focus/validate.ts` + official 1.0 sample
fixture; T-032 built the seeded synthetic FOCUS CSV generator; T-033 added
the unofficial KPI-to-FOCUS-column mapping (`get_kpi_mapping`); T-034 added
`calculate_kpi` over bundled sample data (formula registry for 9 of ~18
mapped KPIs). Full detail in git history and `.agents/journal/`.

## Next steps

1. **T-039..T-047 all done — gate-4 fix batch is closed.** Package trademark
   naming (C4-community-3) is a separate owner decision, not yet queued.
2. Open PR (branch → dev) for the harness fix batch (T-025/T-026) + v1.1
   mini-batch — the gate-4 fix batch (T-039..T-047) has now closed out.
3. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release) —
   T-036 gives `packages/focus-spec-mcp/` a second, independent publish
   target (own `server.json`, own version line) alongside root.
4. Owner: deploying the Cloudflare Worker (T-037) and the demo (T-038) are
   both human approval points — `docs/deploy-worker.md` and
   `docs/deploy-demo.md` have the checklists; nothing in this repo's
   automation runs `wrangler deploy` or `wrangler pages deploy`.
5. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
6. Owner: install docs/proposed/refresh-data.yml per its checklist.

## Open questions

- `dist/shared/focus/*` (schemas/types only, a few KB) ships in the
  framework tarball, and `dist/shared/md.ts` (crawler-only, unused at
  runtime by either server) ships in the focus tarball — both are
  consequences of `src/shared/index.ts`'s `export *` barrel, which every
  server/crawler entry point imports from and which ESM evaluates in full
  regardless of which name is destructured. T-037 worked around the same
  root cause for the worker (see "In flight" above) by importing specific
  fs-free modules directly instead of the barrel in the four affected
  server files — but the barrel itself is unchanged, so any *new* server
  code that imports a real (non-type) binding from `shared/index.js` can
  silently reintroduce fs-reachability; `src/workers/fs-boundary.test.ts`
  will catch it if that new code is itself reachable from
  `src/workers/index.ts`, but won't catch it otherwise. Splitting the
  barrel so each server's tarball/bundle carries only the shared code it
  actually uses would be a real (multi-file) refactor, out of scope for
  T-037's worker-only mandate.
- Root `NOTICE.md` has no attribution section for the FOCUS spec text
  itself (data/focus/{1.0,1.2}/, ingested T-029) — only the T-031 sample
  fixture is covered. Should be added (mirrors the FinOps Framework
  section) but is out of scope for the tasks that found the gap.
- `validateFocusCsv` (T-031) can't validate a JSON-typed column that also
  declares `allowed_values` as embedded-key names rather than literal
  values (today: 1.2's `SkuPriceDetails`, per KeyValueFormat) — the
  generator works around it by always emitting null (decisions.md
  2026-07-28); a future task could teach the validator to parse
  KeyValueFormat keys against the enum instead.
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind FINOPS_MCP_EXPERIMENTAL.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); refresh-
  workflow GITHUB_TOKEN/CI caveats mirror the template's item 3; NEW —
  supervising sessions must not commit a live loop's in-flight tasks.json
  (stop-hook lesson, journal 20260723-harness-improvements-session.md).

## Last updated

2026-07-30 — T-047 done (gate-4 fix batch now fully closed: get_attribute's
inline example is now 'datetime_format', present in both served versions,
and its description names the `slug` parameter + search_focus
entity_types=['attribute'] discovery; findColumn now names the served
version a real column/slug resolves in when it's missing from the requested
version — ServiceSubcategory@1.0/SkuMeter@1.0 name FOCUS 1.2 + "added in
1.1" + suggest compare_versions — and names the version consulted
otherwise; gate 4 C1-protocol-3+4, C3-version-3; 4 new server.test.ts cases,
gates green 379 tests, live-probed). T-046 done earlier same day
(focus-spec-mcp README no longer calls the sibling
`finops-framework-mcp` package "the official FinOps Framework server" —
reworded so "official" attaches only to the Framework, never the software;
gate 4 C2-fidelity-3; grepped both package READMEs/descriptions/server.json
files, no other software-official binding found; docs-only, gates green).
T-045 done earlier same day (the three commitment KPIs' kpi-mapping entries
version-differentiate: columns_by_version['1.2'] gains
CommitmentDiscountQuantity/CommitmentDiscountUnit and the shared caveat is
rewritten version-neutral, so get_kpi_mapping at version=1.2 no longer
claims it can't use a column FOCUS 1.2 actually has; gate 4 C3-version-2;
kpi-mapping.json + worker bundle regenerated; new server.test.ts case;
gates green 375 tests; live-probed both versions). T-044 done earlier same
day (calculate_kpi's three commitment KPIs throw a
clean not-computable guidance error, naming the missing Purchase rows and
suggesting version="1.2", instead of coercing a zero denominator to a
fabricated 0%/100%/0; gate 4 C3-version-1/C4-community-2; kpi-calc/server/
demo-requests tests and the demo app + combined-scenario eval updated per
this task's explicit fixture-update authorization; gates --tier all green
374 tests, live-probed both the not-computable path at 1.0 and unaffected
ESR/1.2-computes-fine paths). T-043 done earlier same day
(focus://spec/{version}/changelog resource exposes
the bundled upstream CHANGELOG verbatim; compare_versions banner cites the
upstream materiality caveat and links the changelog resource +
source_urls; FocusDiff/diff-1.0-1.2.json/compare_versions structuredContent
all gain official: false, making NOTICE.md's "all derived records" claim
true; gate 4 C2-fidelity-4+5; new tests, gates --tier all green 370 tests,
live-probed). T-042 done earlier same day (compare_versions errors with
did-you-mean
suggestions on columns unknown to both versions instead of reporting
"unchanged", gate 4 C1-protocol-2; new tests incl. a synthetic
genuinely-unchanged case; gates green, live-probed, reviewer-verified).
T-041 done earlier same day (get_requirements gains the same CC BY footer +
source_url/license get_column uses, gate 4 C1-protocol-1; new test, gates
green, live-probed). T-040 done earlier same day (Worker CORS: OPTIONS
preflight + ACAO on every allowed-Origin response, gate 4 C4-community-1;
deploy doc + demo hint fixed; gates --tier all green, live-probed). T-039
done earlier same day (requirements parser keeps nested normative bullets
+ RECOMMENDED/MAY, gate 4 C2-fidelity-1/2; data/focus + worker bundle
re-derived).
