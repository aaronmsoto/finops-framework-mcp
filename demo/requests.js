// JSON-RPC request-body builders for the Rate Optimization walkthrough
// (T-038, .agents/specs/focus-mcp-v1.md "Packaging / worker / demo").
// Mirrors evals/focus/combined-scenario.xml steps 1-5, whose header notes
// it "doubles as the demo app's (T-038) source script." Pure data and pure
// functions only — no fetch, no DOM — so demo/app.js (browser) and
// src/workers/demo-requests.test.ts (Node, against the worker fetch
// handler directly) build and exercise the exact same request bodies.

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
    slug: CAPABILITY_SLUG,
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
