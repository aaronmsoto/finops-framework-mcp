import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadArtifact } from "../../shared/index.js";
import { createServer } from "./server.js";
import { TEMPLATES } from "./uris.js";

const ARTIFACT_DIR = join(import.meta.dirname, "../../../data/framework");

let client: Client;
let expClient: Client;

async function connect(experimental: boolean): Promise<Client> {
  const artifact = loadArtifact(ARTIFACT_DIR);
  const server = createServer(artifact, { experimental });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const c = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    c.connect(clientTransport),
  ]);
  return c;
}

beforeAll(async () => {
  client = await connect(false);
  expClient = await connect(true);
});

async function callOn(
  c: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  const res = await c.callTool({ name, arguments: args });
  return res as {
    content: { type: string; text?: string; uri?: string }[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };
}

async function call(name: string, args: Record<string, unknown> = {}) {
  return callOn(client, name, args);
}

async function callExp(name: string, args: Record<string, unknown> = {}) {
  return callOn(expClient, name, args);
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

  it("serves maturity-level template resources with official text only by default", async () => {
    const run = await client.readResource({
      uri: "finops://framework/capabilities/forecasting/maturity/run",
    });
    const text = (run.contents[0] as { text: string }).text;
    expect(text).toContain("Maturity: run");
    expect(text).not.toMatch(/pre-crawl/i);
    expect(text).not.toContain("assessment characteristics");
  });

  it("rejects the pre-crawl maturity resource by default (unknown level)", async () => {
    await expect(
      client.readResource({
        uri: "finops://framework/capabilities/forecasting/maturity/pre-crawl",
      }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("returns -32002 with suggestions for an unknown slug (critique m5)", async () => {
    await expect(
      client.readResource({
        uri: "finops://framework/capabilities/allocaton/maturity/run",
      }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("returns -32002 for concrete capability/persona typos too (critique-2 M2')", async () => {
    await expect(
      client.readResource({
        uri: "finops://framework/capabilities/allocaton",
      }),
    ).rejects.toMatchObject({ code: -32002 });
    await expect(
      client.readResource({ uri: "finops://framework/personas/financee" }),
    ).rejects.toMatchObject({ code: -32002 });
  });

  it("completes prompt arguments (critique-2 M1')", async () => {
    const res = await client.complete({
      ref: { type: "ref/prompt", name: "assess-capability-maturity" },
      argument: { name: "capability", value: "allo" },
    });
    expect(res.completion.values).toContain("allocation");
  });

  it("maturity-level resource template completions omit pre-crawl by default", async () => {
    const res = await client.complete({
      ref: { type: "ref/resource", uri: TEMPLATES.capabilityMaturity },
      argument: { name: "level", value: "" },
    });
    expect(res.completion.values.sort()).toEqual(["crawl", "run", "walk"]);
  });
});

describe("resources (experimental)", () => {
  it("serves the pre-crawl maturity resource and includes it in completions", async () => {
    const completions = await expClient.complete({
      ref: { type: "ref/resource", uri: TEMPLATES.capabilityMaturity },
      argument: { name: "level", value: "" },
    });
    expect(completions.completion.values.sort()).toEqual([
      "crawl",
      "pre-crawl",
      "run",
      "walk",
    ]);
    const pre = await expClient.readResource({
      uri: "finops://framework/capabilities/forecasting/maturity/pre-crawl",
    });
    expect((pre.contents[0] as { text: string }).text).toContain(
      "unofficial extension",
    );
    const run = await expClient.readResource({
      uri: "finops://framework/capabilities/forecasting/maturity/run",
    });
    expect((run.contents[0] as { text: string }).text).toContain(
      "assessment characteristics",
    );
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

  it("get_maturity_assessment returns verbatim official text with attribution and a resource_link", async () => {
    const res = await call("get_maturity_assessment", {
      capability: "allocation",
      level: "crawl",
    });
    expect(res.isError).toBeFalsy();
    const levels = res.structuredContent?.levels as {
      maturity: string;
      assessment_md: string;
    }[];
    expect(levels).toHaveLength(1);
    expect(levels[0]?.maturity).toBe("crawl");
    expect(levels[0]?.assessment_md.length).toBeGreaterThan(0);
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).toContain("CC BY 4.0");
    expect(res.content.some((c) => c.type === "resource_link")).toBe(true);
  });

  it("get_maturity_assessment without a level returns all three official levels", async () => {
    const res = await call("get_maturity_assessment", {
      capability: "allocation",
    });
    const levels = res.structuredContent?.levels as { maturity: string }[];
    expect(levels.map((l) => l.maturity)).toEqual(["crawl", "walk", "run"]);
  });

  it("get_maturity_assessment unknown capability suggests nearest matches", async () => {
    const res = await call("get_maturity_assessment", {
      capability: "allocaton",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("allocation");
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

  it("get_kpis text carries full records, truncation note, and attribution (critique-2 B1')", async () => {
    const res = await call("get_kpis", {});
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).toContain("description_md");
    expect(text).toMatch(/Showing 25 of \d+ — pass cursor/);
    expect(text).toContain("CC BY 4.0");
    const one = await call("get_kpis", {
      slug: "allocation-accuracy-index-aai",
    });
    const oneText = one.content.find((c) => c.type === "text")?.text ?? "";
    expect(oneText).toContain("Directly Attributed Costs");
    expect(one.content.some((c) => c.type === "resource_link")).toBe(true);
  });

  it("leaf tools carry CC BY attribution in text (critique-2 M7')", async () => {
    for (const [tool, args] of [
      ["get_capability", { slug: "allocation" }],
      ["get_maturity_assessment", { capability: "allocation", level: "crawl" }],
      ["get_maturity_model", {}],
    ] as const) {
      const res = await call(tool, args as Record<string, unknown>);
      const text = res.content.find((c) => c.type === "text")?.text ?? "";
      expect(text, tool).toContain("CC BY 4.0");
    }
  });

  it("get_entity serves full text for resource-only entity types (critique-2 M3')", async () => {
    const res = await call("get_entity", { entity_type: "principles" });
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).toContain("Teams need to collaborate");
    expect(text).toContain("CC BY 4.0");
    const persona = await call("get_entity", {
      entity_type: "persona",
      slug: "finance",
    });
    expect((persona.structuredContent?.markdown as string) ?? "").toContain(
      "Finance",
    );
  });

  it("get_kpis slug lookup returns one record; unknown slug suggests", async () => {
    const one = await call("get_kpis", {
      slug: "allocation-accuracy-index-aai",
    });
    expect((one.structuredContent?.kpis as unknown[]).length).toBe(1);
    const bad = await call("get_kpis", { slug: "allocation-accuracy-índex" });
    expect(bad.isError).toBe(true);
    expect(bad.content[0]?.text).toContain("allocation-accuracy-index-aai");
  });

  it("get_kpis featured_only with capability means featured on that page", async () => {
    const res = await call("get_kpis", {
      capability: "forecasting",
      featured_only: true,
    });
    const kpis = res.structuredContent?.kpis as { featured_on: string[] }[];
    expect(kpis.length).toBe(4);
    expect(kpis.every((k) => k.featured_on.includes("forecasting"))).toBe(true);
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

  it("serves complete capability summaries — no mid-word cuts (critique-3 A3-fidelity-1)", async () => {
    const res = await call("list_capabilities", {});
    const rows = res.structuredContent?.capabilities as {
      slug: string;
      summary: string;
    }[];
    expect(rows.length).toBe(22);
    const source = loadArtifact(ARTIFACT_DIR);
    for (const r of rows) {
      const cap = source.capabilities.find((c) => c.slug === r.slug)!;
      expect(r.summary).toBe(cap.summary); // full, not a prefix cut
    }
    // The text block includes summaries per the tool description.
    const text = res.content[0]?.text as string;
    const esa = rows.find((r) => r.slug === "executive-strategy-alignment")!;
    if (esa.summary) expect(text).toContain(esa.summary.slice(0, 80));
  });

  it("rejects a cursor reused with a different query (critique-3 A1-protocol-1)", async () => {
    const first = await call("search_framework", {
      query: "cost allocation",
      limit: 3,
    });
    const cursor = first.structuredContent?.nextCursor as string;
    expect(cursor).toBeDefined();
    const reused = await call("search_framework", {
      query: "kubernetes",
      cursor,
    });
    expect(reused.isError).toBe(true);
    expect(reused.content[0]?.text).toMatch(/Cursor mismatch/);
  });

  it("rejects a cursor reused across tools", async () => {
    const first = await call("get_kpis", {});
    const cursor = first.structuredContent?.nextCursor as string;
    expect(cursor).toBeDefined();
    const reused = await call("list_capabilities", { cursor });
    expect(reused.isError).toBe(true);
    expect(reused.content[0]?.text).toMatch(/Cursor mismatch/);
  });

  it("accepts its own cursor for the same query and pages correctly", async () => {
    const first = await call("search_framework", { query: "cost", limit: 3 });
    const cursor = first.structuredContent?.nextCursor as string;
    expect(cursor).toBeDefined();
    const second = await call("search_framework", {
      query: "cost",
      limit: 3,
      cursor,
    });
    expect(second.isError).toBeFalsy();
    const page1 = first.structuredContent?.results as { slug: string }[];
    const page2 = second.structuredContent?.results as { slug: string }[];
    expect(page2.length).toBeGreaterThan(0);
    expect(page2[0]?.slug).not.toBe(page1[0]?.slug);
  });

  it("get_changelog reports the current version", async () => {
    const res = await call("get_changelog", {});
    expect(res.structuredContent?.current_version).toMatch(/^\d+\./);
  });

  it("assess_maturity_path returns verbatim assessment_md with official-only enums", async () => {
    const res = await call("assess_maturity_path", {
      capability: "allocation",
      current_level: "crawl",
      target_level: "run",
    });
    expect(res.isError).toBeFalsy();
    const gap = res.structuredContent?.gap as {
      maturity: string;
      assessment_md: string;
    }[];
    expect(gap.map((g) => g.maturity)).toEqual(["walk", "run"]);
    expect(gap.every((g) => g.assessment_md.length > 0)).toBe(true);
    expect(res.structuredContent?.note).toBeUndefined();
  });

  it("assess_maturity_path rejects pre-crawl as an enum value", async () => {
    const res = await call("assess_maturity_path", {
      capability: "allocation",
      current_level: "pre-crawl",
      target_level: "run",
    });
    expect(res.isError).toBe(true);
  });

  it("get_maturity_model has exactly 3 official levels and no unofficial_extension by default", async () => {
    const res = await call("get_maturity_model", {});
    expect((res.structuredContent?.official_levels as unknown[]).length).toBe(
      3,
    );
    expect(res.structuredContent?.unofficial_extension).toBeUndefined();
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).not.toMatch(/pre-crawl/i);
  });
});

describe("flag matrix", () => {
  it("default tools/list lacks get_actions, includes get_maturity_assessment, and mentions no pre-crawl", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("get_actions");
    expect(names).toContain("get_maturity_assessment");
    expect(JSON.stringify(tools)).not.toMatch(/pre-crawl/i);
  });

  it("experimental tools/list restores get_actions, labeled EXPERIMENTAL", async () => {
    const { tools } = await expClient.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("get_actions");
    expect(names).toContain("get_maturity_assessment");
    const getActions = tools.find((t) => t.name === "get_actions");
    expect(getActions?.title ?? "").toMatch(/EXPERIMENTAL/);
    expect(getActions?.description ?? "").toMatch(/EXPERIMENTAL/);
  });

  it("experimental get_maturity_model includes the unofficial extension alongside the 3 official levels", async () => {
    const res = await callExp("get_maturity_model", {});
    expect((res.structuredContent?.official_levels as unknown[]).length).toBe(
      3,
    );
    expect(res.structuredContent?.unofficial_extension).toBeDefined();
  });

  it("experimental get_actions marks items as unofficial characteristics", async () => {
    const res = await callExp("get_actions", {
      capability: "allocation",
      maturity: "crawl",
    });
    expect(res.structuredContent?.note).toMatch(/unofficial/i);
    const levels = res.structuredContent?.levels as { items: unknown[] }[];
    expect(levels[0]?.items.length).toBeGreaterThan(3);
  });

  it("experimental get_actions at pre-crawl explains the extension instead of inventing data", async () => {
    const res = await callExp("get_actions", {
      capability: "allocation",
      maturity: "pre-crawl",
    });
    expect(res.structuredContent?.note).toMatch(
      /not FinOps Foundation vocabulary/,
    );
    expect(res.structuredContent?.levels).toEqual([]);
  });

  it("experimental get_actions honors the level alias", async () => {
    const res = await callExp("get_actions", {
      capability: "allocation",
      level: "crawl",
    });
    const levels = res.structuredContent?.levels as { maturity: string }[];
    expect(levels).toHaveLength(1);
    expect(levels[0]?.maturity).toBe("crawl");
  });

  it("assess_maturity_path is unchanged by the experimental flag (still official-only)", async () => {
    const res = await callExp("assess_maturity_path", {
      capability: "allocation",
      current_level: "crawl",
      target_level: "walk",
    });
    const gap = res.structuredContent?.gap as { maturity: string }[];
    expect(gap.map((g) => g.maturity)).toEqual(["walk"]);
    const bad = await callExp("assess_maturity_path", {
      capability: "allocation",
      current_level: "pre-crawl",
      target_level: "run",
    });
    expect(bad.isError).toBe(true);
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
