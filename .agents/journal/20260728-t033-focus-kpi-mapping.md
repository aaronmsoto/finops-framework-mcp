# T-033 — Unofficial KPI-to-FOCUS-column mapping

## What I did

Built the unofficial derivation from framework KPIs to the FOCUS columns
needed to compute each one, and served it via a new `get_kpi_mapping` tool.

- `src/crawlers/focus/kpi-mapping-data.ts`: a hand-authored `KPI_MAPPING`
  literal — no source page to parse this from, since no official mapping
  exists (verified against finops.org and the FOCUS spec repo). 18 KPIs:
  Effective Savings Rate Percentage; the 4-KPI commitment-discount set
  (Commitment Utilization Score, Percent of Compute Spend Covered by
  Commitment Discounts, Percentage of Commitment Discount Waste,
  Consumption versus Commitment); both Forecast Accuracy Rate KPIs
  (Spend/Usage); 6 unit-economics KPIs (Cost per Gigabytes Stored, Hourly
  Cost per CPU Core, Effective Average Compute Cost per Core, SaaS Unit
  Cost, Cost per API Call, Total Cost of Ownership per Workload); 4
  allocation/tagging-hygiene KPIs (AAI, unallocated/untagged/unallocated-
  shared cost percentages); 1 variance KPI (budget vs. actual). Every
  record: `official: false`, `focus_formula` (FOCUS ColumnIds + SQL-like
  WHERE/GROUP BY pseudocode), `columns_by_version` (currently identical for
  1.0 and 1.2 — every column used is present under the same ColumnId in
  both), `related_capability_slugs` (copied from the framework KPI, drives
  the tool's `capability` filter), and `caveat` (non-null for the
  forecast/budget KPIs, where FOCUS only supplies the actual/effective-
  spend side of the ratio).
- `src/crawlers/focus/emit.ts`: new `emitDerivedKpiMapping`, same shape as
  the existing `emitDerivedDiff`. `cli.ts`'s `ingest()` now emits both,
  hashing `kpi-mapping.json` into `index.json`'s `derived` map alongside
  `diff-1.0-1.2.json`.
- `src/shared/focus/artifact.ts`: `loadFocusStore` no longer assumes
  `index.derived` has exactly one entry (`Object.entries(...)[0]`) — it now
  reads every derived file, verifies each one's sha256 against index.json,
  then routes by filename (`diff-*` vs. `kpi-mapping.json`). Added a
  crossValidate pass: every `columns_by_version` entry's column ids must
  exist in that version's already-loaded `columns.json`, or
  `loadFocusStore` throws `ArtifactValidationError` naming the bad KPI/
  column/version. `FocusStore` gained a `kpiMapping` field.
- `src/servers/focus/uris.ts`: added `FRAMEWORK_KPI_URI(slug)` — builds
  `finops://framework/kpis/{slug}`. Deliberately duplicates (does not
  import) `src/servers/framework/uris.ts`'s `URI.kpi`, since the two
  servers package into separate tarballs (spec "Packaging") and importing
  framework code from focus/tools.ts would drag it into the focus package
  ahead of that task.
- `src/servers/focus/tools.ts`: `get_kpi_mapping(kpi?, capability?,
  version?)`. No `kpi`: lists every mapping (filtered by `capability` if
  given) with the UNOFFICIAL banner + methodology in text content. With
  `kpi`: one record, nearest-match suggestion on an unknown slug (mirrors
  every other lookup tool in this server). `version` resolves through the
  same `resolveVersion` as every other tool (default 1.2).
- Tests: `src/shared/focus/kpi-mapping.test.ts` reads
  `data/focus/derived/kpi-mapping.json`, `data/framework/content/kpis.json`,
  `data/framework/content/capabilities.json`, and both versions'
  `columns.json` directly (no server involved) and cross-validates: record
  count in [15, 20]; every `kpi_slug` found in framework kpis.json and
  `kpi_title` matching; every `related_capability_slugs` entry found in
  framework capabilities.json; every `columns_by_version` column id found
  in its version's columns.json; every `focus_formula` mentions at least
  one of its mapped columns; every record `official: false`; no duplicate
  slugs. `artifact.test.ts` gained 3 tests (kpiMapping loads with 15-20
  official:false entries; a tampered `kpi-mapping.json` fails sha256;
  an entry with an unknown column fails crossValidate).
  `server.test.ts` gained a `describe("get_kpi_mapping", ...)` block
  (banner text, `kpi_uri` = `finops://framework/kpis/{slug}` on every
  returned row, single-KPI lookup returns the right formula/columns,
  unknown-kpi nearest-match error, capability filter, empty-capability
  returns `total: 0` without erroring, version default/override) plus two
  entries in the outputSchema conformance test's covered-tools list.

## Verified live

Built (`npm run build`), then ran `node dist/crawlers/focus/cli.js` —
"kpi mapping: 18 KPIs (unofficial)", "fetch: 0 network, 128 cached, 0
robots-skipped" (fully offline, byte-identical from cache). Then loaded the
real artifact and called `get_kpi_mapping` through an in-memory MCP client:
`{kpi: "effective-savings-rate-percentage"}` returned the UNOFFICIAL
banner, the `ESR % = ((SUM(ListCost) − SUM(EffectiveCost)) /
SUM(ListCost)) × 100...` formula, `columns: [BillingPeriodStart,
BillingPeriodEnd, ListCost, EffectiveCost]`, and `kpi_uri:
"finops://framework/kpis/effective-savings-rate-percentage"`; the
no-args call returned `total: 18`. `data/focus/` is 868K on disk (cap
3MB per the v1 acceptance gate).

## Gate summary

`./scripts/agentic gates` — format/lint/typecheck/test/designs/integrity/
memory all PASS. 315/315 tests (was 297; +18 for this task). Integrity gate
emitted its usual informational WARN (diff mixes ~70 implementation files
with ~19 test/policy files vs. origin/main) — expected, since origin/main
is still behind the whole in-flight focus-mcp-v1 branch; not a fail.

## What should happen next

T-034 (`calculate_kpi`, per the spec: bundled samples only, ESR must match
a hand-computed fixture exactly) is the natural next task — it can reuse
this mapping's `columns_by_version`/`focus_formula` for ESR directly rather
than re-deriving which columns it needs. After that: packaging shim
(T-035), worker (T-036), critique gate #4 (T-037), evals/focus (T-038), per
`.agents/specs/focus-mcp-v1.md`.
