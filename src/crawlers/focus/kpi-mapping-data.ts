import type { KpiMapping } from "../../shared/focus/types.js";

// Curated, hand-authored derivation (spec "KPI->FOCUS mapping methodology"):
// no official FinOps Foundation mapping from framework KPIs to FOCUS columns
// exists (verified against finops.org and the FOCUS spec repo). Every entry
// here reads the KPI's published formula (data/framework/content/kpis.json)
// and expresses the minimal FOCUS column set + a FOCUS-terms translation
// that reproduces it. `kpi_slug` and `columns_by_version` are cross-
// validated against data/framework and each FOCUS version's columns.json —
// see src/shared/focus/kpi-mapping.test.ts and loadFocusStore's crossValidate.
// Static, hand-authored data (not derived from crawled pages) is committed
// here rather than fetched, so `focus/cli.js` output stays byte-identical
// run to run regardless of network state.

const METHODOLOGY =
  "No official FinOps Foundation or FOCUS project mapping from framework " +
  "KPIs to FOCUS columns exists. Each entry below is this project's own " +
  "inference: we read the KPI's published formula in " +
  "data/framework/content/kpis.json and identify the minimal set of FOCUS " +
  "columns whose aggregation reproduces it, expressed as a FOCUS-terms " +
  "formula (verbatim column ids, SQL-like WHERE/GROUP BY pseudocode). " +
  "Formulas that need a value FOCUS does not carry — a forecasted or " +
  "budgeted figure, for instance — are marked with a caveat naming the " +
  "external input; FOCUS supplies only the actual/effective-spend side of " +
  "those ratios. Every record is unofficial: it is not endorsed by, or " +
  "reviewed with, the FinOps Foundation or the FOCUS project, and must not " +
  "be presented as normative guidance. Re-check a mapping against the " +
  "source KPI and column definitions (get_column, get_requirements) before " +
  "relying on it for production reporting.";

// All columns used below are present, under the same ColumnId, in both
// pinned versions (1.0: 43 columns, 1.2: 57 columns) — see
// kpi-mapping.test.ts. `columns_by_version` still lists both explicitly, so
// a future version whose column set actually diverges here is a visible
// per-version edit, not an implicit assumption.
const V = ["1.0", "1.2"];
function perVersion(columns: string[]): Record<string, string[]> {
  return Object.fromEntries(V.map((v) => [v, columns]));
}

