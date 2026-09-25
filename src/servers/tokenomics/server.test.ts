import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  loadTokenomicsArtifact,
  type TokenomicsArtifact,
} from "../../shared/tokenomics/artifact.js";
import type { CurriculumOverlay } from "../../shared/tokenomics/curriculum.js";
import { createServer, type CreateServerOptions } from "./server.js";
import { resolveBigTClass } from "./tools.js";

const DATA_DIR = join(import.meta.dirname, "../../../data/tokenomics");

type Res = {
  content: { type: string; text?: string; uri?: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

const OVERLAY: CurriculumOverlay = {
  kind: "cert-prep-curriculum",
  official: false,
  imported_at: "2026-09-25T00:00:00.000Z",
  modules: [
    {
      id: "TK-900",
      title: "Synthetic test module",
      level: 200,
      minutes: 30,
      personas: ["Engineering"],
      prerequisites_required: [],
      prerequisites_recommended: [],
      objectives: ["Explain prefix caching"],
      agenda: ["Mechanics"],
      deliverable: null,
      anchors: [{ source: "tf-cache", section: "Monitoring" }],
      refresh_triggers: [],
      slides: [
        {
          id: "s1",
          title: "Order the prompt",
          body: "Stable first",
          source_line: "Source: test",
          notes: null,
        },
      ],
    },
  ],
  glossary: [
    { term: "Prompt cache", definition: "synthetic", section: "3.9 Test" },
  ],
  numbers: [{ figure: "34×", wording: "worked example", cite_as: "tf-bigt" }],
};

let artifact: TokenomicsArtifact;

async function connect(opts: CreateServerOptions = {}): Promise<Client> {
  const server = createServer(artifact, opts);
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(st), client.connect(ct)]);
  return client;
}

let client: Client;
let expClient: Client;
let curClient: Client;

beforeAll(async () => {
  artifact = loadTokenomicsArtifact(DATA_DIR);
  client = await connect();
  expClient = await connect({ experimental: true });
  curClient = await connect({ experimental: true, curriculum: OVERLAY });
});

function textOf(r: { contents: unknown[] }): string {
  return String((r.contents[0] as { text?: string } | undefined)?.text);
}

async function call(
  name: string,
  args: Record<string, unknown> = {},
  c: Client = client,
): Promise<Res> {
  return (await c.callTool({ name, arguments: args })) as Res;
}

