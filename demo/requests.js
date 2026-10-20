// JSON-RPC request-body builders for the demo's two walkthroughs. Pure data
// and pure functions only — no fetch, no DOM — so demo/app.js (browser) and
// src/workers/demo-requests.test.ts (Node, against the worker fetch handler
// directly) build and exercise the exact same request bodies.
//
// 1. Rate Optimization (T-038, .agents/specs/focus-mcp-v1.md "Packaging /
//    worker / demo"): framework + FOCUS. Mirrors
//    evals/focus/combined-scenario.xml steps 1-5, whose header notes it
//    "doubles as the demo app's (T-038) source script."
// 2. AI prompt caching: all three servers, mirroring the usage guide's
//    docs/guide/example-ai-caching.html. Step 3 is built from the token
//    counts the visitor types in.

export const CAPABILITY_SLUG = "rate-optimization";
export const DOMAIN_SLUG = "optimize-usage-and-cost";
export const COMPARE_COLUMN = "CommitmentDiscountQuantity";
export const FOCUS_VERSIONS = ["1.0", "1.2"];
export const CALCULATE_VERSION = "1.0";

function toolCallRequest(id, name, args) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  };
}

export function listCapabilitiesRequest(id) {
  return toolCallRequest(id, "list_capabilities", { domain: DOMAIN_SLUG });
}

export function getCapabilityRequest(id) {
  return toolCallRequest(id, "get_capability", {
    capability: CAPABILITY_SLUG,
    include: ["summary", "kpis"],
  });
}

export function kpiMappingRequest(id, version) {
  return toolCallRequest(id, "get_kpi_mapping", {
    capability: CAPABILITY_SLUG,
    version,
  });
}

export function compareVersionsRequest(id) {
  return toolCallRequest(id, "compare_versions", { column: COMPARE_COLUMN });
}

export function calculateKpiRequest(id, kpiSlug, version = CALCULATE_VERSION) {
  return toolCallRequest(id, "calculate_kpi", { kpi: kpiSlug, version });
}

// Static steps 1-5 of the walkthrough (server-fixed, request shape known
// ahead of time). Step 6 — one calculate_kpi call per featured KPI — is
// built at run time from step 2's result (see demo/app.js and the test),
// since the KPI list itself is the thing being discovered.
export const STEPS = [
  {
    key: "list-capabilities",
    server: "framework",
    title: "1. Find the Rate Optimization capability",
    goal: 'Confirm "Rate Optimization" is a capability in the Optimize Usage & Cost domain.',
    buildRequest: listCapabilitiesRequest,
  },
  {
    key: "get-capability",
    server: "framework",
    title: "2. Get its summary and featured KPIs",
    goal: "Read the official summary and the capability's featured KPIs.",
    buildRequest: getCapabilityRequest,
  },
  {
    key: "kpi-mapping-1.0",
    server: "focus",
    title: "3. Cross the bridge: FOCUS 1.0 columns for those KPIs",
    goal: "Ask the focus server which FOCUS 1.0 columns compute the same framework KPIs (UNOFFICIAL mapping).",
    buildRequest: (id) => kpiMappingRequest(id, "1.0"),
  },
  {
    key: "kpi-mapping-1.2",
    server: "focus",
    title: "4. Same KPIs against FOCUS 1.2",
    goal: "Check whether moving to FOCUS 1.2 changes which columns are needed.",
    buildRequest: (id) => kpiMappingRequest(id, "1.2"),
  },
  {
    key: "compare-versions",
    server: "focus",
    title: "5. Did 1.2 add a dedicated column?",
    goal: `See whether ${COMPARE_COLUMN} is new in FOCUS 1.2, via the version diff.`,
    buildRequest: compareVersionsRequest,
  },
];

// ---------------------------------------------------------------------------
// Walkthrough 2: is prompt caching paying off? (framework + tokenomics + FOCUS)

export const CACHE_KPI_SLUG = "cache-hit-rate";
export const CACHE_LEVER_SLUG = "l3-prefix-kv-and-semantic-cache";
export const FOCUS_CACHE_CARD = "fr-2099";
export const FOCUS_CACHE_COLUMN = "SkuPriceDetails";

/** Workload A from the usage guide: a stable prompt prefix. Rates match the
 * provider snapshot the tokenomics server serves (write 1.25×, read 0.1×). */
export const DEFAULT_CACHE_WORKLOAD = {
  cache_read_tokens: 800000,
  cache_write_tokens: 50000,
  uncached_input_tokens: 150000,
  base_input_price_per_mtok: 3,
  cache_read_multiplier: 0.1,
  cache_write_multiplier: 1.25,
};

export function frameworkCacheKpiRequest(id) {
  return toolCallRequest(id, "get_kpis", { slug: CACHE_KPI_SLUG });
}

export function cacheMetricRequest(id) {
  return toolCallRequest(id, "get_metric", { metric: CACHE_KPI_SLUG });
}

export function cacheMetricsRequest(id, workload = DEFAULT_CACHE_WORKLOAD) {
  return toolCallRequest(id, "calculate_cache_metrics", { ...workload });
}

export function cacheLeverRequest(id) {
  return toolCallRequest(id, "get_lever", { lever: CACHE_LEVER_SLUG });
}

export function cacheCrosslinksRequest(id) {
  return toolCallRequest(id, "get_crosslinks", {
    entity_type: "focus-item",
    slug: FOCUS_CACHE_CARD,
  });
}

export function focusCacheColumnRequest(id) {
  return toolCallRequest(id, "get_column", {
    column: FOCUS_CACHE_COLUMN,
    version: "1.2",
  });
}

export const AI_CACHING_STEPS = [
  {
    key: "framework-kpi",
    server: "framework",
    title: "1. The FinOps Framework names the KPI",
    goal: "Read the Foundation's Cache Hit Rate KPI. It says what to watch, but carries no formula.",
    buildRequest: frameworkCacheKpiRequest,
  },
  {
    key: "tokenomics-metric",
    server: "tokenomics",
    title: "2. Tokenomics supplies the published formula",
    goal: "Get the cache explainer's formula and its 'what good looks like' target.",
    buildRequest: cacheMetricRequest,
  },
  {
    key: "tokenomics-calculate",
    server: "tokenomics",
    title: "3. Run the numbers on your workload",
    goal: "Apply the published formulas to the token counts above: is caching saving money?",
    buildRequest: cacheMetricsRequest,
  },
  {
    key: "tokenomics-lever",
    server: "tokenomics",
    title: "4. Find the lever",
    goal: "Caching is the primary lever at L3, the inference stack.",
    buildRequest: cacheLeverRequest,
  },
  {
    key: "tokenomics-crosslinks",
    server: "tokenomics",
    title: "5. Hand off to FOCUS",
    goal: "Ask which FOCUS columns carry cached-token data. Each link is backed by a quote from the Foundation page.",
    buildRequest: cacheCrosslinksRequest,
  },
  {
    key: "focus-column",
    server: "focus",
    title: "6. Read the column in FOCUS 1.2",
    goal: "Follow the handed-off focus:// URI: SkuPriceDetails is where FOCUS 1.5 adds TokenCacheAction.",
    buildRequest: focusCacheColumnRequest,
  },
];

export const WALKTHROUGHS = {
  "rate-optimization": {
    title: "Rate Optimization",
    servers: ["framework", "focus"],
    steps: STEPS,
  },
  "ai-caching": {
    title: "Is prompt caching paying off?",
    servers: ["framework", "tokenomics", "focus"],
    steps: AI_CACHING_STEPS,
  },
};