export const KPI_MAPPING: KpiMapping = {
  official: false,
  methodology: METHODOLOGY,
  kpis: [
    {
      kpi_slug: "effective-savings-rate-percentage",
      kpi_title: "Effective Savings Rate Percentage",
      official: false,
      category: "effective_savings_rate",
      related_capability_slugs: ["rate-optimization"],
      focus_formula:
        "ESR % = ((SUM(ListCost) − SUM(EffectiveCost)) / SUM(ListCost)) × " +
        "100, aggregated over the BillingPeriodStart/BillingPeriodEnd in scope.",
      columns_by_version: perVersion([
        "BillingPeriodStart",
        "BillingPeriodEnd",
        "ListCost",
        "EffectiveCost",
      ]),
      caveat: null,
    },
    {
      kpi_slug: "commitment-utilization-score",
      kpi_title: "Commitment Utilization Score",
      official: false,
      category: "commitment_discounts",
      related_capability_slugs: ["rate-optimization"],
      focus_formula:
        "Commitment Utilization Score = (SUM(EffectiveCost) WHERE " +
        "ChargeCategory = 'Usage' AND CommitmentDiscountId IS NOT NULL) / " +
        "(SUM(ContractedCost) WHERE ChargeCategory = 'Purchase' AND " +
        "CommitmentDiscountId IS NOT NULL) × 100.",
      columns_by_version: perVersion([
        "ChargeCategory",
        "CommitmentDiscountId",
        "EffectiveCost",
        "ContractedCost",
      ]),
      caveat: null,
    },
    {
      kpi_slug:
        "percent-of-compute-spend-covered-by-commitment-based-discounts",
      kpi_title: "Percent of Compute Spend Covered by Commitment Discounts",
      official: false,
      category: "commitment_discounts",
      related_capability_slugs: [],
      focus_formula:
        "% Covered = (SUM(EffectiveCost) WHERE ServiceCategory = 'Compute' " +
        "AND CommitmentDiscountId IS NOT NULL) / (SUM(EffectiveCost) WHERE " +
        "ServiceCategory = 'Compute') × 100.",
      columns_by_version: perVersion([
        "ServiceCategory",
        "CommitmentDiscountId",
        "EffectiveCost",
      ]),
      caveat: null,
    },
    {
      kpi_slug: "percentage-of-commitment-based-discount-waste",
      kpi_title: "Percentage of Commitment Discount Waste",
      official: false,
      category: "commitment_discounts",
      related_capability_slugs: ["rate-optimization"],
      focus_formula:
        "% Waste = (1 − (SUM(EffectiveCost) WHERE ChargeCategory = 'Usage' " +
        "AND CommitmentDiscountId IS NOT NULL) / (SUM(ContractedCost) WHERE " +
        "ChargeCategory = 'Purchase' AND CommitmentDiscountId IS NOT NULL)) " +
        "× 100 — the complement of Commitment Utilization Score.",
      columns_by_version: perVersion([
        "ChargeCategory",
        "CommitmentDiscountId",
        "EffectiveCost",
        "ContractedCost",
      ]),
      caveat: null,
    },
    {
      kpi_slug: "consumption-versus-commitment",
      kpi_title: "Consumption versus Commitment",
      official: false,
      category: "commitment_discounts",
      related_capability_slugs: [
        "data-ingestion",
        "forecasting",
        "licensing-saas",
        "rate-optimization",
        "reporting-analytics",
      ],
      focus_formula:
        "Consumption / Commitment = (SUM(EffectiveCost) WHERE " +
        "ChargeCategory = 'Usage' AND CommitmentDiscountId IS NOT NULL) / " +
        "(SUM(ContractedCost) WHERE ChargeCategory = 'Purchase' AND " +
        "CommitmentDiscountId IS NOT NULL) — a spend ratio, since FOCUS 1.0 " +
        "has no dedicated committed-quantity column.",
      columns_by_version: perVersion([
        "ChargeCategory",
        "CommitmentDiscountId",
        "EffectiveCost",
        "ContractedCost",
      ]),
      caveat:
        "Uses spend as a proxy for committed/consumed units; a quantity-" +
        "based ratio would need CommitmentDiscountQuantity, which FOCUS " +
        "only introduced in 1.2.",
    },
    {
      kpi_slug: "forecast-accuracy-rate-spend",
      kpi_title: "Forecast Accuracy Rate (Spend)",
      official: false,
      category: "forecast_accuracy",
      related_capability_slugs: ["forecasting"],
      focus_formula:
        "Forecast Accuracy % = ((Forecasted Spend − SUM(BilledCost) over " +
        "the BillingPeriodStart/BillingPeriodEnd in scope) / Forecasted " +
        "Spend) × 100.",
      columns_by_version: perVersion([
        "BilledCost",
        "BillingPeriodStart",
        "BillingPeriodEnd",
      ]),
      caveat:
        "FOCUS supplies only the Actual Spend side (SUM(BilledCost)); " +
        "Forecasted Spend is an external input, not a FOCUS column.",
    },
    {
      kpi_slug: "forecast-accuracy-rate-usage",
      kpi_title: "Forecast Accuracy Rate (Usage)",
      official: false,
      category: "forecast_accuracy",
      related_capability_slugs: ["forecasting", "sustainability"],
      focus_formula:
        "Forecast Accuracy % = ((Forecasted Resource Utilization − " +
        "SUM(ConsumedQuantity) WHERE ServiceName/ServiceCategory/SkuId = " +
        "target) / Forecasted Resource Utilization) × 100.",
      columns_by_version: perVersion([
        "ConsumedQuantity",
        "ConsumedUnit",
        "ServiceName",
        "ServiceCategory",
        "SkuId",
      ]),
      caveat:
        "FOCUS supplies only Actual Resource Utilization (SUM(ConsumedQuantity), " +
        "grouped by the target ServiceName/ServiceCategory/SkuId); Forecasted " +
        "Resource Utilization is external.",
    },
    {
      kpi_slug: "cost-per-gigabytes-stored",
      kpi_title: "Cost per Gigabytes Stored",
      official: false,
      category: "unit_economics",
      related_capability_slugs: ["unit-economics"],
      focus_formula:
        "Cost per GB = SUM(EffectiveCost) WHERE ServiceCategory = 'Storage' " +
        "/ SUM(ConsumedQuantity) WHERE ServiceCategory = 'Storage' AND " +
        "ConsumedUnit = 'GB'.",
      columns_by_version: perVersion([
        "ServiceCategory",
        "EffectiveCost",
        "ConsumedQuantity",
        "ConsumedUnit",
      ]),
      caveat: null,
    },
    {
      kpi_slug: "hourly-cost-per-cpu-core",
      kpi_title: "Hourly Cost per CPU Core",
      official: false,
      category: "unit_economics",
      related_capability_slugs: [],
      focus_formula:
        "Hourly Cost per Core = SUM(EffectiveCost) WHERE ServiceCategory = " +
        "'Compute' / SUM(ConsumedQuantity) WHERE ServiceCategory = 'Compute' " +
        "AND ConsumedUnit denotes core-hours (e.g. 'Core Hours', 'vCPU Hours').",
      columns_by_version: perVersion([
        "ServiceCategory",
        "EffectiveCost",
        "ConsumedQuantity",
        "ConsumedUnit",
      ]),
      caveat:
        "ConsumedUnit values are provider-defined free text; the core-hour " +
        "unit must be identified case by case.",
    },
    {
      kpi_slug: "effective-average-compute-cost-per-core",
      kpi_title: "Effective Average Compute Cost per Core",
      official: false,
      category: "unit_economics",
      related_capability_slugs: [],
      focus_formula:
        "Effective Avg Cost per Core = SUM(EffectiveCost) WHERE " +
        "ServiceCategory = 'Compute' / SUM(ConsumedQuantity) WHERE " +
        "ServiceCategory = 'Compute' AND ConsumedUnit denotes a core count.",
      columns_by_version: perVersion([
        "ServiceCategory",
        "EffectiveCost",
        "ConsumedQuantity",
        "ConsumedUnit",
      ]),
      caveat:
        "ConsumedUnit values are provider-defined free text; the core-count " +
        "unit must be identified case by case.",
    },
    {
      kpi_slug: "saas-unit-cost",
      kpi_title: "SaaS Unit Cost",
      official: false,
      category: "unit_economics",
      related_capability_slugs: [
        "intersecting-disciplines",
        "licensing-saas",
        "reporting-analytics",
        "usage-optimization",
      ],
      focus_formula:
        "SaaS Unit Cost = SUM(BilledCost) WHERE ServiceCategory = 'SaaS' / " +
        "SUM(ConsumedQuantity) WHERE ServiceCategory = 'SaaS' — the " +
        "consumption unit (seats, requests, GB, ...) is whatever ConsumedUnit " +
        "reports for that SKU.",
      columns_by_version: perVersion([
        "ServiceCategory",
        "BilledCost",
        "ConsumedQuantity",
        "ConsumedUnit",
      ]),
      caveat: null,
    },
    {
      kpi_slug: "cost-per-api-call",
      kpi_title: "Cost per API Call",
      official: false,
      category: "unit_economics",
      related_capability_slugs: ["reporting-analytics", "unit-economics"],
      focus_formula:
        "Cost per API Call = SUM(EffectiveCost) WHERE ChargeCategory = " +
        "'Usage' AND ConsumedUnit denotes API calls (e.g. 'Requests', 'API " +
        "Calls') / SUM(ConsumedQuantity) under the same filter.",
      columns_by_version: perVersion([
        "ChargeCategory",
        "EffectiveCost",
        "ConsumedQuantity",
        "ConsumedUnit",
      ]),
      caveat: null,
    },
    {
      kpi_slug: "total-cost-of-ownership-per-workload",
      kpi_title: "Total Cost of Ownership per Workload",
      official: false,
      category: "unit_economics",
      related_capability_slugs: [],
      focus_formula:
        "TCO per Workload = SUM(BilledCost) GROUP BY the Tags key " +
        "identifying the workload (or the ResourceId set that composes it) " +
        "/ count of distinct ResourceId in that group.",
      columns_by_version: perVersion(["BilledCost", "Tags", "ResourceId"]),
      caveat:
        "FOCUS has no 'workload' primitive; the grouping key is whatever " +
        "tagging convention the organization uses to identify one.",
    },
    {
      kpi_slug: "allocation-accuracy-index-aai",
      kpi_title: "Allocation Accuracy Index (AAI)",
      official: false,
      category: "allocation",
      related_capability_slugs: [
        "allocation",
        "reporting-analytics",
        "usage-optimization",
      ],
      focus_formula:
        "AAI % = (SUM(BilledCost) WHERE SubAccountId IS NOT NULL AND Tags " +
        "IS NOT NULL) / SUM(BilledCost) × 100.",
      columns_by_version: perVersion(["BilledCost", "SubAccountId", "Tags"]),
      caveat: null,
    },
    {
      kpi_slug:
        "percentage-of-costs-associated-with-unallocated-csp-cloud-resources",
      kpi_title:
        "Percentage of Costs Associated with Unallocated CSP Cloud Resources",
      official: false,
      category: "allocation",
      related_capability_slugs: ["allocation"],
      focus_formula:
        "% Unallocated = (SUM(BilledCost) WHERE SubAccountId IS NULL) / " +
        "SUM(BilledCost) × 100.",
      columns_by_version: perVersion(["BilledCost", "SubAccountId"]),
      caveat: null,
    },
    {
      kpi_slug:
        "percentage-of-costs-associated-with-untagged-csp-cloud-resources",
      kpi_title:
        "Percentage of Costs Associated with Untagged CSP Cloud Resources",
      official: false,
      category: "allocation",
      related_capability_slugs: [],
      focus_formula:
        "% Untagged = (SUM(BilledCost) WHERE Tags IS NULL) / SUM(BilledCost) × 100.",
      columns_by_version: perVersion(["BilledCost", "Tags"]),
      caveat: null,
    },
    {
      kpi_slug: "percentage-of-unallocated-shared-csp-cloud-cost",
      kpi_title: "Percentage of Unallocated Shared CSP Cloud Cost",
      official: false,
      category: "allocation",
      related_capability_slugs: [],
      focus_formula:
        "% Unallocated Shared Cost = (SUM(BilledCost) WHERE ChargeCategory " +
        "= 'Usage' AND SubAccountId IS NULL AND ResourceId IS NULL) / " +
        "SUM(BilledCost) × 100 — approximates 'shared' spend as usage cost " +
        "lacking any sub-account or resource attribution.",
      columns_by_version: perVersion([
        "BilledCost",
        "ChargeCategory",
        "SubAccountId",
        "ResourceId",
      ]),
      caveat:
        "FOCUS has no explicit 'shared cost' flag; this approximates it as " +
        "unattributed usage spend.",
    },
    {
      kpi_slug: "percentage-variance-of-budgeted-vs-actual-csp-cloud-spend",
      kpi_title: "Percentage Variance of Budgeted vs. Actual CSP Cloud Spend",
      official: false,
      category: "variance",
      related_capability_slugs: [],
      focus_formula:
        "% Variance = ((Budgeted Spend − SUM(BilledCost) over the " +
        "BillingPeriodStart/BillingPeriodEnd in scope) / Budgeted Spend) × 100.",
      columns_by_version: perVersion([
        "BilledCost",
        "BillingPeriodStart",
        "BillingPeriodEnd",
      ]),
      caveat:
        "FOCUS supplies only Actual Spend (SUM(BilledCost)); Budgeted Spend " +
        "is external and not a FOCUS column.",
    },
  ],
};
