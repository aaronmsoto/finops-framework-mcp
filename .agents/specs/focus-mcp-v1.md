# Spec: focus-spec-mcp v1 — version-aware FOCUS specification MCP server

Owner-approved 2026-07-24 (question round + plan approval). Binding for loop
tasks T-027..T-038. Companion to the shipped framework server; the version
model defined here is the pattern the framework server adopts later.

## Problem

The FOCUS spec (FinOps Open Cost & Usage Specification) is versioned, and
meaning is version-dependent: columns are added (43 in v1.0 → 57 in v1.2),
renamed, deprecated, and re-semanticized across releases. Agents need a
queryable, version-pinned interface — and the combined value with the
framework server (capability → KPI → FOCUS columns → calculation) needs a
machine-usable bridge that today does not exist anywhere.

## Sources (verified)

- Spec text: github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec at git
  tags `v1.0` and `v1.2`, via raw.githubusercontent.com (api.github.com is
  proxy-blocked here). Column enumeration comes from each tag's
  `specification/columns/columns.mdpp` !INCLUDE list; expected counts are
  pinned: **43 (v1.0), 57 (v1.2)**; cross-check against
  `https://data.jsdelivr.com/v1/packages/gh/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec@<tag>?structure=flat`.
- Column file format (identical across both tags): H1 + prose + normative
  bullets (`* X MUST ...`), then `## Column ID`, `## Display Name`,
  `## Description`, `## Content constraints` (table: Column type, Feature
  level, Allows nulls, Data type, Value format, Number range),
  `## Introduced (version)`.
- Also ingest per tag: `specification/attributes/*.md` (via
  attributes.mdpp), `specification/glossary.md`, repo `CHANGELOG.md`.
- Official sample data: FOCUS-Sample-Data `FOCUS-1.0/focus_sample.csv`
  (1,000 rows, ~755KB, plain file, NOT LFS) — committed as test fixture
  with PROVENANCE.json. No 1.2 sample exists anywhere.
- License: CC BY 4.0 for spec text and sample data. FOCUS™ is a trademark:
  attribution must not imply endorsement (NOTICE.md pattern).

## Ingestion rules

Parse ONLY the structured sections (requirements bullets → requirements[],
constraints table → typed fields, Introduced → introduced_version); serve
everything else as canonical markdown verbatim. A parse failure degrades to
markdown-only for that file — it never blocks the artifact. Reuse
CachedFetcher (parameterized origin/UA) with an on-disk cache so refresh
re-runs are offline and byte-identical. Commit 4-6 raw column files per
version as parser-test fixtures. Emit a per-file ingest report (parsed vs
markdown-fallback) into the manifest. Fallback that still ships: columns +
glossary only.

## Version model (BINDING — framework server adopts this later)

- Layout: `data/focus/index.json` = `{latest: "1.2", versions: [{
  spec_version, dir, data_version, source_tag, manifest_sha256}]}` plus one
  full manifest per version dir (`data/focus/1.0/manifest.json`, ...) with
  the sha256 map of that dir. Cross-version derived data (diff, changelog,
  KPI mapping) lives in `data/focus/derived/`, hashed in index.json.
- Load: each version dir loads through the generic artifact seam (T-028)
  into `Map<spec_version, FocusArtifact>`; index.json is discovery +
  integrity root.
- Every tool takes `version` (enum from index.json) defaulting to "1.2";
  responses echo `spec_version` in structuredContent.
- Cursors: existing shape; the `version` param participates in the
  cursorContext fingerprint so cross-version cursor reuse is rejected.
- URIs: single authority, versioned path —
  `focus://spec/{version}/columns/{slug}`,
  `focus://spec/{version}/attributes/{slug}`,
  `focus://spec/{version}/glossary`, `focus://spec/changes/1.0-1.2`.
  Column identity: canonical ColumnId (`BilledCost`); lowercase filename
  slug in URIs (matches upstream).