describe("tools — default surface", () => {
  it("get_tokenomics_info lists every document with its status", async () => {
    const res = await call("get_tokenomics_info");
    expect(res.isError).toBeFalsy();
    const docs = res.structuredContent?.documents as { status: string }[];
    expect(docs).toHaveLength(12);
    expect(docs.every((d) => d.status.length > 0)).toBe(true);
    expect(res.structuredContent?.experimental).toBe(false);
    expect(res.content[0]?.text).toContain("Release Candidate");
  });

  it("list_documents filters by kind and exposes section ids", async () => {
    const res = await call("list_documents", { kind: "insight" });
    const docs = res.structuredContent?.documents as {
      kind: string;
      sections: unknown[];
    }[];
    expect(docs.length).toBeGreaterThan(0);
    expect(
      docs.every((d) => d.kind === "insight" && d.sections.length > 0),
    ).toBe(true);
  });

  it("get_document returns one section with status and CC BY footer", async () => {
    const res = await call("get_document", {
      document: "cache-explainer",
      section: "tcmonitoring",
    });
    expect(res.isError).toBeFalsy();
    const text = res.content[0]?.text ?? "";
    expect(text).toContain("Release Candidate 1");
    expect(text).toContain("Measuring prefix caching");
    expect(text).not.toContain("Three rules govern");
    expect(text).toContain("CC BY 4.0");
    expect(res.content[1]?.uri).toBe(
      "tokenomics://overview/documents/cache-explainer",
    );
  });

  it("get_document without a section returns the whole document", async () => {
    const res = await call("get_document", { document: "big-t-notation" });
    expect(res.content[0]?.text).toContain("The complexity ladder");
    expect(res.structuredContent?.section).toBeNull();
  });

  it("get_document rejects unknown documents and sections with suggestions", async () => {
    const a = await call("get_document", { document: "cache-explainr" });
    expect(a.isError).toBe(true);
    expect(a.content[0]?.text).toContain("cache-explainer");
    const b = await call("get_document", {
      document: "cache-explainer",
      section: "nope",
    });
    expect(b.isError).toBe(true);
    expect(b.content[0]?.text).toContain("tcmonitoring");
  });

  it("list_layers returns the five layers with the published summary", async () => {
    const res = await call("list_layers");
    const layers = res.structuredContent?.layers as {
      number: number;
      moves_multiplier: boolean;
    }[];
    expect(layers.map((l) => l.number)).toEqual([1, 2, 3, 4, 5]);
    expect(layers.map((l) => l.moves_multiplier)).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it("get_layer accepts a number, an id, or a name", async () => {
    for (const layer of ["3", "l3", "L3", "inference stack"]) {
      const res = await call("get_layer", { layer });
      expect(res.isError, layer).toBeFalsy();
      const l = res.structuredContent?.layer as {
        slug: string;
        key_metric: string;
      };
      expect(l.slug).toBe("l3");
      expect(l.key_metric).toContain("Cache hit rate");
    }
    const bad = await call("get_layer", { layer: "l9" });
    expect(bad.isError).toBe(true);
  });

  it("get_bigt_notation returns T(n · k · a) and six classes", async () => {
    const res = await call("get_bigt_notation");
    expect(res.structuredContent?.notation).toBe("T(n · k · a)");
    expect(res.structuredContent?.expansion).toBe(
      "requests × model calls per request × agent depth",
    );
    expect((res.structuredContent?.classes as unknown[]).length).toBe(6);
    expect(res.content[0]?.text).toContain("T(∞)");
  });

  it("get_bigt_class resolves many spellings and links layers + levers", async () => {
    const res = await call("get_bigt_class", { class: "n*k*a" });
    expect(res.isError).toBeFalsy();
    const c = res.structuredContent?.class as { notation: string; fix: string };
    expect(c.notation).toBe("T(n·k·a)");
    expect(c.fix).toContain("circuit breakers");
    const layers = res.structuredContent?.moved_by_layers as { slug: string }[];
    expect(layers.map((l) => l.slug)).toEqual(["l5"]);
    const bad = await call("get_bigt_class", { class: "T(n^2)" });
    expect(bad.isError).toBe(true);
  });

  it("resolveBigTClass handles notation variants", () => {
    const classes = artifact.bigt.classes;
    expect(resolveBigTClass(classes, "T(1)")?.slug).toBe("t-1");
    expect(resolveBigTClass(classes, "log n")?.slug).toBe("t-log-n");
    expect(resolveBigTClass(classes, "T(∞)")?.slug).toBe("t-infinity");
    expect(resolveBigTClass(classes, "unbounded")?.slug).toBe("t-infinity");
    expect(resolveBigTClass(classes, "t-n-k")?.slug).toBe("t-n-k");
    expect(resolveBigTClass(classes, "nk")?.slug).toBe("t-n-k");
    expect(resolveBigTClass(classes, "zzz")).toBeNull();
  });

  it("list_levers filters by layer, class, and kind, and paginates", async () => {
    const l3 = await call("list_levers", { layer: 3 });
    const rows = l3.structuredContent?.levers as { layer: number }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.layer === 3)).toBe(true);
    const logn = await call("list_levers", { bigt_class: "T(log n)" });
    expect(
      (logn.structuredContent?.levers as { slug: string }[]).map((l) => l.slug),
    ).toContain("approach-filtered-retrieval");
    const kinds = await call("list_levers", { kind: "bigt-lever" });
    expect((kinds.structuredContent?.levers as unknown[]).length).toBe(5);
    const p1 = await call("list_levers", { limit: 5 });
    const cursor = p1.structuredContent?.nextCursor as string;
    expect(cursor).toBeTruthy();
    const p2 = await call("list_levers", { limit: 5, cursor });
    expect(p2.isError).toBeFalsy();
    const mismatch = await call("list_levers", { limit: 5, cursor, layer: 3 });
    expect(mismatch.isError).toBe(true);
    const badClass = await call("list_levers", { bigt_class: "T(x)" });
    expect(badClass.isError).toBe(true);
  });

  it("get_lever returns provenance and rejects unknown slugs", async () => {
    const res = await call("get_lever", { lever: "bigt-model-routing" });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toContain("quality floor");
    expect((await call("get_lever", { lever: "nope" })).isError).toBe(true);
  });

  it("metrics carry the cache explainer formulas verbatim", async () => {
    const res = await call("list_metrics");
    const metrics = res.structuredContent?.metrics as {
      slug: string;
      formula: string | null;
    }[];
    expect(metrics).toHaveLength(7);
    expect(metrics.find((m) => m.slug === "cache-hit-rate")?.formula).toBe(
      "Cache hit rate = cache read / (cache read + cache write + uncached input)",
    );
    expect(
      metrics.find((m) => m.slug === "cache-cost-efficiency")?.formula,
    ).toBe(
      "Cache cost efficiency = 1 − actual prompt cost / uncached equivalent cost",
    );
  });

  it("get_metric includes stated cross-links but no crosswalk by default", async () => {
    const res = await call("get_metric", { metric: "Cache hit rate" });
    expect(res.isError).toBeFalsy();
    const links = res.structuredContent?.crosslinks as {
      target: { id: string };
    }[];
    expect(links.map((l) => l.target.id)).toContain("TokenCacheAction");
    expect(res.structuredContent?.crosswalk).toEqual([]);
    expect(res.content[0]?.text).not.toContain("UNOFFICIAL");
    expect((await call("get_metric", { metric: "nope" })).isError).toBe(true);
  });

  it("calculate_cache_metrics reproduces the hand-computed example exactly", async () => {
    const res = await call("calculate_cache_metrics", {
      cache_read_tokens: 800000,
      cache_write_tokens: 50000,
      uncached_input_tokens: 150000,
      base_input_price_per_mtok: 3,
      cache_read_multiplier: 0.1,
      cache_write_multiplier: 1.25,
    });
    expect(res.isError).toBeFalsy();
    // read 0.24 + write 0.1875 + uncached 0.45 = 0.8775; 1 − 0.8775/3 = 0.7075
    expect(res.structuredContent).toMatchObject({
      cache_hit_rate: 0.8,
      uncached_equivalent_cost: 3,
      actual_prompt_cost: 0.8775,
      actual_prompt_cost_source: "computed",
      cache_cost_efficiency: 0.7075,
    });
  });

  it("calculate_cache_metrics handles hit-rate-only, given cost, and break-even", async () => {
    const hitOnly = await call("calculate_cache_metrics", {
      cache_read_tokens: 1,
      cache_write_tokens: 1,
      uncached_input_tokens: 2,
    });
    expect(hitOnly.structuredContent?.cache_hit_rate).toBe(0.25);
    expect(hitOnly.structuredContent?.cache_cost_efficiency).toBeNull();
    const given = await call("calculate_cache_metrics", {
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      uncached_input_tokens: 1_000_000,
      base_input_price_per_mtok: 2,
      actual_prompt_cost: 2,
    });
    expect(given.structuredContent?.cache_cost_efficiency).toBe(0);
    expect(given.structuredContent?.actual_prompt_cost_source).toBe("given");
    expect(String(given.structuredContent?.interpretation)).toContain(
      "break-even",
    );
    const losing = await call("calculate_cache_metrics", {
      cache_read_tokens: 0,
      cache_write_tokens: 1_000_000,
      uncached_input_tokens: 0,
      base_input_price_per_mtok: 1,
      cache_read_multiplier: 0.1,
      cache_write_multiplier: 1.25,
    });
    expect(losing.structuredContent?.cache_cost_efficiency).toBe(-0.25);
  });

  it("calculate_cache_metrics rejects undefined ratios instead of returning NaN", async () => {
    const zero = await call("calculate_cache_metrics", {
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      uncached_input_tokens: 0,
    });
    expect(zero.isError).toBe(true);
    const noBase = await call("calculate_cache_metrics", {
      cache_read_tokens: 1,
      cache_write_tokens: 0,
      uncached_input_tokens: 0,
      actual_prompt_cost: 1,
    });
    expect(noBase.isError).toBe(true);
    const zeroPrice = await call("calculate_cache_metrics", {
      cache_read_tokens: 1,
      cache_write_tokens: 0,
      uncached_input_tokens: 0,
      base_input_price_per_mtok: 0,
      actual_prompt_cost: 1,
    });
    expect(zeroPrice.isError).toBe(true);
    const negative = await call("calculate_cache_metrics", {
      cache_read_tokens: -1,
      cache_write_tokens: 0,
      uncached_input_tokens: 0,
    });
    expect(negative.isError).toBe(true);
  });

  it("get_provider_cache_snapshot returns dated rows and filters", async () => {
    const all = await call("get_provider_cache_snapshot");
    expect((all.structuredContent?.providers as unknown[]).length).toBe(3);
    const one = await call("get_provider_cache_snapshot", {
      provider: "anthropic",
    });
    const rows = one.structuredContent?.providers as {
      read_charge: string;
      reviewed: string;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.read_charge).toContain("0.1×");
    expect(rows[0]?.reviewed).toContain("Aug 2026");
    expect(
      (await call("get_provider_cache_snapshot", { provider: "zzz" })).isError,
    ).toBe(true);
  });

  it("personas list, filter by stage, and resolve by name", async () => {
    const all = await call("list_personas");
    expect((all.structuredContent?.personas as unknown[]).length).toBe(12);
    expect((all.structuredContent?.stages as unknown[]).length).toBe(3);
    const consumption = await call("list_personas", {
      stage: "consumption",
      core: true,
    });
    const names = (
      consumption.structuredContent?.personas as { slug: string }[]
    ).map((p) => p.slug);
    expect(names).toContain("finops-practitioner");
    const p = await call("get_persona", { persona: "FinOps Practitioner" });
    expect(p.isError).toBeFalsy();
    const links = p.structuredContent?.crosslinks as {
      target: { id: string };
    }[];
    expect(links.map((l) => l.target.id)).toContain("anomaly-management");
    expect(p.structuredContent?.crosswalk).toEqual([]);
    expect((await call("get_persona", { persona: "nobody" })).isError).toBe(
      true,
    );
  });

  it("list_value_categories returns ten categories and five destinations", async () => {
    const res = await call("list_value_categories");
    expect((res.structuredContent?.categories as unknown[]).length).toBe(10);
    expect(
      (res.structuredContent?.booking_destinations as unknown[]).length,
    ).toBe(5);
    const labor = await call("list_value_categories", { group: "labor" });
    expect((labor.structuredContent?.categories as unknown[]).length).toBe(3);
  });

  it("define_term finds definitions and suggests on a miss", async () => {
    const res = await call("define_term", { term: "KV cache" });
    const m = res.structuredContent?.matches as {
      provenance: { document: string };
    }[];
    expect(new Set(m.map((x) => x.provenance.document))).toEqual(
      new Set(["what-is-tokenomics", "cache-explainer"]),
    );
    expect(res.structuredContent?.curriculum_matches).toEqual([]);
    const miss = await call("define_term", { term: "zzzz" });
    expect(miss.isError).toBe(true);
  });

  it("get_focus_ai_tracker filters by bucket and identifier", async () => {
    const all = await call("get_focus_ai_tracker");
    expect(
      (all.structuredContent?.items as unknown[]).length,
    ).toBeGreaterThanOrEqual(10);
    expect(all.content[0]?.text).toContain("In review");
    const cache = await call("get_focus_ai_tracker", {
      identifier: "TokenCacheAction",
    });
    const items = cache.structuredContent?.items as { bucket: string }[];
    expect(items.length).toBeGreaterThan(0);
    const done = await call("get_focus_ai_tracker", { bucket: "done" });
    expect(
      (done.structuredContent?.items as { bucket: string }[]).every(
        (i) => i.bucket === "done",
      ),
    ).toBe(true);
  });

  it("get_crosslinks filters by server and paginates", async () => {
    const fw = await call("get_crosslinks", { server: "framework" });
    const links = fw.structuredContent?.links as { target: { uri: string } }[];
    expect(links.length).toBeGreaterThan(0);
    expect(
      links.every((l) => l.target.uri.startsWith("finops://framework/")),
    ).toBe(true);
    const page = await call("get_crosslinks", { limit: 2 });
    expect(page.structuredContent?.nextCursor).toBeTruthy();
  });

  it("search_tokenomics ranks structured records and filters by type", async () => {
    const res = await call("search_tokenomics", { query: "cache hit rate" });
    const results = res.structuredContent?.results as {
      entity_type: string;
      slug: string;
    }[];
    expect(results[0]?.slug).toBe("cache-hit-rate");
    const only = await call("search_tokenomics", {
      query: "routing",
      entity_types: ["lever"],
    });
    expect(
      (only.structuredContent?.results as { entity_type: string }[]).every(
        (r) => r.entity_type === "lever",
      ),
    ).toBe(true);
    const none = await call("search_tokenomics", { query: "zzqqxx" });
    expect(none.content[0]?.text).toContain("No results");
  });

  it("does not register experimental tools by default", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("get_crosswalk");
    expect(names).not.toContain("list_curriculum_modules");
  });
});

