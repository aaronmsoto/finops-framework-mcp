import type {
  TkCrossLinkTarget,
  TkEntityType,
  TkFocusTrackerItem,
} from "../../shared/tokenomics/types.js";

// Cross-server references. Target URIs are the other servers' fixed public
// contracts (src/servers/{framework,focus}/uris.ts), duplicated here on
// purpose — the three packages ship separately. Tests cross-read
// data/framework and data/focus to prove every target exists.

export const FOCUS_LINK_VERSION = "1.2";

export const target = {
  capability: (slug: string): TkCrossLinkTarget => ({
    server: "framework",
    kind: "capability",
    id: slug,
    uri: `finops://framework/capabilities/${slug}`,
  }),
  frameworkPersona: (slug: string): TkCrossLinkTarget => ({
    server: "framework",
    kind: "persona",
    id: slug,
    uri: `finops://framework/personas/${slug}`,
  }),
  kpi: (slug: string): TkCrossLinkTarget => ({
    server: "framework",
    kind: "kpi",
    id: slug,
    uri: `finops://framework/kpis/${slug}`,
  }),
  focusColumn: (id: string): TkCrossLinkTarget => ({
    server: "focus",
    kind: "column",
    id,
    uri: `focus://spec/${FOCUS_LINK_VERSION}/columns/${id.toLowerCase()}`,
  }),
  focusDraft: (id: string): TkCrossLinkTarget => ({
    server: "focus-working-draft",
    kind: "draft-identifier",
    id,
    uri: null,
  }),
};

export interface StatedLinkSpec {
  from: { type: TkEntityType; slug: string };
  document: string;
  evidence: string;
  targets: TkCrossLinkTarget[];
}

/** Hand-registered stated links. `evidence` must appear verbatim (markdown
 * markup and whitespace normalized) in the document's canonical markdown,
 * and must itself name the target — refresh fails otherwise. */
export const STATED_LINKS: StatedLinkSpec[] = [
  {
    from: { type: "document", slug: "five-layer-stack-paper" },
    document: "five-layer-stack-paper",
    evidence: "Allocation, budgeting, and anomaly detection",
    targets: [
      target.capability("allocation"),
      target.capability("budgeting"),
      target.capability("anomaly-management"),
    ],
  },
  {
    from: { type: "document", slug: "big-t-notation-paper" },
    document: "big-t-notation-paper",
    evidence:
      "anomaly detection on consumption spikes, and dashboards that make unit economics visible",
    targets: [
      target.capability("anomaly-management"),
      target.capability("unit-economics"),
    ],
  },
  {
    from: { type: "document", slug: "big-t-notation" },
    document: "big-t-notation",
    evidence: "then visibility, then optimization, then unit economics",
    targets: [target.capability("unit-economics")],
  },
  {
    from: { type: "persona", slug: "finops-practitioner" },
    document: "personas-operating-model",
    evidence: "Anomaly detection shifts from spend spikes to complexity shifts",
    targets: [target.capability("anomaly-management")],
  },
  {
    from: { type: "persona", slug: "finops-practitioner" },
    document: "personas-operating-model",
    evidence: "Cost attribution and budgets | FinOps Practitioner",
    targets: [target.capability("allocation"), target.capability("budgeting")],
  },
  {
    from: { type: "persona", slug: "finops-practitioner" },
    document: "personas-operating-model",
    evidence: "Forecasting and variance | FinOps Practitioner",
    targets: [target.capability("forecasting")],
  },
  {
    from: { type: "persona", slug: "finance" },
    document: "personas-operating-model",
    evidence: "forecasting for compounding demand",
    targets: [target.capability("forecasting")],
  },
  {
    from: { type: "metric", slug: "cache-hit-rate" },
    document: "focus-1-5-for-ai",
    evidence: "cache hit rate for token-metered SKUs",
    targets: [
      target.focusDraft("TokenCacheAction"),
      target.focusColumn("SkuPriceDetails"),
    ],
  },
];

/** FOCUS 1.2 column ids (data/focus/1.2/columns.json) are resolvable URIs;
 * any other backticked identifier on the tracker page is a working-draft
 * name with no published column yet. */
