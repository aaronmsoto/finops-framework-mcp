import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadFocusStore } from "../../shared/index.js";
import type { FocusStore } from "../../shared/focus/artifact.js";
import { createServer } from "./server.js";

const FOCUS_DIR = join(import.meta.dirname, "../../../data/focus");

let client: Client;
let store: FocusStore;

beforeAll(async () => {
  store = loadFocusStore(FOCUS_DIR);
  const server = createServer(store);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
});

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name, arguments: args });
  return res as {
    content: { type: string; text?: string; uri?: string }[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };
}

describe("tools", () => {
  it("list_versions returns both pinned versions with latest flagged", async () => {
    const res = await call("list_versions");
    expect(res.isError).toBeFalsy();
    const versions = res.structuredContent?.versions as {
      spec_version: string;
      is_latest: boolean;
    }[];
    expect(versions.map((v) => v.spec_version).sort()).toEqual(["1.0", "1.2"]);
    expect(versions.find((v) => v.spec_version === "1.2")?.is_latest).toBe(
      true,
    );
    expect(res.structuredContent?.latest).toBe("1.2");
  });

  it("get_column defaults to version 1.2 and echoes spec_version", async () => {
    const res = await call("get_column", { column: "BilledCost" });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.spec_version).toBe("1.2");
    const column = res.structuredContent?.column as { id: string };
    expect(column.id).toBe("BilledCost");
    expect(res.content[0]?.text).toContain("CC BY 4.0");
  });

  it("get_column resolves by slug too and honors an explicit version", async () => {
    const res = await call("get_column", {
      column: "billedcost",
      version: "1.0",
    });
    expect(res.structuredContent?.spec_version).toBe("1.0");
  });

  it("get_column returns a nearest-match suggestion for an unknown column", async () => {
    const res = await call("get_column", { column: "BilldCost" });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Did you mean/);
  });

  it("get_column rejects an unknown version with valid options listed", async () => {
    const res = await call("get_column", {
      column: "BilledCost",
      version: "1.1",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unknown FOCUS spec version "1.1"/);
    expect(res.content[0]?.text).toContain("1.0");
    expect(res.content[0]?.text).toContain("1.2");
  });

  it("list_columns returns the pinned counts per version and filters by feature_level/column_type", async () => {
    const v10 = await call("list_columns", { version: "1.0", limit: 100 });
    expect(v10.structuredContent?.total).toBe(43);
    const v12 = await call("list_columns", { limit: 100 });
    expect(v12.structuredContent?.spec_version).toBe("1.2");
    expect(v12.structuredContent?.total).toBe(57);

    const mandatory = await call("list_columns", {
      feature_level: "Mandatory",
      limit: 100,
    });
    const cols = mandatory.structuredContent?.columns as {
      feature_level: string;
    }[];
    expect(cols.length).toBeGreaterThan(0);
    expect(cols.every((c) => c.feature_level === "Mandatory")).toBe(true);

    const metrics = await call("list_columns", {
      column_type: "Metric",
      limit: 100,
    });
    const metricCols = metrics.structuredContent?.columns as {
      column_type: string;
    }[];
    expect(metricCols.every((c) => c.column_type === "Metric")).toBe(true);
  });

  it("search_focus finds columns and attributes by keyword, scoped to one version", async () => {
    const res = await call("search_focus", { query: "commitment discount" });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.spec_version).toBe("1.2");
    const results = res.structuredContent?.results as { slug: string }[];
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.slug === "commitmentdiscountid")).toBe(true);
  });

  it("get_attribute returns the full record with requirements", async () => {
    const res = await call("get_attribute", { slug: "CurrencyFormat" });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.spec_version).toBe("1.2");
    const attribute = res.structuredContent?.attribute as {
      id: string;
      requirements: string[];
    };
    expect(attribute.id).toBe("CurrencyFormat");
    expect(attribute.requirements.length).toBeGreaterThan(0);
    expect(res.content[0]?.text).toContain("CC BY 4.0");
  });

  it("get_attribute resolves version-specific attribute ids (renamed across versions)", async () => {
    const res = await call("get_attribute", {
      slug: "CurrencyCodeFormat",
      version: "1.0",
    });
    expect(res.isError).toBeFalsy();
    const attribute = res.structuredContent?.attribute as { id: string };
    expect(attribute.id).toBe("CurrencyCodeFormat");
  });

  it("get_attribute suggests a nearest match for an unknown slug", async () => {
    const res = await call("get_attribute", { slug: "CurrencyFromat" });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Did you mean/);
  });

  it("get_requirements returns the verbatim MUST/SHOULD bullets", async () => {
    const res = await call("get_requirements", { column: "BilledCost" });
    expect(res.isError).toBeFalsy();
    const requirements = res.structuredContent?.requirements as string[];
    expect(requirements.length).toBeGreaterThan(0);
    expect(requirements.every((r) => /MUST|SHOULD/.test(r))).toBe(true);
  });

  it("get_requirements carries the same CC BY attribution as get_column", async () => {
    const res = await call("get_requirements", { column: "BilledCost" });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toMatch(
      /licensed CC BY 4\.0 \(https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/\)/,
    );
    expect(res.structuredContent?.source_url).toMatch(/^https:\/\//);
    expect(res.structuredContent?.license).toBe("CC-BY-4.0");
  });

  it("compare_versions without a column returns the full 1.0->1.2 diff", async () => {
    const res = await call("compare_versions");
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.from).toBe("1.0");
    expect(res.structuredContent?.to).toBe("1.2");
    expect(res.structuredContent?.official).toBe(false);
    const added = res.structuredContent?.added_columns as unknown[];
    expect(added).toHaveLength(14);
  });

  it("compare_versions banner cites the upstream materiality caveat and links the changelog resource", async () => {
    const res = await call("compare_versions");
    expect(res.content[0]?.text).toMatch(
      /most changes are not material unless specifically called out/,
    );
    expect(res.content[0]?.text).toContain("focus://spec/1.2/changelog");
  });

  it("compare_versions with a column narrows to that column's status", async () => {
    const res = await call("compare_versions", {
      column: "BillingAccountType",
    });
    expect(res.structuredContent?.status).toBe("added");
    expect(res.structuredContent?.column).toBe("BillingAccountType");
  });

  it("compare_versions reports 'changed' for a column present in both with different content", async () => {
    const res = await call("compare_versions", { column: "BilledCost" });
    expect(res.structuredContent?.status).toBe("changed");
    expect(res.structuredContent?.official).toBe(false);
  });

  it("compare_versions errors on an unrecognized column instead of reporting 'unchanged'", async () => {
    const res = await call("compare_versions", { column: "BilledCosts" });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unknown column "BilledCosts"/);
    expect(res.content[0]?.text).toMatch(/Did you mean/);
  });

  it("compare_versions reports 'unchanged' for a column present in both versions with no diff entry", async () => {
    const pickId = store.diff.changed_columns[0]?.id;
    expect(pickId).toBeTruthy();
    const syntheticStore: FocusStore = {
      ...store,
      diff: {
        ...store.diff,
        changed_columns: store.diff.changed_columns.filter(
          (c) => c.id !== pickId,
        ),
      },
    };
    const syntheticServer = createServer(syntheticStore);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const syntheticClient = new Client({
      name: "test-client-synthetic",
      version: "0.0.0",
    });
    await Promise.all([
      syntheticServer.connect(serverTransport),
      syntheticClient.connect(clientTransport),
    ]);
    const res = await syntheticClient.callTool({
      name: "compare_versions",
      arguments: { column: pickId },
    });
    expect(res.isError).toBeFalsy();
    expect(
      (res as { structuredContent?: Record<string, unknown> }).structuredContent
        ?.status,
    ).toBe("unchanged");
    expect(
      (res as { structuredContent?: Record<string, unknown> }).structuredContent
        ?.column,
    ).toBe(pickId);
  });
});