describe("eval-driven refinements", () => {
  it("flags writes exceeding reads and reports the write:read ratio", async () => {
    const res = await call("calculate_cache_metrics", {
      cache_read_tokens: 200000,
      cache_write_tokens: 300000,
      uncached_input_tokens: 500000,
      base_input_price_per_mtok: 3,
      cache_read_multiplier: 0.1,
      cache_write_multiplier: 1.25,
    });
    expect(res.structuredContent?.cache_cost_efficiency).toBe(0.105);
    expect(res.structuredContent?.cache_write_to_read_ratio).toBe(1.5);
    expect(String(res.structuredContent?.interpretation)).toContain(
      "pays back only if that entry is read again",
    );
    const noReads = await call("calculate_cache_metrics", {
      cache_read_tokens: 0,
      cache_write_tokens: 1,
      uncached_input_tokens: 1,
    });
    expect(noReads.structuredContent?.cache_write_to_read_ratio).toBeNull();
  });

  it("define_term prefers exact terms over substrings", async () => {
    const res = await call("define_term", { term: "tokenmaxing" });
    const m = res.structuredContent?.matches as { term: string }[];
    expect(m.map((x) => x.term)).toEqual(["Tokenmaxing"]);
    const partial = await call("define_term", { term: "cache" });
    expect(
      (partial.structuredContent?.matches as unknown[]).length,
    ).toBeGreaterThan(1);
  });

  it("get_crosslinks text names each link's source and flags unratified FOCUS work", async () => {
    const res = await call("get_crosslinks", {
      entity_type: "metric",
      slug: "cache-hit-rate",
    });
    const text = res.content[0]?.text ?? "";
    expect(text).toContain("metric `cache-hit-rate`");
    expect(text).toContain("not in it yet");
    expect(text).toContain("not in any ratified release");
  });

  it("list_layers text shows the layer name next to the summary label", async () => {
    const res = await call("list_layers");
    expect(res.content[0]?.text).toContain(
      "L4 Model management and selection (summary label: “L4 Model and quantization”)",
    );
  });
});