export function trackerLinkTargets(
  item: TkFocusTrackerItem,
  focusColumnIds: Set<string>,
): { id: string; target: TkCrossLinkTarget }[] {
  return item.identifiers.map((id) => ({
    id,
    target: focusColumnIds.has(id)
      ? target.focusColumn(id)
      : target.focusDraft(id),
  }));
}

export interface CrosswalkSpec {
  from: { type: TkEntityType; slug: string };
  target: TkCrossLinkTarget;
  rationale: string;
}

/** Curated, UNOFFICIAL mappings (served only with FINOPS_MCP_EXPERIMENTAL=1).
 * No Tokenomics Foundation page states these; each carries its reasoning. */
export const CROSSWALK: CrosswalkSpec[] = [
  {
    from: { type: "metric", slug: "cache-hit-rate" },
    target: target.kpi("cache-hit-rate"),
    rationale:
      "Same name. The framework KPI describes the percentage of tokens used from cache without a formula; the Tokenomics Foundation formula supplies the denominator (cache read + cache write + uncached input).",
  },
  {
    from: { type: "metric", slug: "cache-hit-rate" },
    target: target.capability("usage-optimization"),
    rationale:
      "Raising cache hit rate removes recomputed input tokens, which is consumption reduction rather than a rate change.",
  },
  {
    from: { type: "metric", slug: "cache-cost-efficiency" },
    target: target.capability("rate-optimization"),
    rationale:
      "Cache cost efficiency measures the effective price paid for prompt tokens against the base input price, the per-unit-price lens of Rate Optimization.",
  },
  {
    from: { type: "metric", slug: "cost-per-token" },
    target: target.capability("unit-economics"),
    rationale: "A per-unit cost metric of the kind Unit Economics tracks.",
  },
  {
    from: { type: "metric", slug: "ai-unit-economics" },
    target: target.capability("unit-economics"),
    rationale:
      "TCA over realized value is an AI-specific unit economics ratio.",
  },
  {
    from: { type: "metric", slug: "cost-per-token" },
    target: target.kpi("token-consumption-metrics"),
    rationale:
      "Both express token-based model cost; the framework KPI is usage-side, the Tokenomics metric production-side.",
  },
  {
    from: { type: "lever", slug: "l5-budgets" },
    target: target.capability("budgeting"),
    rationale:
      "Per-team and per-tenant token budgets at the routing layer implement budgets as runtime controls.",
  },
  {
    from: { type: "lever", slug: "l2-place-by-region" },
    target: target.capability("architecting-workload-placement"),
    rationale: "Placing capacity by region is a workload placement decision.",
  },
  {
    from: { type: "lever", slug: "l4-right-size-the-model" },
    target: target.capability("usage-optimization"),
    rationale:
      "Right-sizing the model is the AI analogue of rightsizing resources.",
  },
  {
    from: { type: "lever", slug: "bigt-abstraction-transparency" },
    target: target.capability("licensing-saas"),
    rationale:
      "The lever targets credit bundles and seat licenses that hide token economics.",
  },
  {
    from: {
      type: "lever",
      slug: "bigt-workload-classification-and-governance",
    },
    target: target.capability("governance-policy-risk"),
    rationale:
      "Classification plus governance of high-consumption workloads is policy work.",
  },
  ...(
    [
      ["engineering", "engineering"],
      ["finops-practitioner", "finops-practitioner"],
      ["finance", "finance"],
      ["product", "product"],
      ["procurement", "procurement"],
      ["leadership", "leadership"],
      ["security-and-compliance", "security"],
      ["sustainability", "sustainability"],
      ["itam-itfm", "itam"],
      ["itam-itfm", "itfm"],
    ] as const
  ).map(([from, to]) => ({
    from: { type: "persona" as const, slug: from },
    target: target.frameworkPersona(to),
    rationale:
      "Name correspondence only. The Tokenomics personas page says reconciling its set with the FinOps Framework persona catalog 'is a deliberate next step, not attempted here'.",
  })),
];