describe("get_kpi_mapping", () => {
  it("lists every mapped KPI by default, with an UNOFFICIAL banner and framework finops:// cross-references", async () => {
    const res = await call("get_kpi_mapping");
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toMatch(/^UNOFFICIAL/);
    expect(res.structuredContent?.official).toBe(false);
    expect(res.structuredContent?.spec_version).toBe("1.2");
    const kpis = res.structuredContent?.kpis as {
      kpi_slug: string;
      kpi_uri: string;
      official: boolean;
    }[];
    expect(kpis.length).toBeGreaterThanOrEqual(15);
    expect(kpis.length).toBeLessThanOrEqual(20);
    expect(res.structuredContent?.total).toBe(kpis.length);
    for (const k of kpis) {
      expect(k.official).toBe(false);
      expect(k.kpi_uri).toBe(`finops://framework/kpis/${k.kpi_slug}`);
    }
    expect(
      kpis.some((k) => k.kpi_slug === "effective-savings-rate-percentage"),
    ).toBe(true);
  });

  it("filters to one KPI by slug and includes its FOCUS-terms formula and columns", async () => {
    const res = await call("get_kpi_mapping", {
      kpi: "effective-savings-rate-percentage",
    });
    expect(res.isError).toBeFalsy();
    const kpis = res.structuredContent?.kpis as {
      kpi_slug: string;
      focus_formula: string;
      columns: string[];
    }[];
    expect(kpis).toHaveLength(1);
    expect(kpis[0]?.kpi_slug).toBe("effective-savings-rate-percentage");
    expect(kpis[0]?.columns).toEqual(
      expect.arrayContaining(["ListCost", "EffectiveCost"]),
    );
    expect(kpis[0]?.focus_formula).toContain("ListCost");
  });

  it("returns a nearest-match error for an unknown kpi slug", async () => {
    const res = await call("get_kpi_mapping", {
      kpi: "effective-savings-rate-percent",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unknown KPI/);
  });

  it("filters by capability slug", async () => {
    const res = await call("get_kpi_mapping", { capability: "forecasting" });
    expect(res.isError).toBeFalsy();
    const kpis = res.structuredContent?.kpis as {
      kpi_slug: string;
      related_capability_slugs: string[];
    }[];
    expect(kpis.length).toBeGreaterThan(0);
    for (const k of kpis) {
      expect(k.related_capability_slugs).toContain("forecasting");
    }
  });

  it("an unknown capability slug returns an empty, non-error result", async () => {
    const res = await call("get_kpi_mapping", {
      capability: "not-a-real-capability",
    });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.total).toBe(0);
  });

  it("honors an explicit version and defaults to 1.2", async () => {
    const res = await call("get_kpi_mapping", { version: "1.0" });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.spec_version).toBe("1.0");
  });

  it("methodology text is included in structuredContent", async () => {
    const res = await call("get_kpi_mapping");
    expect(typeof res.structuredContent?.methodology).toBe("string");
    expect(
      (res.structuredContent?.methodology as string).length,
    ).toBeGreaterThan(50);
  });
});