describe("experimental surface", () => {
  it("adds get_crosswalk with an UNOFFICIAL banner, but no curriculum tools without an overlay", async () => {
    const names = (await expClient.listTools()).tools.map((t) => t.name);
    expect(names).toContain("get_crosswalk");
    expect(names).not.toContain("get_curriculum_module");
    const res = await call(
      "get_crosswalk",
      { entity_type: "metric", slug: "cache-hit-rate" },
      expClient,
    );
    expect(res.content[0]?.text).toContain("UNOFFICIAL");
    const entries = res.structuredContent?.entries as {
      official: boolean;
      target: { id: string };
    }[];
    expect(entries.every((e) => e.official === false)).toBe(true);
    expect(entries.map((e) => e.target.id)).toContain("cache-hit-rate");
  });

  it("get_metric and get_persona append crosswalk entries in experimental mode", async () => {
    const m = await call("get_metric", { metric: "cache-hit-rate" }, expClient);
    expect(
      (m.structuredContent?.crosswalk as unknown[]).length,
    ).toBeGreaterThan(0);
    expect(m.content[0]?.text).toContain("UNOFFICIAL");
    const p = await call("get_persona", { persona: "itam-itfm" }, expClient);
    expect((p.structuredContent?.crosswalk as unknown[]).length).toBe(2);
  });

  it("ignores a curriculum overlay unless experimental is on", async () => {
    const c = await connect({ curriculum: OVERLAY });
    const names = (await c.listTools()).tools.map((t) => t.name);
    expect(names).not.toContain("list_curriculum_modules");
  });

  it("curriculum tools serve the overlay with the unofficial banner", async () => {
    const list = await call("list_curriculum_modules", {}, curClient);
    expect(list.content[0]?.text).toContain("UNOFFICIAL");
    expect((list.structuredContent?.modules as unknown[]).length).toBe(1);
    const mod = await call(
      "get_curriculum_module",
      { module: "tk-900", include_slides: true },
      curClient,
    );
    expect(mod.isError).toBeFalsy();
    expect(
      (mod.structuredContent?.module as { slides: unknown[] }).slides,
    ).toHaveLength(1);
    const noSlides = await call(
      "get_curriculum_module",
      { module: "TK-900" },
      curClient,
    );
    expect(
      (noSlides.structuredContent?.module as { slides: unknown[] }).slides,
    ).toHaveLength(0);
    expect(
      (await call("get_curriculum_module", { module: "TK-1" }, curClient))
        .isError,
    ).toBe(true);
    const nums = await call("get_numbers_register", { query: "34" }, curClient);
    expect((nums.structuredContent?.numbers as unknown[]).length).toBe(1);
    const term = await call("define_term", { term: "prompt cache" }, curClient);
    expect(
      (term.structuredContent?.curriculum_matches as unknown[]).length,
    ).toBe(1);
    expect(term.content[0]?.text).toContain("UNOFFICIAL");
    const info = await call("get_tokenomics_info", {}, curClient);
    expect(info.structuredContent?.curriculum_loaded).toBe(true);
  });
});