## Tool surface (focus server)

list_versions; get_column(column, version); list_columns(version,
feature_level?, column_type?); search_focus(query, version, ...);
get_attribute(slug, version); get_requirements(column, version) — normative
MUST/SHOULD bullets verbatim; compare_versions(column?) — the 1.0→1.2 diff
(14 added columns + changed records, source-cited); get_kpi_mapping(kpi?,
capability?, version) — DERIVED/UNOFFICIAL (see below); calculate_kpi(kpi,
version, sample?) — bundled samples only; validate-oriented tooling is CLI,
not MCP (read-only server). All tools readOnlyHint/idempotentHint; CC BY
4.0 attribution footers on content-bearing responses; structuredContent
must conform to declared outputSchema (conformance test pattern from
critique-3 applies).

## KPI→FOCUS mapping methodology (DERIVED, UNOFFICIAL)

No official mapping exists (verified). Ours: ~15-20 high-impact framework
KPIs (ESR, commitment-discount set, forecast accuracy, unit-economics set)
mapped per spec version to the FOCUS columns needed to compute them, with a
translation formula in FOCUS terms. Every record: `official: false`, an
UNOFFICIAL banner in text output, framework KPI slug + finops:// URI
cross-references (cross-validated against data/framework kpis.json in
tests). Methodology note in the artifact explains inference basis.

## Packaging / worker / demo (pinned)

- Publish shim `packages/focus-spec-mcp/` (own package.json: name
  focus-spec-mcp, bin → dist/servers/focus/main.js, files [dist,
  data/focus, README, LICENSE, NOTICE], prepack runs
  scripts/pack-focus.mjs copying dist/servers/focus + dist/shared +
  data/focus in; mcpName io.github.aaronmsoto/focus-spec-mcp; own
  server.json). Root package.json: only narrow `files` so framework
  tarballs exclude focus code/data.
- Worker: src/workers/app.ts fetch-handler factory (routes /mcp/framework
  + /mcp/focus; per-request server + WebStandardStreamableHTTPServerTransport
  from SDK 1.29 with sessionIdGenerator: undefined + enableJsonResponse:
  true; Origin allowlist in app code, absent-Origin allowed). Data =
  build-time-ajv-validated JSON modules via scripts/bundle-worker-data.mjs
  (no fs, no ajv in bundle). wrangler.toml with nodejs_compat. Tests drive
  the handler with native Request objects — never wrangler.
- Demo app: static files, single endpoint-config object, Rate Optimization
  walkthrough (capability → KPIs → columns per version → calculate on
  sample). Deploy docs only; owner deploys.

## Acceptance criteria (v1 gate)

- [ ] data/focus artifact for 1.0 + 1.2, ≤3MB on disk, refresh
      byte-identical from cache, counts 43/57 asserted.
- [ ] Focus server: all tools tested incl. version default + cross-version
      cursor rejection; bridge lists the surface; gates green throughout.
- [ ] Official 1.0 sample passes the 1.0 validator with 0 errors; seeded
      generator output passes its version's validator; committed synthetic
      samples ≤200KB.
- [ ] KPI mapping cross-validated both directions; unofficial flagging
      everywhere; ESR calculation matches a hand-computed fixture exactly.
- [ ] evals/focus fresh-agent ≥9/10 + combined two-server scenario pass.
- [ ] Critique gate #4: zero unresolved BLOCKERs (docs/critique-4-focus-gate.md).
- [ ] focus tarball <1MB, contains no framework data; framework tarball
      contains no focus data; packed bin serves initialize.
- [ ] Worker handler tests green on both routes; deploy docs complete.

## Non-goals (v1)

Versions other than 1.0/1.2 (design supports adding them by re-running
ingestion); framework-server code changes (adoption notes only); deploying
anything (owner approval points); accepting user-supplied datasets in
calculate_kpi (bundled samples only — injection surface deferred).