describe("calculate_kpi", () => {
  it("computes ESR over the official 1.0 sample by default, with the unofficial-calculation banner and sample provenance", async () => {
    const res = await call("calculate_kpi", {
      kpi: "effective-savings-rate-percentage",
      version: "1.0",
    });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toMatch(/^UNOFFICIAL CALCULATION/);
    expect(res.structuredContent?.official).toBe(false);
    expect(res.structuredContent?.spec_version).toBe("1.0");
    expect(res.structuredContent?.unit).toBe("percent");
    expect(typeof res.structuredContent?.value).toBe("number");
    const sample = res.structuredContent?.sample as {
      kind: string;
      row_count: number;
      source_url: string | null;
    };
    expect(sample.kind).toBe("official");
    expect(sample.row_count).toBe(1000);
    expect(typeof sample.source_url).toBe("string");
  });

  it("falls back to the synthetic sample for 1.2 (no official 1.2 sample exists)", async () => {
    const res = await call("calculate_kpi", {
      kpi: "effective-savings-rate-percentage",
      version: "1.2",
    });
    expect(res.isError).toBeFalsy();
    const sample = res.structuredContent?.sample as {
      kind: string;
      seed: number | null;
      source_url: string | null;
    };
    expect(sample.kind).toBe("synthetic");
    expect(sample.source_url).toBeNull();
    expect(typeof sample.seed).toBe("number");
  });

  it("rejects an explicit official sample request for 1.2", async () => {
    const res = await call("calculate_kpi", {
      kpi: "effective-savings-rate-percentage",
      version: "1.2",
      sample: "official",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/No "official" bundled sample/);
  });

  it("computes a second and third mapped KPI over the bundled sample", async () => {
    for (const kpi of [
      "allocation-accuracy-index-aai",
      "percentage-of-costs-associated-with-untagged-csp-cloud-resources",
    ]) {
      const res = await call("calculate_kpi", { kpi, version: "1.0" });
      expect(res.isError, `${kpi} errored`).toBeFalsy();
      expect(res.structuredContent?.kpi_slug).toBe(kpi);
      expect(typeof res.structuredContent?.value).toBe("number");
    }
  });

  it("reports the three commitment KPIs as not computable at 1.0 (zero qualifying Purchase rows), not a fabricated 0%/100%/0", async () => {
    for (const kpi of [
      "commitment-utilization-score",
      "percentage-of-commitment-based-discount-waste",
      "consumption-versus-commitment",
    ]) {
      const res = await call("calculate_kpi", { kpi, version: "1.0" });
      expect(res.isError, `${kpi} should error`).toBe(true);
      expect(res.content[0]?.text).toMatch(/not computable/);
      expect(res.content[0]?.text).toMatch(/version="1\.2"/);
    }
  });

  it("computes the three commitment KPIs at 1.2, whose synthetic sample has qualifying Purchase rows", async () => {
    for (const kpi of [
      "commitment-utilization-score",
      "percentage-of-commitment-based-discount-waste",
      "consumption-versus-commitment",
    ]) {
      const res = await call("calculate_kpi", { kpi, version: "1.2" });
      expect(res.isError, `${kpi} errored`).toBeFalsy();
      expect(typeof res.structuredContent?.value).toBe("number");
    }
  });

  it("errors cleanly with guidance for a mapped KPI that has no registered formula", async () => {
    const res = await call("calculate_kpi", {
      kpi: "forecast-accuracy-rate-spend",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/No calculable formula is registered/);
    expect(res.content[0]?.text).toMatch(/get_kpi_mapping/);
  });

  it("returns a nearest-match error for an unknown kpi slug", async () => {
    const res = await call("calculate_kpi", {
      kpi: "effective-savings-rate-percent",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unknown KPI/);
  });

  it("does not accept a user-supplied dataset (no such input exists)", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "calculate_kpi");
    const props = Object.keys(
      (tool?.inputSchema as { properties?: Record<string, unknown> })
        .properties ?? {},
    );
    expect(props).toEqual(["kpi", "version", "sample"]);
  });
});

describe("cursors", () => {
  it("accepts its own cursor for the same version/query and pages correctly", async () => {
    const first = await call("list_columns", { version: "1.2", limit: 5 });
    const cursor = first.structuredContent?.nextCursor as string;
    expect(cursor).toBeDefined();
    const second = await call("list_columns", {
      version: "1.2",
      limit: 5,
      cursor,
    });
    expect(second.isError).toBeFalsy();
    const page1 = first.structuredContent?.columns as { id: string }[];
    const page2 = second.structuredContent?.columns as { id: string }[];
    expect(page2[0]?.id).not.toBe(page1[0]?.id);
  });

  it("rejects cross-version cursor reuse (spec: version participates in the cursor fingerprint)", async () => {
    const first = await call("list_columns", { version: "1.2", limit: 5 });
    const cursor = first.structuredContent?.nextCursor as string;
    expect(cursor).toBeDefined();
    const reused = await call("list_columns", {
      version: "1.0",
      limit: 5,
      cursor,
    });
    expect(reused.isError).toBe(true);
    expect(reused.content[0]?.text).toMatch(/Cursor mismatch/);
  });

  it("rejects a cursor reused across tools", async () => {
    const first = await call("list_columns", { version: "1.2", limit: 5 });
    const cursor = first.structuredContent?.nextCursor as string;
    expect(cursor).toBeDefined();
    const reused = await call("search_focus", { query: "cost", cursor });
    expect(reused.isError).toBe(true);
    expect(reused.content[0]?.text).toMatch(/Cursor mismatch/);
  });

  it("rejects a stale cursor with a restart instruction", async () => {
    const stale = Buffer.from(JSON.stringify({ v: "0.0.1", o: 10 })).toString(
      "base64url",
    );
    const res = await call("list_columns", { cursor: stale });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Stale cursor/);
  });
});

