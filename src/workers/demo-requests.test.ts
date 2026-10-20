// Validates that the demo app's own JSON-RPC request builders
// (demo/requests.js) produce request bodies the worker fetch handler
// (T-037, src/workers/app.ts) actually accepts and answers correctly — the
// full Rate Optimization walkthrough (T-038, spec "Packaging / worker /
// demo") and the AI caching walkthrough, end to end, using the exact same request-building code the
// browser demo imports. Uses the same fixtures as app.test.ts
// (loadArtifact/loadFocusStore) — this is a Node test process, not the
// worker bundle, so node:fs here is fine (fs-boundary.test.ts checks the
// actual worker entry point separately).
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadArtifact, loadFocusStore } from "../shared/index.js";
import { loadTokenomicsArtifact } from "../shared/tokenomics/artifact.js";
import { createFetchHandler, type FetchHandler } from "./app.js";
import {
  CAPABILITY_SLUG,
  CALCULATE_VERSION,
  COMPARE_COLUMN,
  STEPS,
  AI_CACHING_STEPS,
  FOCUS_CACHE_COLUMN,
  WALKTHROUGHS,
  cacheMetricsRequest,
  calculateKpiRequest,
  type JsonRpcRequest,
} from "../../demo/requests.js";

const FRAMEWORK_DIR = join(import.meta.dirname, "../../data/framework");
const FOCUS_DIR = join(import.meta.dirname, "../../data/focus");
const TOKENOMICS_DIR = join(import.meta.dirname, "../../data/tokenomics");

let handler: FetchHandler;

beforeAll(() => {
  const frameworkArtifact = loadArtifact(FRAMEWORK_DIR);
  const focusStore = loadFocusStore(FOCUS_DIR);
  const tokenomicsArtifact = loadTokenomicsArtifact(TOKENOMICS_DIR);
  handler = createFetchHandler({
    frameworkArtifact,
    focusStore,
    tokenomicsArtifact,
    allowedOrigins: [],
  });
});

interface ToolCallResult {
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  content?: { type: string; text?: string }[];
}