describe("resources", () => {
  it("serves fixed resources and templates", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    for (const u of [
      "start",
      "bigt",
      "glossary",
      "focus-tracker",
      "meta/manifest",
    ]) {
      expect(uris).toContain(`tokenomics://overview/${u}`);
    }
    const start = await client.readResource({
      uri: "tokenomics://overview/start",
    });
    expect(textOf(start)).toContain("Start here");
    const manifest = await client.readResource({
      uri: "tokenomics://overview/meta/manifest",
    });
    expect(JSON.parse(textOf(manifest)).data_version).toBe(
      artifact.manifest.data_version,
    );
    for (const uri of [
      "tokenomics://overview/documents/cache-explainer",
      "tokenomics://overview/layers/l5",
      "tokenomics://overview/bigt/t-n-k",
      "tokenomics://overview/levers/bigt-model-routing",
      "tokenomics://overview/metrics/cache-cost-efficiency",
      "tokenomics://overview/personas/engineering",
      "tokenomics://overview/bigt",
      "tokenomics://overview/glossary",
      "tokenomics://overview/focus-tracker",
    ]) {
      const r = await client.readResource({ uri });
      expect(textOf(r), uri).toContain("CC BY 4.0");
    }
  });

  it("unknown template slugs fail with -32002 and suggestions", async () => {
    await expect(
      client.readResource({
        uri: "tokenomics://overview/metrics/cache-hit-rat",
      }),
    ).rejects.toThrow(/cache-hit-rate/);
  });

  it("completes template slugs", async () => {
    const res = await client.complete({
      ref: {
        type: "ref/resource",
        uri: "tokenomics://overview/metrics/{slug}",
      },
      argument: { name: "slug", value: "cache" },
    });
    expect(res.completion.values).toContain("cache-hit-rate");
  });

  it("experimental resources render crosswalk on metrics", async () => {
    const r = await expClient.readResource({
      uri: "tokenomics://overview/metrics/cache-hit-rate",
    });
    expect(textOf(r)).toContain("UNOFFICIAL");
    const s = await curClient.readResource({
      uri: "tokenomics://overview/start",
    });
    expect(textOf(s)).toContain("curriculum overlay");
  });
});