describe("resources", () => {
  it("lists concrete resources including every column/attribute/glossary per version and the diff", async () => {
    const all: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listResources({ cursor });
      all.push(...page.resources.map((r) => r.uri));
      cursor = page.nextCursor;
    } while (cursor);
    expect(all).toContain("focus://spec/overview");
    expect(all).toContain("focus://spec/versions");
    expect(all).toContain("focus://spec/changes/1.0-1.2");
    expect(all).toContain("focus://spec/1.2/glossary");
    expect(all).toContain("focus://spec/1.0/glossary");
    expect(all).toContain("focus://spec/1.2/changelog");
    expect(all).toContain("focus://spec/1.0/changelog");
    expect(
      all.filter((u) => u.startsWith("focus://spec/1.2/columns/")),
    ).toHaveLength(57);
    expect(
      all.filter((u) => u.startsWith("focus://spec/1.0/columns/")),
    ).toHaveLength(43);
  });

  it("reads a column resource with attribution footer", async () => {
    const res = await client.readResource({
      uri: "focus://spec/1.2/columns/billedcost",
    });
    const text = (res.contents[0] as { text: string }).text;
    expect(text).toMatch(/^# Billed Cost/);
    expect(text).toContain("CC BY 4.0");
  });

  it("reads the changelog resource with upstream text and attribution", async () => {
    const res = await client.readResource({
      uri: "focus://spec/1.2/changelog",
    });
    const text = (res.contents[0] as { text: string }).text;
    expect(text).toMatch(
      /^# FinOps Open Cost and Usage Specification Changelog/,
    );
    expect(text).toContain(
      "the vast majority of such changes are not material unless specifically called out",
    );
    expect(text).toContain("CC BY 4.0");
  });

  it("reads the changes resource with the diff summary", async () => {
    const res = await client.readResource({
      uri: "focus://spec/changes/1.0-1.2",
    });
    const text = (res.contents[0] as { text: string }).text;
    expect(text).toMatch(/UNOFFICIAL/);
    expect(text).toContain("BillingAccountType");
  });

  it("returns -32002 with a nearest-match suggestion for an unknown column slug", async () => {
    await expect(
      client.readResource({ uri: "focus://spec/1.2/columns/billdcost" }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("returns -32002 for an unknown spec version", async () => {
    await expect(
      client.readResource({ uri: "focus://spec/1.1/columns/billedcost" }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("returns -32002 for an unknown attribute slug", async () => {
    await expect(
      client.readResource({
        uri: "focus://spec/1.2/attributes/currencyfromat",
      }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("completes column-template variables (version and slug)", async () => {
    const res = await client.complete({
      ref: {
        type: "ref/resource",
        uri: "focus://spec/{version}/columns/{slug}",
      },
      argument: { name: "version", value: "1" },
    });
    expect(res.completion.values).toEqual(
      expect.arrayContaining(["1.0", "1.2"]),
    );
  });
});

describe("prompts", () => {
  it("registers explain-focus and returns embedded overview content", async () => {
    const res = await client.getPrompt({
      name: "explain-focus",
      arguments: {},
    });
    expect(res.messages.length).toBeGreaterThan(0);
  });

  it("registers map-column-across-versions and embeds both versions' column docs", async () => {
    const res = await client.getPrompt({
      name: "map-column-across-versions",
      arguments: { column: "BilledCost" },
    });
    const resourceMsgs = res.messages.filter(
      (m) => (m.content as { type: string }).type === "resource",
    );
    expect(resourceMsgs.length).toBeGreaterThanOrEqual(3); // both versions + diff
  });
});

describe("outputSchema conformance", () => {
  it("every tool's structuredContent conforms to its declared outputSchema", async () => {
    const { tools } = await client.listTools();
    const schemaByName = new Map(
      tools.map((t) => [t.name, t.outputSchema as Record<string, unknown>]),
    );
    const calls: [string, Record<string, unknown>][] = [
      ["list_versions", {}],
      ["get_column", { column: "BilledCost" }],
      ["list_columns", { limit: 5 }],
      ["search_focus", { query: "cost" }],
      ["get_attribute", { slug: "CurrencyFormat" }],
      ["get_requirements", { column: "BilledCost" }],
      ["compare_versions", {}],
      ["compare_versions", { column: "BillingAccountType" }],
      ["get_kpi_mapping", {}],
      ["get_kpi_mapping", { kpi: "effective-savings-rate-percentage" }],
      [
        "calculate_kpi",
        { kpi: "effective-savings-rate-percentage", version: "1.0" },
      ],
    ];
    const checkAgainst = (
      value: unknown,
      schema: Record<string, unknown> | undefined,
      path: string,
    ): string[] => {
      if (!schema || typeof value !== "object" || value === null) return [];
      const type = schema.type as string | undefined;
      if (type === "array" && Array.isArray(value)) {
        return value.flatMap((item, i) =>
          checkAgainst(
            item,
            schema.items as Record<string, unknown> | undefined,
            `${path}[${i}]`,
          ),
        );
      }
      if (type !== "object" || Array.isArray(value)) return [];
      const declared = Object.keys(
        (schema.properties as Record<string, unknown> | undefined) ?? {},
      );
      const additional = schema.additionalProperties;
      const problems: string[] = [];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (!declared.includes(k)) {
          if (additional === true || typeof additional === "object") {
            problems.push(
              ...checkAgainst(
                v,
                typeof additional === "object"
                  ? (additional as Record<string, unknown>)
                  : undefined,
                `${path}.${k}`,
              ),
            );
          } else {
            problems.push(`${path}.${k} emitted but not declared`);
          }
        } else {
          problems.push(
            ...checkAgainst(
              v,
              (schema.properties as Record<string, Record<string, unknown>>)[k],
              `${path}.${k}`,
            ),
          );
        }
      }
      return problems;
    };
    // Every tool the server registers must appear in the representative-call
    // list above — this fails loudly if a new tool is added without a case.
    const coveredNames = new Set(calls.map(([name]) => name));
    for (const t of tools) {
      expect(
        coveredNames.has(t.name),
        `${t.name} not covered by conformance test`,
      ).toBe(true);
    }
    for (const [name, args] of calls) {
      const res = await call(name, args);
      expect(res.isError, `${name} errored`).toBeFalsy();
      const problems = checkAgainst(
        res.structuredContent,
        schemaByName.get(name),
        name,
      );
      expect(problems, problems.join("; ")).toEqual([]);
    }
  });
});
