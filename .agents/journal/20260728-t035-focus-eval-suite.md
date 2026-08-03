# T-035 — Focus eval suite and combined two-server scenario

## What I did

Built `dist/` (`npm run build`) and drove the live focus stdio server through
`evals/framework/mcp-call.mjs --server=focus` (the bridge already supported a
`--server` flag from the framework eval work — no changes needed there) plus
`--server=framework` for the combined scenario's framework-side steps.

### `evals/focus/eval.xml` — 10 questions

Every question specifies (or compares across) a FOCUS version, is answerable
tools-only, and is independently verifiable. Each was solved live before being
written down:

1. `list_versions` — 1.0: 43 cols/9 attrs; 1.2 (latest): 57 cols/9 attrs.
2. `get_column(column: "BilledCost", version: "1.0")` — Metric, Mandatory,
   Decimal, allows_nulls: false.
3. `list_columns(version: "1.2", feature_level: "Mandatory")` — total 21.
4. `search_focus(query: "commitment discount", version: "1.0")` — total 9
   hits (5 columns + 1 attribute + 3 more columns, e.g. SkuPriceId,
   ContractedUnitPrice).
5. `search_focus(query: "currency format")` → `get_attribute(slug:
   "currency_format", ...)` — ISO 4217:2015 three-letter code requirement for
   national-currency values.
6. `get_requirements(column: "BilledCost", version: "1.2")` — the
   sum-per-InvoiceId-matches-invoice-payable-amount bullet.
7. `compare_versions()` (no `column`) — 14 added, 0 removed, 43 changed.
8. `compare_versions(column: "CommitmentDiscountQuantity")` — status added,
   1.2 only.
9. `get_kpi_mapping(capability: "rate-optimization", version: "1.2")` — 4
   KPIs (effective-savings-rate-percentage, commitment-utilization-score,
   percentage-of-commitment-based-discount-waste,
   consumption-versus-commitment).
10. `get_kpi_mapping(kpi: "effective-savings-rate-percentage", version:
    "1.0")` — ESR formula + BillingPeriodStart/BillingPeriodEnd/ListCost/
    EffectiveCost.

2 questions require `compare_versions` (7, 8) and 2 require the KPI mapping
tool (9, 10) — meets the acceptance minimum on both. All 10 calls and their
raw JSON were run and inspected directly (see commands above); values quoted
in `<expected>` are copy-verified from that output, not recalled.

### `evals/focus/combined-scenario.xml` — Rate Optimization walkthrough

One ordered scenario, both bridges, documenting the "combined value" case
from the spec's Problem section (capability → KPI → FOCUS columns per
version → calculate on sample) that doesn't exist anywhere else today:

1. framework `list_capabilities(domain: "optimize-usage-and-cost")` →
   rate-optimization is one of 5 capabilities in that domain.
2. framework `get_capability(slug: "rate-optimization", include: ["summary",
   "kpis"])` + `get_kpis(capability: "rate-optimization", featured_only:
   true)` → 4 featured KPIs.
3. focus `get_kpi_mapping(capability: "rate-optimization", version: "1.0")`
   → the SAME 4 KPI slugs come back mapped to FOCUS columns — verified this
   is the same set, not just the same count.
4. focus `get_kpi_mapping(..., version: "1.2")` + `compare_versions(column:
   "CommitmentDiscountQuantity")` → 1.2's column sets are unchanged from 1.0
   for these KPIs, but Consumption versus Commitment's caveat names a 1.2-only
   column (CommitmentDiscountQuantity, confirmed added-in-1.2 via
   compare_versions) this server's formula deliberately doesn't adopt — the
   version-aware nuance the walkthrough is meant to surface.
5. focus `calculate_kpi(kpi, version: "1.0")` for all 4 slugs over the
   official 1,000-row sample: ESR 26.552972346576816%, Commitment
   Utilization Score 0%, Waste 100%, Consumption vs Commitment 0 (ratio).
6. Marked explicitly `mode="author-annotation"` / `server="none"` (NOT part
   of the tools-only graded walkthrough): the 0%/100% pair is real — the
   official sample's ChargeCategory column has zero "Purchase" rows
   (`python3 -c "..."` over the committed
   `data/focus/samples/1.0/official/focus_sample.csv"`, 1000 rows total,
   `{Usage, Adjustment, Credit}` only, 0 `Purchase`), so both formulas'
   shared denominator is 0 and they floor/ceiling to 0%/100% — correct
   per-formula, same class of finding as T-034's noted AAI observation, not
   a bug. This fact needs the raw CSV, so it is out of scope for a fresh
   agent restricted to the two bridges; kept as an annotation so a future
   reader doesn't mistake the extreme values for a defect.

## Gates

`./scripts/agentic gates` → PASS (format, lint, typecheck, test 336/336,
designs, integrity, memory). No source changed — only new eval files plus
the `tasks start` status flip — so test count is unchanged from T-034.
Integrity gate's mixed-diff warning is pre-existing (spans the whole
in-progress feature branch vs `origin/main`, not this task's diff alone).

## Next

T-036 (packaging shim), T-037 (worker), T-038 (demo app, which can reuse this
scenario's step sequence directly) remain per the spec.