describe("prompts", () => {
  it("lists and renders all three prompts with embedded resources", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual([
      "assess_prompt_caching",
      "bigt_review",
      "optimize_consumption",
    ]);
    const opt = await client.getPrompt({
      name: "optimize_consumption",
      arguments: { workload: "support agent with 3 sub-agents" },
    });
    expect(opt.messages.some((m) => m.content.type === "resource")).toBe(true);
    const cache = await client.getPrompt({
      name: "assess_prompt_caching",
      arguments: {},
    });
    expect(cache.messages.length).toBe(4);
    const withWorkload = await client.getPrompt({
      name: "assess_prompt_caching",
      arguments: { workload: "chat app" },
    });
    expect(JSON.stringify(withWorkload.messages[0])).toContain("chat app");
    const review = await client.getPrompt({
      name: "bigt_review",
      arguments: {
        architecture: "orchestrator + workers",
        suspected_class: "T(n·k)",
      },
    });
    expect(JSON.stringify(review.messages[0])).toContain("T(n·k)");
  });

  it("completes the bigt_review suspected_class argument", async () => {
    const res = await client.complete({
      ref: { type: "ref/prompt", name: "bigt_review" },
      argument: { name: "suspected_class", value: "T(n" },
    });
    expect(res.completion.values).toContain("T(n·k·a)");
  });
});

