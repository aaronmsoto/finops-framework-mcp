import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { nearestMatches, slugify } from "../../shared/slugs.js";
import type { TokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import type { CurriculumOverlay } from "../../shared/tokenomics/curriculum.js";
import type {
  TkBigTClass,
  TkCrossLink,
  TkCrosswalkEntry,
  TkEntityType,
  TkLayer,
  TkLever,
  TkMetric,
  TkPersona,
} from "../../shared/tokenomics/types.js";
import {
  cursorContext,
  err,
  isErr,
  ok,
  paginate,
  RO,
  type ToolResult,
} from "../../shared/tools.js";
import {
  bigtClassMd,
  bigtLadderMd,
  CROSSWALK_BANNER,
  CURRICULUM_BANNER,
  docBySlug,
  documentMd,
  focusTrackerMd,
  footer,
  layerMd,
  leverMd,
  linksMd,
  metricMd,
  personaMd,
  sourcesFooter,
  statusLine,
} from "./render.js";
import { buildSearchIndex, search, SEARCH_ENTITY_TYPES } from "./search.js";
import { URI } from "./uris.js";

export interface ToolOptions {
  experimental: boolean;
  curriculum: CurriculumOverlay | null;
}

// ---- output record schemas (mirror src/shared/tokenomics/types.ts) --------

const provenance = z.object({
  document: z.string(),
  section: z.string().nullable(),
  source_url: z.string(),
  license: z.literal("CC-BY-4.0"),
});
const docRow = z.object({
  slug: z.string(),
  title: z.string(),
  kind: z.string(),
  status: z.string(),
  status_source: z.enum(["page", "registry"]),
  status_date: z.string().nullable(),
  modified: z.string().nullable(),
  url: z.string(),
  uri: z.string(),
});
const layerRow = z.object({
  slug: z.string(),
  number: z.number(),
  name: z.string(),
  table_label: z.string(),
  multiplier_effect: z.string(),
  moves_multiplier: z.boolean(),
  key_metric: z.string(),
  primary_levers: z.array(z.string()),
  uri: z.string(),
});
const leverRecord = z.object({
  slug: z.string(),
  name: z.string(),
  kind: z.string(),
  layer: z.number().nullable(),
  bigt_classes: z.array(z.string()),
  description_md: z.string(),
  effect: z.string().nullable(),
  provenance,
});
const classRecord = z.object({
  slug: z.string(),
  order: z.number(),
  notation: z.string(),
  name: z.string(),
  headline: z.string(),
  description: z.string(),
  fix: z.string(),
  provenance,
});
const metricRecord = z.object({
  slug: z.string(),
  name: z.string(),
  formula: z.string().nullable(),
  formula_text: z.string().nullable(),
  definition_md: z.string(),
  targets: z.array(z.string()),
  inputs: z.array(z.string()),
  provenance,
});
const target = z.object({
  server: z.enum(["framework", "focus", "focus-working-draft"]),
  kind: z.string(),
  id: z.string(),
  uri: z.string().nullable(),
});
const fromRef = z.object({ type: z.string(), slug: z.string() });
const crossLink = z.object({
  from: fromRef,
  target,
  evidence: z.string(),
  document: z.string(),
  source_url: z.string(),
  official: z.literal(true),
});
const crosswalkEntry = z.object({
  from: fromRef,
  target,
  rationale: z.string(),
  official: z.literal(false),
});
const personaRecord = z.object({
  slug: z.string(),
  name: z.string(),
  core: z.boolean(),
  stages: z.array(z.string()),
  responsibility: z.string(),
  description_md: z.string(),
  signals: z.array(z.string()),
  provenance,
});
const focusItem = z.object({
  slug: z.string(),
  title: z.string(),
  bucket: z.enum(["done", "flight", "consider", "out"]),
  kind: z.string(),
  labels: z.array(z.string()),
  identifiers: z.array(z.string()),
  body_md: z.string(),
  links: z.array(z.string()),
  provenance,
});

const LEVER_KINDS = [
  "stack-primary-lever",
  "bigt-lever",
  "architectural-approach",
  "worked-example-step",
] as const;
const ENTITY_TYPES = [
  "document",
  "stage",
  "layer",
  "bigt-class",
  "lever",
  "metric",
  "persona",
  "value-category",
  "glossary-term",
  "focus-item",
] as const;

/** Accepts "T(n·k)", "T(n * k)", "n*k", "nk", "multiplicative", "t-n-k". */
export function resolveBigTClass(
  classes: TkBigTClass[],
  input: string,
): TkBigTClass | null {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/∞|infinity|inf\b/g, "inf")
      .replace(/^t\(|\)$/g, "")
      .replace(/^t-/, "")
      .replace(/[\s·*×.-]/g, "");
  const needle = norm(input.trim());
  return (
    classes.find(
      (c) =>
        c.slug === input.trim().toLowerCase() ||
        norm(c.notation) === needle ||
        c.name.toLowerCase() === input.trim().toLowerCase(),
    ) ?? null
  );
}

