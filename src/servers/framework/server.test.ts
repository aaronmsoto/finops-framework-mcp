import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadArtifact } from "../../shared/index.js";
import { createServer } from "./server.js";

const ARTIFACT_DIR = join(import.meta.dirname, "../../../data/framework");

let client: Client;

beforeAll(async () => {
  const artifact = loadArtifact(ARTIFACT_DIR);
  const server = createServer(artifact);
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

describe("resources", () => {
  it("lists concrete resources including all 22 capabilities", async () => {
    const all: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listResources({ cursor });
      all.push(...page.resources.map((r) => r.uri));
      cursor = page.nextCursor;
    } while (cursor);
    expect(all).toContain("finops://framework/overview");
    expect(
      all.filter((u) => u.startsWith("finops://framework/capabilities/")),
    ).toHaveLength(22);
    expect(
      all.filter((u) => u.startsWith("finops://framework/personas/")),
    ).toHaveLength(11);
  });

  it("reads a capability document with attribution footer", async () => {
    const res = await client.readResource({
      uri: "finops://framework/capabilities/allocation",
    });
    const text = (res.contents[0] as { text: string }).text;
    expect(text).toMatch(/^# Allocation/);
    expect(text).toContain("Maturity: crawl");
    expect(text).toContain("CC BY 4.0");
    expect(text).toContain("adapted");
  });

  it("serves maturity-level template resources incl. flagged pre-crawl", async () => {
    const run = await client.readResource({
      uri: "finops://framework/capabilities/forecasting/maturity/run",
    });
    expect((run.contents[0] as { text: string }).text).toContain(
      "assessment characteristics",
    );
    const pre = await client.readResource({
      uri: "finops://framework/capabilities/forecasting/maturity/pre-crawl",
    });
    expect((pre.contents[0] as { text: string }).text).toContain(
      "unofficial extension",
    );
  });

  it("returns -32002 with suggestions for an unknown slug (critique m5)", async () => {
    await expect(
      client.readResource({
        uri: "finops://framework/capabilities/allocaton/maturity/run",
      }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("separates official and inferred edges in the graph resource", async () => {
    const res = await client.readResource({
      uri: "finops://framework/graph/relationships",
    });
    const data = JSON.parse((res.contents[0] as { text: string }).text) as {
      official: { source: string }[];
      inferred: { source: string; evidence_quote?: string }[];
    };
    expect(data.official.every((e) => e.source === "official")).toBe(true);
    expect(
      data.inferred.every((e) => e.source === "inferred" && !!e.evidence_quote),
    ).toBe(true);
  });
});

describe("tools", () => {
  it("get_framework_info returns counts and orientation", async () => {
    const res = await call("get_framework_info");
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.counts).toMatchObject({
      capabilities: 22,
      principles: 6,
    });
  });

  it("search_framework finds allocation for an ownership question", async () => {
    const res = await call("search_framework", {
      query: "assign costs teams accountability tags",
    });
    const results = res.structuredContent?.results as { slug: string }[];
    expect(results.map((r) => r.slug)).toContain("allocation");
  });

  it("list_capabilities filters by persona with full list in one page", async () => {
    const all = await call("list_capabilities", {});
    expect((all.structuredContent?.capabilities as unknown[]).length).toBe(22);
    expect(all.structuredContent?.nextCursor).toBeUndefined();
    const fin = await call("list_capabilities", { persona: "finance" });
    expect(
      (fin.structuredContent?.capabilities as unknown[]).length,
    ).toBeGreaterThan(3);
  });

  it("get_capability defaults to small include and links the resource", async () => {
    const res = await call("get_capability", { slug: "allocation" });
    const sections = res.structuredContent?.sections as Record<string, unknown>;
    expect(Object.keys(sections).sort()).toEqual(["definition_md", "summary"]);
    expect(res.content.some((c) => c.type === "resource_link")).toBe(true);
  });

  it("get_capability unknown slug suggests nearest matches in-band", async () => {
    const res = await call("get_capability", { slug: "allocaton" });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("allocation");
  });

  it("get_actions marks items as unofficial characteristics", async () => {
    const res = await call("get_actions", {
      capability: "allocation",
      maturity: "crawl",
    });
    expect(res.structuredContent?.note).toMatch(/unofficial/i);
    const levels = res.structuredContent?.levels as { items: unknown[] }[];
    expect(levels[0]?.items.length).toBeGreaterThan(3);
  });

  it("get_actions at pre-crawl explains the extension instead of inventing data", async () => {
    const res = await call("get_actions", {
      capability: "allocation",
      maturity: "pre-crawl",
    });
    expect(res.structuredContent?.note).toMatch(
      /not FinOps Foundation vocabulary/,
    );
    expect(res.structuredContent?.levels).toEqual([]);
  });

  it("get_kpis returns full records with formulas where published", async () => {
    const res = await call("get_kpis", { capability: "allocation" });
    const kpis = res.structuredContent?.kpis as {
      slug: string;
      formula?: string;
    }[];
    expect(kpis.length).toBeGreaterThanOrEqual(3);
    expect(kpis.some((k) => !!k.formula)).toBe(true);
  });

  it("get_prerequisites marks inference explicitly in the summary", async () => {
    const res = await call("get_prerequisites", { capability: "forecasting" });
    expect(res.structuredContent?.summary).toMatch(/UNOFFICIAL/);
  });

  it("map_personas(persona) answers Q3 in one call with inline activities", async () => {
    const res = await call("map_personas", { persona: "finance" });
    const entries = res.structuredContent?.entries as {
      activities: string[];
    }[];
    expect(entries.length).toBeGreaterThan(3);
    expect(entries.every((e) => e.activities.length > 0)).toBe(true);
  });

  it("map_personas() returns the persona index", async () => {
    const res = await call("map_personas");
    expect((res.structuredContent?.personas as unknown[]).length).toBe(11);
  });

  it("rejects a stale cursor with a restart instruction", async () => {
    const stale = Buffer.from(JSON.stringify({ v: "0.0.1", o: 10 })).toString(
      "base64url",
    );
    const res = await call("get_kpis", { cursor: stale });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Stale cursor/);
  });

  it("get_changelog reports the current version", async () => {
    const res = await call("get_changelog", {});
    expect(res.structuredContent?.current_version).toMatch(/^\d+\./);
  });
});

describe("prompts", () => {
  it("lists the four workflows", async () => {
    const res = await client.listPrompts();
    expect(res.prompts.map((p) => p.name).sort()).toEqual([
      "assess-capability-maturity",
      "explain-framework",
      "map-personas-to-capabilities",
      "plan-maturity-roadmap",
    ]);
  });

  it("renders assess-capability-maturity with embedded resource content (critique M8)", async () => {
    const res = await client.getPrompt({
      name: "assess-capability-maturity",
      arguments: { capability: "allocation" },
    });
    const embedded = res.messages.find((m) => m.content.type === "resource");
    expect(embedded).toBeDefined();
    const resource = (
      embedded?.content as { resource: { uri: string; text: string } }
    ).resource;
    expect(resource.uri).toBe("finops://framework/capabilities/allocation");
    expect(resource.text).toContain("# Allocation");
  });
});