describe("outputSchema conformance", () => {
  it("every tool's structuredContent conforms to its declared outputSchema", async () => {
    const { tools } = await curClient.listTools();
    const schemaByName = new Map(
      tools.map((t) => [t.name, t.outputSchema as Record<string, unknown>]),
    );
    const calls: [string, Record<string, unknown>][] = [
      ["get_tokenomics_info", {}],
      ["list_documents", {}],
      [
        "get_document",
        { document: "cache-explainer", section: "tcmonitoring" },
      ],
      ["list_layers", {}],
      ["get_layer", { layer: "l4" }],
      ["get_bigt_notation", {}],
      ["get_bigt_class", { class: "T(1)" }],
      ["list_levers", {}],
      ["get_lever", { lever: "l3-prefix-and-kv-cache" }],
      ["list_metrics", {}],
      ["get_metric", { metric: "cache-cost-efficiency" }],
      [
        "calculate_cache_metrics",
        {
          cache_read_tokens: 10,
          cache_write_tokens: 5,
          uncached_input_tokens: 5,
          base_input_price_per_mtok: 3,
          actual_prompt_cost: 0.00001,
        },
      ],
      ["get_provider_cache_snapshot", {}],
      ["list_personas", {}],
      ["get_persona", { persona: "engineering" }],
      ["list_value_categories", {}],
      ["define_term", { term: "tokenmaxing" }],
      ["get_focus_ai_tracker", { bucket: "flight" }],
      ["get_crosslinks", {}],
      ["search_tokenomics", { query: "quantization" }],
      ["get_crosswalk", {}],
      ["list_curriculum_modules", {}],
      ["get_curriculum_module", { module: "TK-900", include_slides: true }],
      ["get_numbers_register", {}],
    ];
    const check = (
      value: unknown,
      schema: Record<string, unknown> | undefined,
      path: string,
    ): string[] => {
      if (!schema || typeof value !== "object" || value === null) return [];
      if (schema.type === "array" && Array.isArray(value)) {
        return value.flatMap((v, i) =>
          check(v, schema.items as Record<string, unknown>, `${path}[${i}]`),
        );
      }
      if (schema.type !== "object" || Array.isArray(value)) return [];
      const props = (schema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      const additional = schema.additionalProperties;
      return Object.entries(value as Record<string, unknown>).flatMap(
        ([k, v]) => {
          if (k in props) return check(v, props[k], `${path}.${k}`);
          if (typeof additional === "object") {
            return check(
              v,
              additional as Record<string, unknown>,
              `${path}.${k}`,
            );
          }
          return additional === true
            ? []
            : [`${path}.${k} emitted but not declared`];
        },
      );
    };
    const covered = new Set(calls.map(([n]) => n));
    for (const t of tools) {
      expect(
        covered.has(t.name),
        `${t.name} not covered by conformance test`,
      ).toBe(true);
    }
    for (const [name, args] of calls) {
      const res = await call(name, args, curClient);
      expect(
        res.isError,
        `${name} errored: ${res.content[0]?.text}`,
      ).toBeFalsy();
      const problems = check(
        res.structuredContent,
        schemaByName.get(name),
        name,
      );
      expect(problems, problems.join("; ")).toEqual([]);
    }
  });
});