export function registerTools(
  server: McpServer,
  a: TokenomicsArtifact,
  opts: ToolOptions,
): void {
  const index = buildSearchIndex(a);
  const dv = a.manifest.data_version;
  const crosswalkFor = (
    type: TkEntityType,
    slug: string,
  ): TkCrosswalkEntry[] =>
    opts.experimental
      ? a.crosswalk.filter((c) => c.from.type === type && c.from.slug === slug)
      : [];
  const linksFor = (type: TkEntityType, slug: string): TkCrossLink[] =>
    a.crosslinks.filter((l) => l.from.type === type && l.from.slug === slug);
  const unknown = (
    kind: string,
    input: string,
    slugs: string[],
    hint: string,
  ) => {
    const near = nearestMatches(input, slugs);
    return err(
      `Unknown ${kind} "${input}".` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
        ` ${hint}`,
    );
  };
  const link = (uri: string, name: string, description: string) => ({
    type: "resource_link" as const,
    uri,
    name,
    description,
    mimeType: "text/markdown",
  });

  function findLayer(input: string): TkLayer | ToolResult {
    const s = input.trim().toLowerCase();
    const n = /^l?(\d)$/.exec(s)?.[1];
    const hit = a.layers.find(
      (l) =>
        l.slug === s ||
        (n !== undefined && l.number === Number(n)) ||
        slugify(l.name) === slugify(s) ||
        slugify(l.table_label) === slugify(s),
    );
    return (
      hit ??
      unknown(
        "layer",
        input,
        a.layers.map((l) => l.slug),
        "Use list_layers (l1…l5).",
      )
    );
  }
  function findMetric(input: string): TkMetric | ToolResult {
    const s = slugify(input);
    return (
      a.metrics.find((m) => m.slug === s || slugify(m.name) === s) ??
      unknown(
        "metric",
        input,
        a.metrics.map((m) => m.slug),
        "Use list_metrics.",
      )
    );
  }
  function findLever(input: string): TkLever | ToolResult {
    const s = slugify(input);
    return (
      a.levers.find((l) => l.slug === s || slugify(l.name) === s) ??
      unknown(
        "lever",
        input,
        a.levers.map((l) => l.slug),
        "Use list_levers.",
      )
    );
  }
  function findPersona(input: string): TkPersona | ToolResult {
    const s = slugify(input);
    return (
      a.personas.find((p) => p.slug === s || slugify(p.name) === s) ??
      unknown(
        "persona",
        input,
        a.personas.map((p) => p.slug),
        "Use list_personas.",
      )
    );
  }
  const provenanceOf = new Map<string, string>([
    ...a.layers.map((x) => [`layer:${x.slug}`, x.provenance.document] as const),
    ...a.bigt.classes.map(
      (x) => [`bigt-class:${x.slug}`, x.provenance.document] as const,
    ),
    ...a.levers.map((x) => [`lever:${x.slug}`, x.provenance.document] as const),
    ...a.metrics.map(
      (x) => [`metric:${x.slug}`, x.provenance.document] as const,
    ),
    ...a.personas.map(
      (x) => [`persona:${x.slug}`, x.provenance.document] as const,
    ),
    ...a.value.categories.map(
      (x) => [`value-category:${x.slug}`, x.provenance.document] as const,
    ),
    ...a.glossary.map(
      (x) => [`glossary-term:${x.slug}`, x.provenance.document] as const,
    ),
    ...a.focusTracker.map(
      (x) => [`focus-item:${x.slug}`, x.provenance.document] as const,
    ),
  ]);
  const docOfHit = (type: string, slug: string): string =>
    type === "document-section"
      ? (slug.split("#")[0] ?? slug)
      : (provenanceOf.get(`${type}:${slug}`) ?? "");
  const docRowOf = (slug: string) => {
    const d = docBySlug(a, slug);
    return {
      slug: d.slug,
      title: d.title,
      kind: d.kind,
      status: d.status,
      status_source: d.status_source,
      status_date: d.status_date,
      modified: d.modified,
      url: d.url,
      uri: URI.document(d.slug),
    };
  };
  const layerRowOf = (l: TkLayer) => ({
    slug: l.slug,
    number: l.number,
    name: l.name,
    table_label: l.table_label,
    multiplier_effect: l.multiplier_effect,
    moves_multiplier: l.moves_multiplier,
    key_metric: l.key_metric,
    primary_levers: l.primary_levers,
    uri: URI.layer(l.slug),
  });

  // ---- get_tokenomics_info -------------------------------------------------
  server.registerTool(
    "get_tokenomics_info",
    {
      title: "Tokenomics server overview",
      description:
        "Start here. Data version, entity counts, and every source document with its publication status (Working Draft, Release Candidate, …). No parameters.",
      inputSchema: {},
      outputSchema: {
        data_version: z.string(),
        crawled_at: z.string(),
        counts: z.record(z.string(), z.number()),
        documents: z.array(docRow),
        experimental: z.boolean(),
        curriculum_loaded: z.boolean(),
        start_here: z.array(z.string()),
      },
      annotations: RO,
    },
    () => {
      const documents = a.documents.map((d) => docRowOf(d.slug));
      const start_here = [
        "get_bigt_notation — classify how a workload's token cost grows",
        "list_layers — the Five-Layer Stack and where each lever sits",
        "get_metric cache-hit-rate / calculate_cache_metrics — measure prompt caching",
        "get_crosslinks — hop to finops:// (FinOps Framework) and focus:// (FOCUS) servers",
      ];
      return ok(
        {
          data_version: dv,
          crawled_at: a.manifest.crawled_at,
          counts: a.manifest.counts,
          documents,
          experimental: opts.experimental,
          curriculum_loaded: opts.curriculum !== null,
          start_here,
        },
        `Tokenomics Foundation data v${dv} (crawled ${a.manifest.crawled_at.slice(0, 10)}). Sources are mostly drafts and release candidates — cite the status.\n\n` +
          documents
            .map(
              (d) =>
                `- ${d.title} — ${d.status}${d.status_date ? ` (${d.status_date})` : ""} [${d.slug}]`,
            )
            .join("\n") +
          `\n\nStart here:\n${start_here.map((s) => `- ${s}`).join("\n")}` +
          footer(a, "https://www.tokeneconomics.com/"),
      );
    },
  );

  // ---- list_documents / get_document ---------------------------------------
  server.registerTool(
    "list_documents",
    {
      title: "List Tokenomics Foundation source documents",
      description:
        "Every ingested tokeneconomics.com document with kind (docs/project/paper/insight), publication status, and section ids for get_document. Optional `kind` filter.",
      inputSchema: {
        kind: z.enum(["docs", "project", "paper", "insight"]).optional(),
      },
      outputSchema: {
        documents: z.array(
          docRow.extend({
            sections: z.array(z.object({ id: z.string(), title: z.string() })),
          }),
        ),
      },
      annotations: RO,
    },
    ({ kind }) => {
      const docs = a.documents
        .filter((d) => !kind || d.kind === kind)
        .map((d) => ({ ...docRowOf(d.slug), sections: d.sections }));
      return ok(
        { documents: docs },
        docs
          .map(
            (d) =>
              `- **${d.title}** (\`${d.slug}\`, ${d.kind}) — ${d.status}\n  sections: ${d.sections.map((s) => s.id).join(", ")}`,
          )
          .join("\n") + footer(a, "https://www.tokeneconomics.com/"),
      );
    },
  );

  server.registerTool(
    "get_document",
    {
      title: "Get a source document (or one section)",
      description:
        "Canonical markdown of one Tokenomics Foundation document, prefixed with its publication status and followed by CC BY attribution. Pass `section` (an id from list_documents) to get one section instead of the whole document — prefer this for long papers and podcast transcripts.",
      inputSchema: {
        document: z.string().describe("Document slug, e.g. 'cache-explainer'"),
        section: z
          .string()
          .optional()
          .describe("Section id, e.g. 'tcmonitoring'"),
      },
      outputSchema: {
        document: docRow,
        section: z.object({ id: z.string(), title: z.string() }).nullable(),
      },
      annotations: RO,
    },
    ({ document, section }) => {
      const d = a.documents.find((x) => x.slug === slugify(document));
      if (!d) {
        return unknown(
          "document",
          document,
          a.documents.map((x) => x.slug),
          "Use list_documents.",
        );
      }
      let sec: { id: string; title: string } | null = null;
      if (section) {
        sec =
          d.sections.find((s) => s.id === section.trim().toLowerCase()) ?? null;
        if (!sec) {
          return unknown(
            `section of ${d.slug}`,
            section,
            d.sections.map((s) => s.id),
            `Valid: ${d.sections.map((s) => s.id).join(", ")}.`,
          );
        }
      }
      return {
        content: [
          { type: "text", text: documentMd(a, d, sec?.id) },
          link(URI.document(d.slug), d.slug, `Full ${d.title} document`),
        ],
        structuredContent: { document: docRowOf(d.slug), section: sec },
      } as ToolResult;
    },
  );

  // ---- layers ----------------------------------------------------------------
  server.registerTool(
    "list_layers",
    {
      title: "List the Five-Layer Tokenomics Stack",
      description:
        "The five layers (L1 Silicon … L5 Routing and governance) with the published summary: whether each moves the Big-T multiplier, its key metric, and its primary levers. Lower layers set what a token costs; upper layers decide how many tokens you spend.",
      inputSchema: {},
      outputSchema: { layers: z.array(layerRow), status: z.string() },
      annotations: RO,
    },
    () => {
      const rows = a.layers.map(layerRowOf);
      const d = docBySlug(a, "five-layer-stack-paper");
      return ok(
        { layers: rows, status: statusLine(d) },
        `| Layer | Moves the multiplier? | Key metric | Primary levers |\n| --- | --- | --- | --- |\n` +
          rows
            .map(
              (l) =>
                `| L${l.number} ${l.name} (summary label: “${l.table_label}”) | ${l.multiplier_effect} | ${l.key_metric} | ${l.primary_levers.join("; ")} |`,
            )
            .join("\n") +
          `\n\n_${statusLine(d)}_` +
          footer(a, d.url),
      );
    },
  );

  server.registerTool(
    "get_layer",
    {
      title: "Get one stack layer",
      description:
        "One layer of the Five-Layer Stack: description, components, published tooling table, and the levers that sit at it. `layer` accepts 'l3', '3', 'L3', or the layer name ('inference stack').",
      inputSchema: {
        layer: z.string().describe("e.g. 'l3' or 'inference stack'"),
      },
      outputSchema: {
        layer: layerRow.extend({
          description_md: z.string(),
          components: z.array(
            z.object({ name: z.string(), items: z.array(z.string()) }),
          ),
          tooling_md: z.string().nullable(),
          provenance,
        }),
        levers: z.array(
          z.object({ slug: z.string(), name: z.string(), kind: z.string() }),
        ),
      },
      annotations: RO,
    },
    ({ layer }) => {
      const l = findLayer(layer);
      if (isErr(l)) return l;
      const levers = a.levers.filter((x) => x.layer === l.number);
      return {
        content: [
          { type: "text", text: layerMd(a, l, levers) },
          link(URI.layer(l.slug), l.slug, `L${l.number} ${l.name}`),
        ],
        structuredContent: {
          layer: {
            ...layerRowOf(l),
            description_md: l.description_md,
            components: l.components,
            tooling_md: l.tooling_md,
            provenance: l.provenance,
          },
          levers: levers.map((x) => ({
            slug: x.slug,
            name: x.name,
            kind: x.kind,
          })),
        },
      } as ToolResult;
    },
  );

  // ---- Big-T -------------------------------------------------------------------
  server.registerTool(
    "get_bigt_notation",
    {
      title: "Big-T notation (T-notation) overview",
      description:
        "Big-T notation, 'Big-O for AI consumption': T(n · k · a) = requests × model calls per request × agent depth, and the six-class complexity ladder from T(1) to T(∞), each with its published fix. Use it to classify how a workload's token cost grows before optimizing constants.",
      inputSchema: {},
      outputSchema: {
        notation: z.string(),
        expansion: z.string(),
        variables: z.array(
          z.object({
            symbol: z.string(),
            name: z.string(),
            description: z.string(),
          }),
        ),
        classes: z.array(classRecord),
        status: z.string(),
      },
      annotations: RO,
    },
    () => {
      const d = docBySlug(a, "big-t-notation");
      return ok(
        {
          notation: a.bigt.notation,
          expansion: a.bigt.expansion,
          variables: a.bigt.variables.map((v) => ({
            symbol: v.symbol,
            name: v.name,
            description: v.description,
          })),
          classes: a.bigt.classes,
          status: statusLine(d),
        },
        bigtLadderMd(a),
      );
    },
  );

  server.registerTool(
    "get_bigt_class",
    {
      title: "Get one Big-T complexity class",
      description:
        "One rung of the Big-T ladder: what puts a workload in it, the published fix, the stack layers whose levers move it, and the levers tagged with it. `class` accepts 'T(n·k)', 'n*k', 'nk', 'multiplicative', or a slug like 't-n-k'.",
      inputSchema: {
        class: z.string().describe("e.g. 'T(n·k·a)' or 'agent-multiplicative'"),
      },
      outputSchema: {
        class: classRecord,
        moved_by_layers: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            multiplier_effect: z.string(),
          }),
        ),
        levers: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            kind: z.string(),
            effect: z.string().nullable(),
          }),
        ),
      },
      annotations: RO,
    },
    (args) => {
      const c = resolveBigTClass(a.bigt.classes, args.class);
      if (!c) {
        return err(
          `Unknown Big-T class "${args.class}". Valid: ${a.bigt.classes.map((x) => x.notation).join(", ")}.`,
        );
      }
      const levers = a.levers.filter((l) => l.bigt_classes.includes(c.slug));
      const layers = a.layers.filter((l) =>
        l.multiplier_effect.includes(c.notation),
      );
      return {
        content: [
          { type: "text", text: bigtClassMd(a, c, levers, layers) },
          link(URI.bigtClass(c.slug), c.slug, `${c.notation} ${c.name}`),
        ],
        structuredContent: {
          class: c,
          moved_by_layers: layers.map((l) => ({
            slug: l.slug,
            name: l.name,
            multiplier_effect: l.multiplier_effect,
          })),
          levers: levers.map((l) => ({
            slug: l.slug,
            name: l.name,
            kind: l.kind,
            effect: l.effect,
          })),
        },
      } as ToolResult;
    },
  );

  // ---- levers ------------------------------------------------------------------
  server.registerTool(
    "list_levers",
    {
      title: "List consumption and efficiency levers",
      description:
        "Optimization levers as the Foundation publishes them: the stack's primary levers per layer (caching, batching, right-sizing, quantization, complexity routing, budgets, agent caps…), Big-T's five levers (routing, serialization, caching, abstraction transparency, governance), architectural approaches with published token reductions, and the 34× worked-example steps. Filter by `layer` (1-5), `bigt_class`, `kind`, or `document`.",
      inputSchema: {
        layer: z.number().int().min(1).max(5).optional(),
        bigt_class: z.string().optional().describe("e.g. 'T(n·k)'"),
        kind: z.enum(LEVER_KINDS).optional(),
        document: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(100),
        cursor: z.string().optional(),
      },
      outputSchema: {
        levers: z.array(leverRecord.extend({ uri: z.string() })),
        total: z.number(),
        nextCursor: z.string().optional(),
      },
      annotations: RO,
    },
    ({ layer, bigt_class, kind, document, limit, cursor }) => {
      let rows = a.levers;
      if (layer !== undefined) rows = rows.filter((l) => l.layer === layer);
      if (bigt_class) {
        const c = resolveBigTClass(a.bigt.classes, bigt_class);
        if (!c)
          return err(
            `Unknown Big-T class "${bigt_class}". Valid: ${a.bigt.classes.map((x) => x.notation).join(", ")}.`,
          );
        rows = rows.filter((l) => l.bigt_classes.includes(c.slug));
      }
      if (kind) rows = rows.filter((l) => l.kind === kind);
      if (document)
        rows = rows.filter((l) => l.provenance.document === slugify(document));
      const pg = paginate(
        rows,
        limit ?? 100,
        cursor,
        cursorContext("list_levers", { layer, bigt_class, kind, document }),
        dv,
      );
      if (isErr(pg)) return pg;
      const page = pg.page.map((l) => ({ ...l, uri: URI.lever(l.slug) }));
      return ok(
        {
          levers: page,
          total: rows.length,
          ...(pg.nextCursor ? { nextCursor: pg.nextCursor } : {}),
        },
        `${rows.length} lever(s):\n` +
          page
            .map(
              (l) =>
                `- **${l.name}** (\`${l.slug}\`, ${l.kind}${l.layer !== null ? `, L${l.layer}` : ""}${l.bigt_classes.length ? `, ${l.bigt_classes.join("/")}` : ""})${l.effect ? ` — ${l.effect}` : ""} [${l.provenance.document}]`,
            )
            .join("\n") +
          sourcesFooter(
            a,
            page.map((l) => l.provenance.document),
          ),
      );
    },
  );

  server.registerTool(
    "get_lever",
    {
      title: "Get one lever",
      description:
        "Full record for one optimization lever, with provenance and status. Look up by slug or name from list_levers.",
      inputSchema: { lever: z.string() },
      outputSchema: { lever: leverRecord, uri: z.string() },
      annotations: RO,
    },
    ({ lever }) => {
      const l = findLever(lever);
      if (isErr(l)) return l;
      return {
        content: [{ type: "text", text: leverMd(a, l) }],
        structuredContent: { lever: l, uri: URI.lever(l.slug) },
      } as ToolResult;
    },
  );

  // ---- metrics -----------------------------------------------------------------
  server.registerTool(
    "list_metrics",
    {
      title: "List reference metrics",
      description:
        "The Foundation's reference metrics with their published formulas: Cache Hit Rate, Cache Cost Efficiency and uncached equivalent cost (cache explainer), net benefit and risk expected loss (value classification), cost per token (definition), and AI unit economics (TCA over realized value, a proposal).",
      inputSchema: {},
      outputSchema: {
        metrics: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            formula: z.string().nullable(),
            formula_text: z.string().nullable(),
            document: z.string(),
            status: z.string(),
            uri: z.string(),
          }),
        ),
      },
      annotations: RO,
    },
    () => {
      const rows = a.metrics.map((m) => ({
        slug: m.slug,
        name: m.name,
        formula: m.formula,
        formula_text: m.formula_text,
        document: m.provenance.document,
        status: docBySlug(a, m.provenance.document).status,
        uri: URI.metric(m.slug),
      }));
      return ok(
        { metrics: rows },
        rows
          .map(
            (m) =>
              `- **${m.name}** (\`${m.slug}\`, ${m.status}): ${m.formula ?? `“${m.formula_text}”`}`,
          )
          .join("\n") +
          sourcesFooter(
            a,
            rows.map((m) => m.document),
          ),
      );
    },
  );

  server.registerTool(
    "get_metric",
    {
      title: "Get one reference metric",
      description:
        "One metric's published formula, definition, inputs, 'what good looks like' targets, and its cross-links to the FinOps Framework / FOCUS servers. E.g. 'cache-hit-rate', 'cache-cost-efficiency'.",
      inputSchema: { metric: z.string() },
      outputSchema: {
        metric: metricRecord,
        crosslinks: z.array(crossLink),
        crosswalk: z.array(crosswalkEntry),
        uri: z.string(),
      },
      annotations: RO,
    },
    ({ metric }) => {
      const m = findMetric(metric);
      if (isErr(m)) return m;
      const links = linksFor("metric", m.slug);
      const cw = crosswalkFor("metric", m.slug);
      return {
        content: [
          { type: "text", text: metricMd(a, m, links, cw) },
          link(URI.metric(m.slug), m.slug, m.name),
        ],
        structuredContent: {
          metric: m,
          crosslinks: links,
          crosswalk: cw,
          uri: URI.metric(m.slug),
        },
      } as ToolResult;
    },
  );

  const nonNeg = z.number().finite().min(0);
  server.registerTool(
    "calculate_cache_metrics",
    {
      title: "Calculate Cache Hit Rate and Cache Cost Efficiency",
      description:
        "Applies the cache explainer's published formulas to YOUR token counts. Cache hit rate = cache read / (cache read + cache write + uncached input). Cache cost efficiency = 1 − actual prompt cost / uncached equivalent cost, where uncached equivalent cost = (cache read + cache write + uncached input) × base input price. Give token counts; add `base_input_price_per_mtok` plus either `actual_prompt_cost` or the read/write multipliers (e.g. 0.1 and 1.25) to also get cost efficiency. Compare per workload, not blended.",
      inputSchema: {
        cache_read_tokens: nonNeg,
        cache_write_tokens: nonNeg,
        uncached_input_tokens: nonNeg,
        base_input_price_per_mtok: nonNeg
          .optional()
          .describe("Base (uncached) input price per million tokens"),
        cache_read_multiplier: nonNeg
          .optional()
          .describe("Cache read price as a multiple of base input, e.g. 0.1"),
        cache_write_multiplier: nonNeg
          .optional()
          .describe("Cache write price as a multiple of base input, e.g. 1.25"),
        actual_prompt_cost: nonNeg
          .optional()
          .describe("Actual billed prompt (input-side) cost, if known"),
      },
      outputSchema: {
        cache_hit_rate: z.number(),
        total_input_tokens: z.number(),
        uncached_equivalent_cost: z.number().nullable(),
        actual_prompt_cost: z.number().nullable(),
        actual_prompt_cost_source: z.enum(["given", "computed", "unavailable"]),
        cache_cost_efficiency: z.number().nullable(),
        cache_write_to_read_ratio: z.number().nullable(),
        interpretation: z.string(),
        formulas: z.array(z.string()),
      },
      annotations: RO,
    },
    (x) => {
      const total =
        x.cache_read_tokens + x.cache_write_tokens + x.uncached_input_tokens;
      if (!Number.isFinite(total)) {
        return err("Token counts are too large to sum as finite numbers.");
      }
      const oneMultiplier =
        (x.cache_read_multiplier === undefined) !==
        (x.cache_write_multiplier === undefined);
      if (oneMultiplier) {
        return err(
          "Give both cache_read_multiplier and cache_write_multiplier (or neither and pass actual_prompt_cost); with only one, the actual prompt cost cannot be computed.",
        );
      }
      if (total <= 0) {
        return err(
          "All token counts are zero: cache hit rate is undefined (0/0). Provide at least one non-zero bucket.",
        );
      }
      const hit = x.cache_read_tokens / total;
      let uec: number | null = null;
      let actual: number | null = null;
      let source: "given" | "computed" | "unavailable" = "unavailable";
      if (x.base_input_price_per_mtok !== undefined) {
        uec = (total * x.base_input_price_per_mtok) / 1_000_000;
        if (x.actual_prompt_cost !== undefined) {
          actual = x.actual_prompt_cost;
          source = "given";
        } else if (
          x.cache_read_multiplier !== undefined &&
          x.cache_write_multiplier !== undefined
        ) {
          actual =
            ((x.cache_read_tokens * x.cache_read_multiplier +
              x.cache_write_tokens * x.cache_write_multiplier +
              x.uncached_input_tokens) *
              x.base_input_price_per_mtok) /
            1_000_000;
          source = "computed";
        }
      } else if (
        x.actual_prompt_cost !== undefined ||
        x.cache_read_multiplier !== undefined ||
        x.cache_write_multiplier !== undefined
      ) {
        return err(
          "Cache cost efficiency needs base_input_price_per_mtok (for the uncached equivalent cost). Add it, or drop the cost inputs to get cache hit rate only.",
        );
      }
      let cce: number | null = null;
      if (uec !== null && actual !== null) {
        if (uec === 0) {
          return err(
            "Uncached equivalent cost is zero (base input price 0), so cache cost efficiency is undefined.",
          );
        }
        cce = 1 - actual / uec;
      }
      const round = (v: number) => Math.round(v * 1e6) / 1e6;
      const interpretation =
        cce === null
          ? `Cache hit rate ${(hit * 100).toFixed(1)}% (coverage). Add prices to measure payback (cache cost efficiency).`
          : `Cache hit rate ${(hit * 100).toFixed(1)}%; cache cost efficiency ${(cce * 100).toFixed(1)}% — ` +
            (cce > 0
              ? "positive: caching avoided that share of prompt spend. The page's target is 'clearly above zero'; a workload hovering just over zero is doing payback-once work (rare hits, prompt ordering, short sessions)."
              : cce === 0
                ? "exactly break-even: the write premium is only just repaid."
                : "negative: caching is costing more than it saves (writes not read back enough).");
      const writeRead =
        x.cache_read_tokens > 0
          ? x.cache_write_tokens / x.cache_read_tokens
          : null;
      const cachePage = a.documentBodies.get("cache-explainer") ?? "";
      const writeFlag =
        x.cache_write_tokens > x.cache_read_tokens
          ? ` Cache writes (${x.cache_write_tokens}) exceed cache reads (${x.cache_read_tokens})` +
            (cachePage.includes("pays back only if that entry is read again")
              ? ": per the cache explainer, a write “pays back only if that entry is read again, ideally many times.”"
              : ".")
          : "";
      const metrics = [
        "cache-hit-rate",
        "cache-cost-efficiency",
        "uncached-equivalent-cost",
      ]
        .map((s) => a.metrics.find((m) => m.slug === s)?.formula)
        .filter((f): f is string => typeof f === "string");
      const d = docBySlug(a, "cache-explainer");
      const structured = {
        cache_hit_rate: round(hit),
        total_input_tokens: total,
        uncached_equivalent_cost: uec === null ? null : round(uec),
        actual_prompt_cost: actual === null ? null : round(actual),
        actual_prompt_cost_source: source,
        cache_cost_efficiency: cce === null ? null : round(cce),
        cache_write_to_read_ratio: writeRead === null ? null : round(writeRead),
        interpretation: interpretation + writeFlag,
        formulas: metrics,
      };
      return ok(
        structured,
        `${interpretation}${writeFlag}\n\n` +
          `- cache hit rate: ${structured.cache_hit_rate}\n` +
          (uec !== null
            ? `- uncached equivalent cost: ${structured.uncached_equivalent_cost}\n`
            : "") +
          (actual !== null
            ? `- actual prompt cost (${source}): ${structured.actual_prompt_cost}\n`
            : "") +
          (cce !== null
            ? `- cache cost efficiency: ${structured.cache_cost_efficiency}\n`
            : "") +
          `\nFormulas:\n${metrics.map((f) => `- \`${f}\``).join("\n")}\n\n` +
          `Output tokens, batch/committed-use discounts and contracted rates sit outside this input-side ratio.\n\n_${statusLine(d)}_` +
          footer(a, d.url),
      );
    },
  );

  server.registerTool(
    "get_provider_cache_snapshot",
    {
      title: "Provider prompt-cache behavior snapshot",
      description:
        "The cache explainer's dated snapshot of frontier providers' prompt-cache pricing and behavior (write/read charges as multiples of base input, minimum cacheable prefix, lifetime). A snapshot, not a spec — verify against current provider docs. Optional `provider` filter (anthropic, openai, google).",
      inputSchema: { provider: z.string().optional() },
      outputSchema: {
        providers: z.array(
          z.object({
            slug: z.string(),
            provider: z.string(),
            write_charge: z.string(),
            read_charge: z.string(),
            minimum_prefix: z.string(),
            lifetime_notes: z.string(),
            reviewed: z.string(),
            provenance,
          }),
        ),
      },
      annotations: RO,
    },
    ({ provider }) => {
      let rows = a.cacheProviders;
      if (provider) {
        rows = rows.filter(
          (p) =>
            p.slug === slugify(provider) ||
            p.provider.toLowerCase().includes(provider.toLowerCase()),
        );
        if (!rows.length) {
          return unknown(
            "provider",
            provider,
            a.cacheProviders.map((p) => p.slug),
            "",
          );
        }
      }
      const d = docBySlug(a, "cache-explainer");
      return ok(
        { providers: rows },
        rows
          .map(
            (p) =>
              `### ${p.provider}\n- write: ${p.write_charge}\n- read: ${p.read_charge}\n- minimum prefix: ${p.minimum_prefix}\n- lifetime: ${p.lifetime_notes}\n- ${p.reviewed}`,
          )
          .join("\n\n") +
          `\n\n_${statusLine(d)}_` +
          footer(a, d.url),
      );
    },
  );

  // ---- personas / value / glossary --------------------------------------------
  server.registerTool(
    "list_personas",
    {
      title: "List tokenomics personas",
      description:
        "The eight core personas (Engineering, FinOps Practitioner, AI End User, Finance, Product, Procurement, Leadership, Capacity) and four allied ones, with the stages (Production, Consumption, Value) each spans. Filter by `stage` or `core`.",
      inputSchema: {
        stage: z.enum(["production", "consumption", "value"]).optional(),
        core: z.boolean().optional(),
      },
      outputSchema: {
        personas: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            core: z.boolean(),
            stages: z.array(z.string()),
            responsibility: z.string(),
            uri: z.string(),
          }),
        ),
        stages: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            scope: z.string(),
            key_question: z.string(),
          }),
        ),
      },
      annotations: RO,
    },
    ({ stage, core }) => {
      const rows = a.personas
        .filter(
          (p) =>
            (!stage || p.stages.includes(stage)) &&
            (core === undefined || p.core === core),
        )
        .map((p) => ({
          slug: p.slug,
          name: p.name,
          core: p.core,
          stages: p.stages,
          responsibility: p.responsibility,
          uri: URI.persona(p.slug),
        }));
      return ok(
        {
          personas: rows,
          stages: a.stages.map((s) => ({
            slug: s.slug,
            name: s.name,
            scope: s.scope,
            key_question: s.key_question,
          })),
        },
        rows
          .map(
            (p) =>
              `- **${p.name}**${p.core ? "" : " (allied)"} [${p.stages.join(", ")}] — ${p.responsibility}`,
          )
          .join("\n") + sourcesFooter(a, ["personas-operating-model"]),
      );
    },
  );

  server.registerTool(
    "get_persona",
    {
      title: "Get one persona",
      description:
        "One persona's responsibilities, key decisions, signals and metrics, and stated links to FinOps Framework capabilities.",
      inputSchema: { persona: z.string() },
      outputSchema: {
        persona: personaRecord,
        crosslinks: z.array(crossLink),
        crosswalk: z.array(crosswalkEntry),
        uri: z.string(),
      },
      annotations: RO,
    },
    ({ persona }) => {
      const p = findPersona(persona);
      if (isErr(p)) return p;
      const links = linksFor("persona", p.slug);
      const cw = crosswalkFor("persona", p.slug);
      return {
        content: [
          { type: "text", text: personaMd(a, p, links, cw) },
          link(URI.persona(p.slug), p.slug, p.name),
        ],
        structuredContent: {
          persona: p,
          crosslinks: links,
          crosswalk: cw,
          uri: URI.persona(p.slug),
        },
      } as ToolResult;
    },
  );

  server.registerTool(
    "list_value_categories",
    {
      title:
        "Value classification: outcome categories and booking destinations",
      description:
        "The ten outcome categories (direct dollar wins, labor, intangible) with 'estimate as' units, and the five destinations Finance books realized value to. From 'Classifying and Measuring Realized Value from AI'.",
      inputSchema: { group: z.string().optional() },
      outputSchema: {
        categories: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            group: z.string(),
            description: z.string(),
            estimate_as: z.string().nullable(),
          }),
        ),
        booking_destinations: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            description: z.string(),
          }),
        ),
        status: z.string(),
      },
      annotations: RO,
    },
    ({ group }) => {
      const cats = a.value.categories
        .filter(
          (c) => !group || c.group.toLowerCase().includes(group.toLowerCase()),
        )
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          group: c.group,
          description: c.description,
          estimate_as: c.estimate_as,
        }));
      const books = a.value.booking_destinations.map((b) => ({
        slug: b.slug,
        name: b.name,
        description: b.description,
      }));
      const d = docBySlug(a, "value-classification");
      return ok(
        {
          categories: cats,
          booking_destinations: books,
          status: statusLine(d),
        },
        `## Outcome categories\n` +
          cats
            .map(
              (c) =>
                `- **${c.name}** (${c.group}) — estimate as: ${c.estimate_as ?? "n/a"}`,
            )
            .join("\n") +
          `\n\n## Booking destinations\n` +
          books.map((b) => `- **${b.name}** — ${b.description}`).join("\n") +
          `\n\n_${statusLine(d)}_` +
          footer(a, d.url),
      );
    },
  );

  server.registerTool(
    "define_term",
    {
      title: "Define a tokenomics term",
      description:
        "Glossary lookup across the Foundation's definition page and the cache explainer (e.g. 'KV cache', 'prompt cache', 'tokenmaxing', 'Jevons paradox'). Returns every matching definition with its source." +
        (opts.experimental && opts.curriculum
          ? " Curriculum glossary entries (unofficial) are appended when present."
          : ""),
      inputSchema: { term: z.string().min(2) },
      outputSchema: {
        matches: z.array(
          z.object({
            slug: z.string(),
            term: z.string(),
            definition: z.string(),
            provenance,
          }),
        ),
        curriculum_matches: z.array(
          z.object({
            term: z.string(),
            definition: z.string(),
            section: z.string(),
            official: z.literal(false),
          }),
        ),
      },
      annotations: RO,
    },
    ({ term }) => {
      const q = slugify(term);
      // Exact term matches win; substring matches only when none exist
      // ("tokenmaxing" must not also return "Token").
      const bare = (t: string) => slugify(t.replace(/\([^)]*\)/g, " "));
      const exact = a.glossary.filter(
        (g) => bare(g.term) === q || g.slug === q,
      );
      const matches = exact.length
        ? exact
        : a.glossary.filter(
            (g) => slugify(g.term).includes(q) || q.includes(slugify(g.term)),
          );
      const cur =
        opts.experimental && opts.curriculum
          ? opts.curriculum.glossary
              .filter((g) => slugify(g.term).includes(q))
              .map((g) => ({ ...g, official: false as const }))
          : [];
      if (!matches.length && !cur.length) {
        const hits = search(index, term).slice(0, 3);
        return err(
          `No glossary term matches "${term}".` +
            (hits.length
              ? ` Closest: ${hits.map((h) => h.title).join(", ")}.`
              : "") +
            " Try search_tokenomics for prose mentions.",
        );
      }
      const text =
        matches
          .map(
            (g) =>
              `**${g.term}**: ${g.definition}\n_${statusLine(docBySlug(a, g.provenance.document))}_`,
          )
          .join("\n\n") +
        (cur.length
          ? `\n\n_${CURRICULUM_BANNER}_\n\n` +
            cur
              .map((g) => `**${g.term}** (${g.section}): ${g.definition}`)
              .join("\n\n")
          : "") +
        (matches[0] ? footer(a, matches[0].provenance.source_url) : "");
      return ok({ matches, curriculum_matches: cur }, text);
    },
  );

  // ---- FOCUS tracker + crosslinks ---------------------------------------------
  server.registerTool(
    "get_focus_ai_tracker",
    {
      title: "FOCUS 1.5 AI-cost tracker",
      description:
        "The Foundation's status page on what FOCUS 1.5 does for AI cost: items merged into the working draft (e.g. SkuPriceDetails Model* properties, PrincipalId), in review (TokenCacheAction / TokenDirection cached-token work), started, and not in 1.5 (1.6 candidates). Filter by `bucket` (done|flight|consider|out) or an `identifier` such as 'TokenCacheAction'. Working-draft items are not in any ratified FOCUS release; the FOCUS server serves ratified versions.",
      inputSchema: {
        bucket: z.enum(["done", "flight", "consider", "out"]).optional(),
        identifier: z.string().optional(),
      },
      outputSchema: { items: z.array(focusItem), status: z.string() },
      annotations: RO,
    },
    ({ bucket, identifier }) => {
      let items = a.focusTracker;
      if (bucket) items = items.filter((f) => f.bucket === bucket);
      if (identifier) {
        const id = identifier.toLowerCase();
        items = items.filter((f) =>
          f.identifiers.some((x) => x.toLowerCase() === id),
        );
      }
      const d = docBySlug(a, "focus-1-5-for-ai");
      return ok(
        { items, status: statusLine(d) },
        (identifier || bucket
          ? items
              .map(
                (f) =>
                  `### ${f.title}\n[${f.bucket}; ${f.labels.join(", ")}]\n\n${f.body_md}`,
              )
              .join("\n\n") +
            `\n\n_${statusLine(d)}_` +
            footer(a, d.url)
          : focusTrackerMd(a)) || "No matching items.",
      );
    },
  );

  server.registerTool(
    "get_crosslinks",
    {
      title: "Cross-links to the FinOps Framework and FOCUS servers",
      description:
        "Stated links from tokenomics entities to the other two servers: each carries a quote from the Foundation page that names the target, and a finops://framework/… or focus://spec/… URI to read with those servers (null for FOCUS working-draft identifiers). Filter by `entity_type` + `slug` (e.g. metric cache-hit-rate) or by target `server`.",
      inputSchema: {
        entity_type: z.enum(ENTITY_TYPES).optional(),
        slug: z.string().optional(),
        server: z
          .enum(["framework", "focus", "focus-working-draft"])
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      },
      outputSchema: {
        links: z.array(crossLink),
        total: z.number(),
        nextCursor: z.string().optional(),
      },
      annotations: RO,
    },
    ({ entity_type, slug, server: srv, limit, cursor }) => {
      const rows = a.crosslinks.filter(
        (l) =>
          (!entity_type || l.from.type === entity_type) &&
          (!slug || l.from.slug === slug) &&
          (!srv || l.target.server === srv),
      );
      const pg = paginate(
        rows,
        limit ?? 50,
        cursor,
        cursorContext("get_crosslinks", { entity_type, slug, server: srv }),
        dv,
      );
      if (isErr(pg)) return pg;
      return ok(
        {
          links: pg.page,
          total: rows.length,
          ...(pg.nextCursor ? { nextCursor: pg.nextCursor } : {}),
        },
        `${rows.length} stated link(s)\n\n` +
          linksMd(pg.page, [], { showSource: true }) +
          sourcesFooter(
            a,
            pg.page.map((l) => l.document),
          ),
      );
    },
  );

  server.registerTool(
    "search_tokenomics",
    {
      title: "Search tokenomics content",
      description:
        "Ranked keyword search across layers, Big-T classes, levers, metrics, personas, value categories, glossary terms, FOCUS tracker items, and every document section. Use when you don't know the slug; follow up with the matching get_* tool or get_document(section).",
      inputSchema: {
        query: z.string().min(2),
        entity_types: z.array(z.enum(SEARCH_ENTITY_TYPES)).optional(),
        limit: z.number().int().min(1).max(50).default(10),
      },
      outputSchema: {
        results: z.array(
          z.object({
            entity_type: z.enum(SEARCH_ENTITY_TYPES),
            slug: z.string(),
            title: z.string(),
            uri: z.string(),
            snippet: z.string(),
            score: z.number(),
          }),
        ),
      },
      annotations: RO,
    },
    ({ query, entity_types, limit }) => {
      const results = search(index, query, entity_types).slice(0, limit ?? 10);
      return ok(
        { results },
        results.length
          ? results
              .map(
                (r) =>
                  `- [${r.entity_type}] **${r.title}** (\`${r.slug}\`) — ${r.snippet}`,
              )
              .join("\n") +
              sourcesFooter(
                a,
                results.map((r) => docOfHit(r.entity_type, r.slug)),
              )
          : `No results for "${query}".`,
      );
    },
  );

  // ---- experimental ------------------------------------------------------------
  if (!opts.experimental) return;

  server.registerTool(
    "get_crosswalk",
    {
      title: "Curated crosswalk (UNOFFICIAL)",
      description:
        "EXPERIMENTAL, UNOFFICIAL: this server's curated mappings from tokenomics entities to FinOps Framework capabilities, KPIs and personas (e.g. cache-hit-rate → framework KPI cache-hit-rate, personas by name). No Foundation page states these; each carries a rationale. Prefer get_crosslinks for stated links.",
      inputSchema: {
        entity_type: z.enum(ENTITY_TYPES).optional(),
        slug: z.string().optional(),
      },
      outputSchema: { banner: z.string(), entries: z.array(crosswalkEntry) },
      annotations: RO,
    },
    ({ entity_type, slug }) => {
      const entries = a.crosswalk.filter(
        (c) =>
          (!entity_type || c.from.type === entity_type) &&
          (!slug || c.from.slug === slug),
      );
      return ok(
        { banner: CROSSWALK_BANNER, entries },
        `_${CROSSWALK_BANNER}_\n\n` +
          entries
            .map(
              (c) =>
                `- ${c.from.type} **${c.from.slug}** → ${c.target.server} ${c.target.kind} **${c.target.id}** (\`${c.target.uri}\`): ${c.rationale}`,
            )
            .join("\n"),
      );
    },
  );

  const cur = opts.curriculum;
  if (!cur) return;

  server.registerTool(
    "list_curriculum_modules",
    {
      title: "List cert-prep curriculum modules (UNOFFICIAL)",
      description:
        "EXPERIMENTAL, UNOFFICIAL: the maintainer's local AI Tokenomics training modules (TK-2xx/3xx) from the curriculum overlay — ids, titles, levels, personas, objectives. Not Tokenomics Foundation content.",
      inputSchema: {},
      outputSchema: {
        banner: z.string(),
        modules: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            level: z.number().nullable(),
            minutes: z.number().nullable(),
            personas: z.array(z.string()),
            objectives: z.array(z.string()),
          }),
        ),
      },
      annotations: RO,
    },
    () => {
      const modules = cur.modules.map((m) => ({
        id: m.id,
        title: m.title,
        level: m.level,
        minutes: m.minutes,
        personas: m.personas,
        objectives: m.objectives,
      }));
      return ok(
        { banner: CURRICULUM_BANNER, modules },
        `_${CURRICULUM_BANNER}_\n\n` +
          modules
            .map(
              (m) =>
                `- **${m.id}** ${m.title} (level ${m.level ?? "?"}, ${m.minutes ?? "?"} min)`,
            )
            .join("\n"),
      );
    },
  );

  server.registerTool(
    "get_curriculum_module",
    {
      title: "Get a cert-prep curriculum module (UNOFFICIAL)",
      description:
        "EXPERIMENTAL, UNOFFICIAL: one training module's objectives, agenda, anchors to sources, and (with include_slides) each slide's title, body, source line, and facilitator notes. Module-original formulas are the module's own method, not Foundation guidance.",
      inputSchema: {
        module: z.string().describe("e.g. 'TK-202'"),
        include_slides: z.boolean().default(false),
      },
      outputSchema: {
        banner: z.string(),
        module: z.object({
          id: z.string(),
          title: z.string(),
          objectives: z.array(z.string()),
          agenda: z.array(z.string()),
          anchors: z.array(
            z.object({ source: z.string(), section: z.string() }),
          ),
          slides: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              body: z.string(),
              source_line: z.string().nullable(),
              notes: z.string().nullable(),
            }),
          ),
        }),
      },
      annotations: RO,
    },
    ({ module, include_slides }) => {
      const m = cur.modules.find(
        (x) => x.id.toLowerCase() === module.trim().toLowerCase(),
      );
      if (!m)
        return unknown(
          "curriculum module",
          module,
          cur.modules.map((x) => x.id.toLowerCase()),
          "Use list_curriculum_modules.",
        );
      const slides = include_slides ? m.slides : [];
      const structured = {
        banner: CURRICULUM_BANNER,
        module: {
          id: m.id,
          title: m.title,
          objectives: m.objectives,
          agenda: m.agenda,
          anchors: m.anchors,
          slides,
        },
      };
      return ok(
        structured,
        `_${CURRICULUM_BANNER}_\n\n# ${m.id} ${m.title}\n\n## Objectives\n${m.objectives.map((o) => `- ${o}`).join("\n")}\n\n## Agenda\n${m.agenda.map((o) => `- ${o}`).join("\n")}` +
          (slides.length
            ? `\n\n## Slides\n\n` +
              slides
                .map(
                  (s) =>
                    `### ${s.title}\n${s.body}${s.source_line ? `\n_${s.source_line}_` : ""}`,
                )
                .join("\n\n")
            : ""),
      );
    },
  );

  server.registerTool(
    "get_numbers_register",
    {
      title: "Curriculum numbers register (UNOFFICIAL)",
      description:
        "EXPERIMENTAL, UNOFFICIAL: the curriculum's register of every figure a module may use, with its wording and its only allowed citation (e.g. 8–27% token share of agent run cost, ~34× Big-T worked example). Optional `query` filter.",
      inputSchema: { query: z.string().optional() },
      outputSchema: {
        banner: z.string(),
        numbers: z.array(
          z.object({
            figure: z.string(),
            wording: z.string(),
            cite_as: z.string(),
          }),
        ),
      },
      annotations: RO,
    },
    ({ query }) => {
      const q = query?.toLowerCase();
      const numbers = cur.numbers.filter(
        (n) =>
          !q ||
          `${n.figure} ${n.wording} ${n.cite_as}`.toLowerCase().includes(q),
      );
      return ok(
        { banner: CURRICULUM_BANNER, numbers },
        `_${CURRICULUM_BANNER}_\n\n` +
          numbers
            .map((n) => `- **${n.figure}** — ${n.wording} (cite: ${n.cite_as})`)
            .join("\n"),
      );
    },
  );
}