async function call(
  server: "framework" | "focus" | "tokenomics",
  request: JsonRpcRequest,
): Promise<ToolCallResult> {
  const res = await handler(
    new Request(`https://worker.example/mcp/${server}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(request),
    }),
  );
  expect(res.status).toBe(200);
  const json = (await res.json()) as { result: ToolCallResult };
  return json.result;
}

describe("demo requests against the worker fetch handler", () => {
  it("names all five static steps' servers as framework or focus", () => {
    for (const step of STEPS) {
      expect(["framework", "focus"]).toContain(step.server);
    }
  });

  it("runs the full Rate Optimization walkthrough using the demo's own request bodies", async () => {
    // Step 1: list_capabilities(domain: "optimize-usage-and-cost")
    const step1 = STEPS[0]!;
    expect(step1.key).toBe("list-capabilities");
    const listResult = await call(
      step1.server as "framework",
      step1.buildRequest(1),
    );
    expect(listResult.isError).toBeFalsy();
    const capabilities = listResult.structuredContent!.capabilities as {
      slug: string;
      domain: string;
      title: string;
    }[];
    const rateOptimization = capabilities.find(
      (c) => c.slug === CAPABILITY_SLUG,
    );
    expect(rateOptimization).toBeDefined();
    expect(rateOptimization?.title).toBe("Rate Optimization");
    expect(rateOptimization?.domain).toBe("optimize-usage-and-cost");

    // Step 2: get_capability(capability, include: [summary, kpis])
    const step2 = STEPS[1]!;
    expect(step2.key).toBe("get-capability");
    const capResult = await call(
      step2.server as "framework",
      step2.buildRequest(2),
    );
    expect(capResult.isError).toBeFalsy();
    const sections = capResult.structuredContent!.sections as {
      summary: string;
      featured_kpis: { slug: string; title: string; has_formula: boolean }[];
    };
    expect(typeof sections.summary).toBe("string");
    expect(sections.summary.length).toBeGreaterThan(0);
    const featuredKpis = sections.featured_kpis;
    expect(featuredKpis.length).toBe(4);
    const featuredSlugs = new Set(featuredKpis.map((k) => k.slug));
    expect(featuredSlugs).toEqual(
      new Set([
        "effective-savings-rate-percentage",
        "commitment-utilization-score",
        "percentage-of-commitment-based-discount-waste",
        "consumption-versus-commitment",
      ]),
    );

    // Steps 3-4: get_kpi_mapping(capability, version) for 1.0 and 1.2 — same
    // KPI slugs come back on the focus side of the bridge, for both versions.
    for (const step of [STEPS[2]!, STEPS[3]!]) {
      const result = await call(step.server as "focus", step.buildRequest(3));
      expect(result.isError).toBeFalsy();
      const kpis = result.structuredContent!.kpis as {
        kpi_slug: string;
        official: boolean;
        columns: string[];
      }[];
      expect(result.structuredContent!.official).toBe(false);
      expect(new Set(kpis.map((k) => k.kpi_slug))).toEqual(featuredSlugs);
      for (const kpi of kpis) {
        expect(kpi.official).toBe(false);
        expect(kpi.columns.length).toBeGreaterThan(0);
      }
    }

    // Step 5: compare_versions(column: "CommitmentDiscountQuantity") — added in 1.2.
    const step5 = STEPS[4]!;
    expect(step5.key).toBe("compare-versions");
    const compareResult = await call(
      step5.server as "focus",
      step5.buildRequest(5),
    );
    expect(compareResult.isError).toBeFalsy();
    expect(compareResult.structuredContent!.column).toBe(COMPARE_COLUMN);
    expect(compareResult.structuredContent!.status).toBe("added");

    // Step 6 (dynamic): calculate_kpi for each featured KPI, over the
    // bundled FOCUS 1.0 sample — built from the KPI list step 2 returned,
    // not hardcoded, same as demo/app.js does.
    // The official FOCUS 1.0 sample has zero ChargeCategory="Purchase" rows,
    // so the three commitment KPIs' shared denominator is 0 — calculate_kpi
    // reports that as not-computable (guidance error) rather than fabricating
    // a 0%/100%/0 answer. ESR's denominator (total ListCost) is not zero, so
    // it still returns a real number.
    let id = 6;
    const values: Record<string, number> = {};
    const notComputable: Record<string, boolean> = {};
    for (const kpi of featuredKpis) {
      const request = calculateKpiRequest(id++, kpi.slug, CALCULATE_VERSION);
      const result = await call("focus", request);
      if (result.isError) {
        notComputable[kpi.slug] = true;
        const text = (result.content ?? [])
          .map((c) => c.text)
          .filter(Boolean)
          .join("\n");
        expect(text).toMatch(/not computable/);
        expect(text).toMatch(/version="1\.2"/);
        continue;
      }
      const structured = result.structuredContent!;
      expect(structured.official).toBe(false);
      expect(structured.kpi_slug).toBe(kpi.slug);
      expect(typeof structured.value).toBe("number");
      values[kpi.slug] = structured.value as number;
    }
    expect(values["effective-savings-rate-percentage"]).toBeCloseTo(
      26.552972346576816,
      9,
    );
    expect(notComputable["commitment-utilization-score"]).toBe(true);
    expect(notComputable["percentage-of-commitment-based-discount-waste"]).toBe(
      true,
    );
    expect(notComputable["consumption-versus-commitment"]).toBe(true);
  });

  it("names every walkthrough step's server as one the worker routes", () => {
    for (const walkthrough of Object.values(WALKTHROUGHS)) {
      for (const step of walkthrough.steps) {
        expect(walkthrough.servers).toContain(step.server);
      }
    }
  });

  it("runs the full AI caching walkthrough across all three servers", async () => {
    const results: Record<string, Record<string, unknown>> = {};
    let id = 1;
    for (const step of AI_CACHING_STEPS) {
      const result = await call(step.server, step.buildRequest(id++));
      expect(result.isError, step.key).toBeFalsy();
      results[step.key] = result.structuredContent!;
    }

    // Default workload ("stable prefix"): 80% hit rate, ~71% cheaper.
    const metrics = results["tokenomics-calculate"]!;
    expect(metrics.cache_hit_rate).toBeCloseTo(0.8, 6);
    expect(metrics.cache_cost_efficiency).toBeCloseTo(0.7075, 4);
    expect(metrics.actual_prompt_cost).toBeCloseTo(0.8775, 4);
    expect(metrics.uncached_equivalent_cost).toBeCloseTo(3, 6);

    // The crosslinks step hands off a focus:// URI for the column step 6 reads.
    expect(JSON.stringify(results["tokenomics-crosslinks"])).toContain(
      FOCUS_CACHE_COLUMN,
    );
    expect(JSON.stringify(results["focus-column"])).toContain(
      FOCUS_CACHE_COLUMN,
    );
  });

  it("shows a negative cache cost efficiency when the prefix keeps changing", async () => {
    const result = await call(
      "tokenomics",
      cacheMetricsRequest(1, {
        cache_read_tokens: 100000,
        cache_write_tokens: 400000,
        uncached_input_tokens: 500000,
        base_input_price_per_mtok: 3,
        cache_read_multiplier: 0.1,
        cache_write_multiplier: 1.25,
      }),
    );
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent!.cache_hit_rate).toBeCloseTo(0.1, 6);
    expect(result.structuredContent!.cache_cost_efficiency).toBeLessThan(0);
  });
});
