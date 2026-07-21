import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  Artifact,
  Capability,
  OfficialMaturityLevel,
} from "../../shared/index.js";
import { nearestMatches } from "../../shared/index.js";
import { prerequisiteClosure, relatedEdges } from "./graph.js";
import {
  UNOFFICIAL_ACTIONS_NOTE,
  collectionMd,
  footer,
  overviewMd,
  personaMd,
} from "./render.js";
import { buildSearchIndex, search, type SearchEntityType } from "./search.js";
import { URI } from "./uris.js";

// Tools are the model's canonical path and return complete records at the
// leaf level; resources are the attachment/bulk layer (critique m2/M6).

const LEVELS = ["pre-crawl", "crawl", "walk", "run"] as const;
const OFFICIAL = ["crawl", "walk", "run"] as const;
const ENTITY_TYPES = [
  "capability",
  "kpi",
  "persona",
  "principle",
  "phase",
  "domain",
  "technology-category",
  "maturity-level",
  "scope",
] as const;

const RO = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

interface Cursor {
  v: string;
  o: number;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString()) as Cursor;
    return typeof c.o === "number" && typeof c.v === "string" ? c : null;
  } catch {
    return null;
  }
}

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "resource_link";
      uri: string;
      name: string;
      description?: string;
      mimeType?: string;
    };

type ToolResult = {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function err(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function ok(structured: Record<string, unknown>, summary?: string): ToolResult {
  return {
    content: [
      { type: "text", text: summary ?? JSON.stringify(structured, null, 2) },
    ],
    structuredContent: structured,
  };
}

export function registerTools(server: McpServer, artifact: Artifact): void {
  const index = buildSearchIndex(artifact);
  // Tools are the canonical distribution path, so leaf-level content must
  // carry the same CC BY 4.0 attribution as resources (critique-2 M7').
  const attribution = (sourceUrl: string) => footer(artifact, sourceUrl);
  const capSlugs = artifact.capabilities.map((c) => c.slug);
  const dataVersion = artifact.manifest.data_version;

  function findCapability(slug: string): Capability | ToolResult {
    const c = artifact.capabilities.find((x) => x.slug === slug.toLowerCase());
    if (c) return c;
    const near = nearestMatches(slug, capSlugs);
    return err(
      `Unknown capability "${slug}".` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
        ` Use list_capabilities for the full slug list.`,
    );
  }

  function paginate<T>(
    items: T[],
    limit: number,
    cursorRaw: string | undefined,
  ): { page: T[]; nextCursor?: string } | ToolResult {
    let offset = 0;
    if (cursorRaw) {
      const c = decodeCursor(cursorRaw);
      if (!c)
        return err("Invalid cursor. Restart the listing without a cursor.");
      if (c.v !== dataVersion) {
        return err(
          `Stale cursor: it was issued for data version ${c.v} but the server now serves ${dataVersion}. Restart the listing without a cursor.`,
        );
      }
      offset = c.o;
    }
    const page = items.slice(offset, offset + limit);
    return {
      page,
      ...(offset + limit < items.length
        ? { nextCursor: encodeCursor({ v: dataVersion, o: offset + limit }) }
        : {}),
    };
  }

  const isErr = (x: unknown): x is ToolResult =>
    typeof x === "object" && x !== null && "isError" in (x as ToolResult);

  const capLink = (slug: string) => ({
    type: "resource_link" as const,
    uri: URI.capability(slug),
    name: slug,
    description: `Full ${slug} capability document`,
    mimeType: "text/markdown",
  });

  // ---- get_framework_info -------------------------------------------------
  server.registerTool(
    "get_framework_info",
    {
      title: "Framework & server orientation",
      description:
        "Start here. Returns the framework's structure (entity counts), the data version/crawl date/license, and how to navigate this server's tools. No parameters.",
      inputSchema: {},
      outputSchema: {
        data_version: z.string(),
        crawled_at: z.string(),
        counts: z.record(z.string(), z.number()),
        license: z.string(),
        overview_md: z.string(),
      },
      annotations: RO,
    },
    () =>
      ok(
        {
          data_version: dataVersion,
          crawled_at: artifact.manifest.crawled_at,
          counts: { ...artifact.manifest.counts },
          license:
            "Framework content © FinOps Foundation, CC BY 4.0; restructured by finops-framework-mcp; unofficial extensions marked official:false.",
          overview_md: overviewMd(artifact),
        },
        overviewMd(artifact),
      ),
  );

  // ---- search_framework ----------------------------------------------------
  server.registerTool(
    "search_framework",
    {
      title: "Search the framework",
      description:
        "Ranked keyword search over every entity (capabilities, KPIs, personas, principles, phases, domains, technology categories, maturity levels, scopes). Returns slug + uri per hit — feed slugs into get_capability/get_kpis/etc. Use this whenever you don't already know a slug.",
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe("Keywords, e.g. 'unallocated spend tagging'"),
        entity_types: z
          .array(z.enum(ENTITY_TYPES))
          .optional()
          .describe("Restrict to these entity types (default: all)"),
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z
          .string()
          .optional()
          .describe("Opaque cursor from a previous call"),
      },
      outputSchema: {
        results: z.array(
          z.object({
            entity_type: z.enum(ENTITY_TYPES),
            slug: z.string(),
            title: z.string(),
            uri: z.string(),
            snippet: z.string(),
          }),
        ),
        total: z.number(),
        nextCursor: z.string().optional(),
      },
      annotations: RO,
    },
    ({ query, entity_types, limit, cursor }) => {
      const all = search(
        index,
        query,
        entity_types as SearchEntityType[] | undefined,
      );
      const p = paginate(all, limit ?? 10, cursor);
      if (isErr(p)) return p;
      const results = p.page.map((r) => ({
        entity_type: r.entity_type,
        slug: r.slug,
        title: r.title,
        uri: r.uri,
        snippet: r.snippet,
      }));
      return ok(
        {
          results,
          total: all.length,
          ...(p.nextCursor ? { nextCursor: p.nextCursor } : {}),
        },
        `${all.length} hit(s) for "${query}"` +
          (results.length
            ? ":\n" +
              results
                .map(
                  (r) =>
                    `- [${r.entity_type}] ${r.title} (${r.slug}): ${r.snippet.slice(0, 100)}`,
                )
                .join("\n")
            : ". Try broader terms or search_framework without entity_types."),
      );
    },
  );

  // ---- list_capabilities -----------------------------------------------------
  server.registerTool(
    "list_capabilities",
    {
      title: "List capabilities",
      description:
        "All 22 capabilities (slug, title, domain, one-line summary), optionally filtered by domain slug or persona slug. The framework does not assign capabilities to phases, so there is deliberately no phase filter. Default limit returns the full list in one call.",
      inputSchema: {
        domain: z
          .string()
          .optional()
          .describe("Domain slug, e.g. 'understand-usage-and-cost'"),
        persona: z.string().optional().describe("Persona slug, e.g. 'finance'"),
        limit: z.number().int().min(1).max(50).default(50),
        cursor: z.string().optional(),
      },
      outputSchema: {
        capabilities: z.array(
          z.object({
            slug: z.string(),
            title: z.string(),
            domain: z.string(),
            summary: z.string(),
          }),
        ),
        total: z.number(),
        note: z.string().optional(),
        nextCursor: z.string().optional(),
      },
      annotations: RO,
    },
    ({ domain, persona, limit, cursor }) => {
      let caps = artifact.capabilities;
      if (domain) {
        const d = artifact.domains.find((x) => x.slug === domain.toLowerCase());
        if (!d) {
          return err(
            `Unknown domain "${domain}". Valid: ${artifact.domains.map((x) => x.slug).join(", ")}`,
          );
        }
        caps = caps.filter((c) => c.domain_slug === d.slug);
      }
      if (persona) {
        const p = artifact.personas.find(
          (x) => x.slug === persona.toLowerCase(),
        );
        if (!p) {
          return err(
            `Unknown persona "${persona}". Valid: ${artifact.personas.map((x) => x.slug).join(", ")}`,
          );
        }
        caps = caps.filter((c) =>
          c.functional_activities.some(
            (f) =>
              (f.persona.kind !== "allied-group" &&
                f.persona.persona_slug === p.slug) ||
              (p.category === "allied" && f.persona.kind === "allied-group"),
          ),
        );
      }
      const pg = paginate(caps, limit ?? 50, cursor);
      if (isErr(pg)) return pg;
      const rows = pg.page.map((c) => ({
        slug: c.slug,
        title: c.title,
        domain: c.domain_slug,
        summary: c.summary.slice(0, 200),
      }));
      const alliedNote =
        persona &&
        artifact.personas.find((x) => x.slug === persona.toLowerCase())
          ?.category === "allied"
          ? `Note: ${persona} is an allied persona — the framework maps capability activities to Allied Personas collectively, not to ${persona} individually.\n`
          : "";
      return ok(
        {
          capabilities: rows,
          total: caps.length,
          ...(alliedNote ? { note: alliedNote.trim() } : {}),
          ...(pg.nextCursor ? { nextCursor: pg.nextCursor } : {}),
        },
        alliedNote +
          rows.map((r) => `- ${r.title} (${r.slug}) [${r.domain}]`).join("\n"),
      );
    },
  );

  // ---- get_capability ---------------------------------------------------------
  const INCLUDE = [
    "summary",
    "definition",
    "maturity",
    "activities",
    "kpis",
    "relationships",
    "headline_groups",
    "inputs_outputs",
  ] as const;
  server.registerTool(
    "get_capability",
    {
      title: "Get one capability",
      description:
        "One capability's content, section-selectable via `include` to control size. Default include is [summary, definition] (~1-2k tokens). Approximate extra cost per section: maturity ~2.5k tokens, activities ~3k (filter with `persona`), kpis ~1k, relationships ~1k, headline_groups/inputs_outputs <1k; requesting ALL sections is roughly 8k tokens — prefer the finops://framework/capabilities/{slug} resource for the full document.",
      inputSchema: {
        slug: z.string().describe("Capability slug, e.g. 'allocation'"),
        include: z
          .array(z.enum(INCLUDE))
          .optional()
          .describe("Sections to return (default [summary, definition])"),
        persona: z
          .string()
          .optional()
          .describe(
            "With include:['activities']: return only this persona's activities",
          ),
      },
      outputSchema: {
        slug: z.string(),
        title: z.string(),
        domain: z.string(),
        sections: z.record(z.string(), z.unknown()),
        uri: z.string(),
        source_url: z.string(),
        license: z.string(),
      },
      annotations: RO,
    },
    ({ slug, include, persona }) => {
      const c = findCapability(slug);
      if (isErr(c)) return c;
      const inc =
        include && include.length > 0 ? include : ["summary", "definition"];
      const sections: Record<string, unknown> = {};
      if (inc.includes("summary")) sections.summary = c.summary;
      if (inc.includes("definition")) sections.definition_md = c.definition_md;
      if (inc.includes("headline_groups"))
        sections.headline_groups = c.headline_groups;
      if (inc.includes("maturity")) sections.maturity_raw = c.maturity_raw;
      if (inc.includes("activities")) {
        let acts = c.functional_activities;
        if (persona) {
          const p = artifact.personas.find(
            (x) => x.slug === persona.toLowerCase(),
          );
          acts = acts.filter(
            (f) =>
              (f.persona.kind !== "allied-group" &&
                f.persona.persona_slug === persona.toLowerCase()) ||
              (p?.category === "allied" && f.persona.kind === "allied-group"),
          );
        }
        sections.functional_activities = acts;
      }
      if (inc.includes("kpis")) {
        sections.kpi_bullets = c.kpi_bullets;
        sections.example_kpis = c.example_kpis;
        sections.featured_kpis = artifact.kpis
          .filter((k) => c.featured_kpi_ids.includes(k.wp_id))
          .map((k) => ({
            slug: k.slug,
            title: k.title,
            has_formula: !!k.formula,
          }));
      }
      if (inc.includes("relationships")) {
        const all = [
          ...artifact.relationships_official,
          ...artifact.relationships_inferred,
        ];
        sections.relationships = all.filter(
          (r) => r.from === c.slug || r.to === c.slug,
        );
        sections.relationships_note =
          "Edges with source:'inferred' are unofficial extensions (see evidence_quote/confidence).";
      }
      if (inc.includes("inputs_outputs"))
        sections.inputs_outputs_md = c.inputs_outputs_md;
      const structured = {
        slug: c.slug,
        title: c.title,
        domain: c.domain_slug,
        sections,
        uri: URI.capability(c.slug),
        source_url: c.source_url,
        license: c.license,
      };
      return {
        content: [
          {
            type: "text",
            text:
              JSON.stringify(structured, null, 2) + attribution(c.source_url),
          },
          capLink(c.slug),
        ],
        structuredContent: structured,
      } as ToolResult;
    },
  );

  // ---- get_actions ---------------------------------------------------------------
  server.registerTool(
    "get_actions",
    {
      title: "Get maturity assessment characteristics",
      description:
        "The discrete items parsed from a capability's Crawl/Walk/Run maturity assessment. IMPORTANT: these are assessment CHARACTERISTICS (rubric states an assessor checks for), not official to-do steps — an unofficial parsing of official prose (official:false). At 'pre-crawl' (an unofficial extension level) there is no official content; the tool returns the extension's definition instead.",
      inputSchema: {
        capability: z.string().describe("Capability slug"),
        maturity: z
          .enum(LEVELS)
          .optional()
          .describe("One level; omit for all three official levels"),
        level: z
          .enum(LEVELS)
          .optional()
          .describe("Alias for `maturity` (same values)"),
      },
      outputSchema: {
        capability: z.string(),
        note: z.string(),
        levels: z.array(
          z.object({
            maturity: z.string(),
            items: z.array(
              z.object({
                ordinal: z.number(),
                text: z.string(),
                parent_ordinal: z.number().optional(),
                parse_quality: z.string(),
              }),
            ),
          }),
        ),
      },
      annotations: RO,
    },
    ({ capability, maturity, level }) => {
      const c = findCapability(capability);
      if (isErr(c)) return c;
      maturity = maturity ?? level;
      if (maturity === "pre-crawl") {
        return ok(
          {
            capability: c.slug,
            note: artifact.maturity_extension.description_md,
            levels: [],
          },
          `pre-crawl is an unofficial extension: ${artifact.maturity_extension.description_md}`,
        );
      }
      const wanted: OfficialMaturityLevel[] = maturity
        ? [maturity as OfficialMaturityLevel]
        : [...OFFICIAL];
      const levels = wanted.map((lvl) => ({
        maturity: lvl,
        items: artifact.actions
          .filter((a) => a.capability_slug === c.slug && a.maturity === lvl)
          .map((a) => ({
            ordinal: a.ordinal,
            text: a.text,
            ...(a.parent_ordinal !== undefined
              ? { parent_ordinal: a.parent_ordinal }
              : {}),
            parse_quality: a.parse_quality,
          })),
      }));
      return ok(
        { capability: c.slug, note: UNOFFICIAL_ACTIONS_NOTE, levels },
        `${UNOFFICIAL_ACTIONS_NOTE}\n\n` +
          levels
            .map(
              (l) =>
                `## ${c.slug} @ ${l.maturity}\n` +
                l.items
                  .map((i) => `${i.parent_ordinal ? "  " : ""}- ${i.text}`)
                  .join("\n"),
            )
            .join("\n\n") +
          attribution(c.source_url),
      );
    },
  );

  // ---- get_kpis --------------------------------------------------------------------
  server.registerTool(
    "get_kpis",
    {
      title: "Get KPIs (full records)",
      description:
        "Full KPI records: description, formula + candidate data sources (present for the ~44 KPIs the site details in capability-page popups), official related capabilities, and where each is featured. Look up one KPI with `slug`, or filter by capability and/or featured_only. Without filters, pages through the whole 88-entry library.",
      inputSchema: {
        slug: z
          .string()
          .optional()
          .describe(
            "Exact KPI slug for a single-record lookup, e.g. 'allocation-accuracy-index-aai'",
          ),
        capability: z
          .string()
          .optional()
          .describe(
            "Only KPIs featured on or officially related to this capability",
          ),
        featured_only: z
          .boolean()
          .default(false)
          .describe(
            "With `capability`: only KPIs featured on that capability's own page; alone: only KPIs featured on some page",
          ),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      },
      outputSchema: {
        kpis: z.array(
          z.object({
            slug: z.string(),
            title: z.string(),
            description_md: z.string(),
            formula: z.string().optional(),
            data_sources: z.array(z.string()),
            related_capability_slugs: z.array(z.string()),
            featured_on: z.array(z.string()),
            uri: z.string(),
          }),
        ),
        total: z.number(),
        nextCursor: z.string().optional(),
      },
      annotations: RO,
    },
    ({ slug, capability, featured_only, limit, cursor }) => {
      let kpis = artifact.kpis;
      if (slug) {
        kpis = kpis.filter((k) => k.slug === slug.toLowerCase());
        if (kpis.length === 0) {
          const near = nearestMatches(
            slug,
            artifact.kpis.map((k) => k.slug),
          );
          return err(
            `Unknown KPI slug "${slug}".` +
              (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
              ` Use search_framework(entity_types: ["kpi"]) to find KPIs by keyword.`,
          );
        }
      }
      if (capability) {
        const c = findCapability(capability);
        if (isErr(c)) return c;
        kpis = featured_only
          ? kpis.filter((k) => k.featured_on.includes(c.slug))
          : kpis.filter(
              (k) =>
                k.featured_on.includes(c.slug) ||
                k.related_capability_slugs.includes(c.slug),
            );
      } else if (featured_only) {
        kpis = kpis.filter((k) => k.featured_on.length > 0);
      }
      const pg = paginate(kpis, limit ?? 25, cursor);
      if (isErr(pg)) return pg;
      const rows = pg.page.map((k) => ({
        slug: k.slug,
        title: k.title,
        description_md: k.description_md,
        ...(k.formula ? { formula: k.formula } : {}),
        data_sources: k.data_sources,
        related_capability_slugs: k.related_capability_slugs,
        featured_on: k.featured_on,
        uri: URI.kpi(k.slug),
        source_url: k.source_url,
        license: k.license,
      }));
      const structured = {
        kpis: rows,
        total: kpis.length,
        ...(pg.nextCursor ? { nextCursor: pg.nextCursor } : {}),
      };
      // Text must be functionally equivalent to structuredContent for hosts
      // that surface only content blocks (critique-2 BLOCKER): full records,
      // plus an explicit truncation note when paginated.
      const truncationNote = pg.nextCursor
        ? `\n\nShowing ${rows.length} of ${kpis.length} — pass cursor: "${pg.nextCursor}" for more.`
        : "";
      const result: ToolResult = {
        content: [
          {
            type: "text",
            text:
              JSON.stringify(structured, null, 2) +
              truncationNote +
              (rows.length > 0
                ? attribution(
                    rows[0]?.source_url ?? "https://www.finops.org/kpi/",
                  )
                : ""),
          },
        ],
        structuredContent: structured,
      };
      if (slug && rows.length === 1) {
        result.content.push({
          type: "resource_link",
          uri: URI.kpi(rows[0]?.slug ?? ""),
          name: rows[0]?.slug ?? "",
          description: `Full ${rows[0]?.title ?? ""} KPI document`,
          mimeType: "text/markdown",
        });
      }
      return result;
    },
  );

  // ---- get_prerequisites --------------------------------------------------------------
  server.registerTool(
    "get_prerequisites",
    {
      title: "Get prerequisite closure",
      description:
        "Transitive prerequisite closure for a capability: which other capabilities its practice builds on, with minimum-maturity constraints propagated along paths (rule: constraint = max over the path; unconstrained edges count as 'present at any level'). IMPORTANT: the FinOps Foundation publishes no formal prerequisite graph — prerequisite edges and all maturity constraints are unofficial inferences with quoted evidence; every edge carries source/confidence. include_inferred:false restricts to officially-evidenced edges (currently none are typed prerequisite, so expect an empty-but-honest result).",
      inputSchema: {
        capability: z
          .string()
          .describe("Capability slug whose prerequisites you want"),
        target_maturity: z
          .enum(OFFICIAL)
          .optional()
          .describe(
            "Level you are aiming for (annotates the summary; default run)",
          ),
        include_inferred: z.boolean().default(true),
      },
      outputSchema: {
        capability: z.string(),
        summary: z.string(),
        prerequisites: z.array(
          z.object({
            capability: z.string(),
            min_maturity: z.string(),
            depth: z.number(),
            edges: z.array(
              z.object({
                from: z.string(),
                to: z.string(),
                source: z.string(),
                confidence: z.string().optional(),
                evidence_quote: z.string().optional(),
                rationale: z.string().optional(),
              }),
            ),
          }),
        ),
      },
      annotations: RO,
    },
    ({ capability, target_maturity, include_inferred }) => {
      const c = findCapability(capability);
      if (isErr(c)) return c;
      const closure = prerequisiteClosure(
        artifact,
        c.slug,
        include_inferred ?? true,
      );
      const summary =
        `${closure.nodes.length} prerequisite capability(ies) for ${c.slug}` +
        (target_maturity ? ` at ${target_maturity}` : "") +
        ` — ${closure.official_edges} official edge(s), ${closure.inferred_edges} inferred. ` +
        `Prerequisite typing and all maturity constraints are UNOFFICIAL inferences ` +
        `(the framework publishes no prerequisite graph); see per-edge evidence.`;
      const prerequisites = closure.nodes.map((n) => ({
        capability: n.capability,
        min_maturity: n.min_maturity,
        depth: n.depth,
        edges: n.via.map((e) => ({
          from: e.from,
          to: e.to,
          source: e.source,
          ...(e.confidence ? { confidence: e.confidence } : {}),
          ...(e.evidence_quote ? { evidence_quote: e.evidence_quote } : {}),
          ...(e.rationale ? { rationale: e.rationale } : {}),
        })),
      }));
      return ok(
        { capability: c.slug, summary, prerequisites },
        `${summary}\n` +
          prerequisites
            .map(
              (p) =>
                `- ${p.capability} (min maturity: ${p.min_maturity}, depth ${p.depth})`,
            )
            .join("\n") +
          (prerequisites.length === 0
            ? "\nNo prerequisite edges found. Try get_related for informs/related connections."
            : ""),
      );
    },
  );

  // ---- get_related -----------------------------------------------------------------------
  server.registerTool(
    "get_related",
    {
      title: "Get related capabilities",
      description:
        "Non-prerequisite relationship edges (informs/related) touching a capability, partitioned into official (harvested from finops.org page links and shared-KPI references, with evidence URLs) and inferred (unofficial, with quoted evidence + confidence).",
      inputSchema: {
        capability: z.string().describe("Capability slug"),
        types: z
          .array(z.enum(["informs", "related"]))
          .optional()
          .describe("Edge types (default both)"),
      },
      outputSchema: {
        capability: z.string(),
        official: z.array(z.record(z.string(), z.unknown())),
        inferred: z.array(z.record(z.string(), z.unknown())),
        note: z.string(),
      },
      annotations: RO,
    },
    ({ capability, types }) => {
      const c = findCapability(capability);
      if (isErr(c)) return c;
      const r = relatedEdges(
        artifact,
        c.slug,
        (types as ("informs" | "related")[]) ?? ["informs", "related"],
      );
      const note =
        "official = evidenced by finops.org links/shared KPIs; inferred = unofficial extension.";
      return ok(
        {
          capability: c.slug,
          official: r.official as unknown as Record<string, unknown>[],
          inferred: r.inferred as unknown as Record<string, unknown>[],
          note,
        },
        `official = evidenced by finops.org page links / shared-KPI references (the Foundation publishes no relationship graph); inferred = unofficial extension.\n` +
          `${c.slug}: ${r.official.length} official, ${r.inferred.length} inferred edge(s).\n` +
          [...r.official, ...r.inferred]
            .slice(0, 30)
            .map(
              (e) =>
                `- ${e.from} —${e.type}→ ${e.to} [${e.source}${e.confidence ? `, ${e.confidence}` : ""}]`,
            )
            .join("\n"),
      );
    },
  );

  // ---- assess_maturity_path -------------------------------------------------------------------
  server.registerTool(
    "assess_maturity_path",
    {
      title: "Maturity gap between two levels",
      description:
        "For one capability, the assessment characteristics present at each level between current and target — evidence to look for when maturing, NOT official steps to execute (unofficial parsing, official:false). current_level may be 'pre-crawl' (unofficial extension meaning below-Crawl); the gap then starts at Crawl.",
      inputSchema: {
        capability: z.string(),
        current_level: z.enum(LEVELS),
        target_level: z.enum(OFFICIAL),
      },
      outputSchema: {
        capability: z.string(),
        note: z.string(),
        gap: z.array(
          z.object({
            maturity: z.string(),
            characteristics: z.array(z.string()),
          }),
        ),
        related_prerequisites_hint: z.string(),
      },
      annotations: RO,
    },
    ({ capability, current_level, target_level }) => {
      const c = findCapability(capability);
      if (isErr(c)) return c;
      const order = ["pre-crawl", "crawl", "walk", "run"];
      const from = order.indexOf(current_level);
      const to = order.indexOf(target_level);
      if (to <= from) {
        return err(
          `target_level (${target_level}) must be above current_level (${current_level}).`,
        );
      }
      const gapLevels = order.slice(
        from + 1,
        to + 1,
      ) as OfficialMaturityLevel[];
      const gap = gapLevels.map((lvl) => ({
        maturity: lvl,
        characteristics: artifact.actions
          .filter((a) => a.capability_slug === c.slug && a.maturity === lvl)
          .map((a) => a.text),
      }));
      const note =
        `Characteristics observed at each level above ${current_level} up to ${target_level} — ` +
        `use as assessment evidence, not as a to-do list. ${UNOFFICIAL_ACTIONS_NOTE}`;
      const hasPrereqs = [
        ...artifact.relationships_official,
        ...artifact.relationships_inferred,
      ].some((rel) => rel.type === "prerequisite" && rel.to === c.slug);
      return ok(
        {
          capability: c.slug,
          note,
          gap,
          related_prerequisites_hint: hasPrereqs
            ? `Run get_prerequisites(capability: "${c.slug}") to see which other capabilities this path leans on (inferred).`
            : `No prerequisite edges exist for ${c.slug} (the framework publishes none); get_related(capability: "${c.slug}") shows related capabilities instead.`,
        },
        `${note}\n\n` +
          gap
            .map(
              (g) =>
                `## ${g.maturity}\n${g.characteristics.map((t) => `- ${t}`).join("\n")}`,
            )
            .join("\n\n") +
          attribution(c.source_url),
      );
    },
  );

  // ---- map_personas -----------------------------------------------------------------------------
  server.registerTool(
    "map_personas",
    {
      title: "Persona ↔ capability matrix",
      description:
        "With `persona`: every capability that persona works in, WITH that persona's activity bullets inline (one call answers 'what does X do across the framework'). With `capability`: every persona active in it, with activities. With neither: the full persona index (slugs, categories) — use it to discover persona slugs. Allied personas are mapped at group level by the framework; responses say so explicitly.",
      inputSchema: {
        capability: z.string().optional(),
        persona: z.string().optional(),
      },
      outputSchema: {
        mode: z.enum(["persona", "capability", "index"]),
        note: z.string().optional(),
        personas: z
          .array(
            z.object({
              slug: z.string(),
              title: z.string(),
              category: z.string(),
            }),
          )
          .optional(),
        entries: z
          .array(
            z.object({
              capability: z.string().optional(),
              persona: z.string().optional(),
              heading: z.string(),
              activities: z.array(z.string()),
              group_level: z.boolean(),
            }),
          )
          .optional(),
      },
      annotations: RO,
    },
    ({ capability, persona }) => {
      if (capability && persona) {
        return err(
          "Pass capability OR persona, not both (or neither for the index).",
        );
      }
      if (!capability && !persona) {
        const personas = artifact.personas.map((p) => ({
          slug: p.slug,
          title: p.title,
          category: p.category,
        }));
        return ok(
          { mode: "index", personas },
          personas
            .map((p) => `- ${p.title} (${p.slug}) [${p.category}]`)
            .join("\n"),
        );
      }
      if (persona) {
        const p = artifact.personas.find(
          (x) => x.slug === persona.toLowerCase(),
        );
        if (!p) {
          return err(
            `Unknown persona "${persona}". Valid: ${artifact.personas.map((x) => x.slug).join(", ")}`,
          );
        }
        const namedOther = (item: string): string | undefined => {
          const m =
            item.match(/^\(([A-Za-z /]+)\)/) ??
            item.match(/^as an? ([a-z ]+?) persona/i);
          const named = m?.[1]?.trim().toLowerCase();
          if (!named) return undefined;
          const normalized = named.replace(/[^a-z]+/g, "-");
          return normalized !== p.slug && normalized.length > 2
            ? normalized
            : undefined;
        };
        const entries = artifact.capabilities.flatMap((c) =>
          c.functional_activities
            .filter(
              (f) =>
                (f.persona.kind !== "allied-group" &&
                  f.persona.persona_slug === p.slug) ||
                (p.category === "allied" && f.persona.kind === "allied-group"),
            )
            .map((f) => ({
              capability: c.slug,
              heading: f.heading,
              activities:
                f.persona.kind === "allied-group"
                  ? f.items.map((i) => {
                      const other = namedOther(i);
                      return other ? `[addressed to ${other}] ${i}` : i;
                    })
                  : f.items,
              group_level: f.persona.kind === "allied-group",
            })),
        );
        const note =
          p.category === "allied"
            ? `${p.title} is an allied persona: the framework maps capability activities to Allied Personas collectively (group_level: true) except where named individually.`
            : `Activities ${p.title} performs, per capability.`;
        return ok(
          { mode: "persona", note, entries },
          `${note}\n\n` +
            entries
              .map(
                (e) =>
                  `## ${e.capability}${e.group_level ? " (group-level)" : ""}\n` +
                  e.activities.map((a) => `- ${a}`).join("\n"),
              )
              .join("\n\n"),
        );
      }
      const c = findCapability(capability as string);
      if (isErr(c)) return c;
      const entries = c.functional_activities.map((f) => ({
        persona:
          f.persona.kind === "allied-group"
            ? "allied-personas (group)"
            : f.persona.persona_slug,
        heading: f.heading,
        activities: f.items,
        group_level: f.persona.kind === "allied-group",
      }));
      return ok(
        { mode: "capability", entries },
        entries
          .map(
            (e) =>
              `## ${e.persona}\n${e.activities.map((a) => `- ${a}`).join("\n")}`,
          )
          .join("\n\n"),
      );
    },
  );

  // ---- get_entity ------------------------------------------------------------
  // Tools-only parity for small entity types whose full text otherwise lives
  // only in resources (critique-2 M3').
  server.registerTool(
    "get_entity",
    {
      title: "Get full text of a small framework entity",
      description:
        "Full rendered markdown for entity types that have no dedicated tool. Required param: `entity_type` (principles | phases | domains | technology-categories | scopes | persona). Collections return whole (they are small); entity_type 'persona' also needs `slug`. For capabilities use get_capability; for KPIs get_kpis; for maturity levels get_maturity_model.",
      inputSchema: {
        entity_type: z.enum([
          "principles",
          "phases",
          "domains",
          "technology-categories",
          "scopes",
          "persona",
        ]),
        slug: z
          .string()
          .optional()
          .describe("Required for entity_type 'persona'; ignored otherwise"),
      },
      outputSchema: {
        entity_type: z.string(),
        slug: z.string().optional(),
        markdown: z.string(),
        uri: z.string(),
      },
      annotations: RO,
    },
    ({ entity_type, slug }) => {
      if (entity_type === "persona") {
        if (!slug) {
          return err(
            `entity_type "persona" needs a slug. Valid: ${artifact.personas.map((x) => x.slug).join(", ")}`,
          );
        }
        const p = artifact.personas.find((x) => x.slug === slug.toLowerCase());
        if (!p) {
          return err(
            `Unknown persona "${slug}". Valid: ${artifact.personas.map((x) => x.slug).join(", ")}`,
          );
        }
        const markdown = personaMd(artifact, p);
        return ok(
          {
            entity_type,
            slug: p.slug,
            markdown,
            uri: URI.persona(p.slug),
          },
          markdown,
        );
      }
      const uriByType: Record<string, string> = {
        principles: URI.principles,
        phases: URI.phases,
        domains: URI.domains,
        "technology-categories": URI.technologyCategories,
        scopes: URI.scopes,
      };
      const markdown = collectionMd(artifact, entity_type);
      return ok(
        { entity_type, markdown, uri: uriByType[entity_type] as string },
        markdown,
      );
    },
  );

  // ---- get_maturity_model -------------------------------------------------
  server.registerTool(
    "get_maturity_model",
    {
      title: "Get the maturity model",
      description:
        "The official FinOps maturity model: Crawl/Walk/Run with each level's characteristics and the community's sample goals/KPIs (e.g. allocation coverage targets per level), plus this server's flagged unofficial Pre-Crawl extension. Capability-agnostic — for one capability's per-level assessment use get_actions.",
      inputSchema: {},
      outputSchema: {
        official_levels: z.array(
          z.object({
            slug: z.string(),
            title: z.string(),
            characteristics_md: z.string(),
            sample_goals_md: z.string(),
            official: z.literal(true),
          }),
        ),
        unofficial_extension: z.object({
          slug: z.string(),
          title: z.string(),
          description_md: z.string(),
          official: z.literal(false),
        }),
      },
      annotations: RO,
    },
    () =>
      ok(
        {
          official_levels: artifact.maturity_levels.map((l) => ({
            slug: l.slug,
            title: l.title,
            characteristics_md: l.characteristics_md,
            sample_goals_md: l.sample_goals_md,
            official: true as const,
          })),
          unofficial_extension: {
            slug: artifact.maturity_extension.slug,
            title: artifact.maturity_extension.title,
            description_md: artifact.maturity_extension.description_md,
            official: false as const,
          },
        },
        artifact.maturity_levels
          .map(
            (l) =>
              `## ${l.title} (official)\n**Characteristics**\n${l.characteristics_md}\n**Sample goals/KPIs**\n${l.sample_goals_md}`,
          )
          .join("\n\n") +
          `\n\n## ${artifact.maturity_extension.title}\n${artifact.maturity_extension.description_md}` +
          attribution(
            artifact.maturity_levels[0]?.source_url ??
              "https://www.finops.org/framework/maturity-model/",
          ),
      ),
  );

  // ---- get_changelog ------------------------------------------------------------------------------
  server.registerTool(
    "get_changelog",
    {
      title: "Data changelog",
      description:
        "What changed between data versions of this server's crawled artifact (rolling window of the 20 most recent refreshes — the crawler caps the log at 20, so this tool covers the full retained history; the same data is at finops://framework/meta/changelog). Reflects crawl-to-crawl differences in finops.org content, not a Foundation-published changelog.",
      inputSchema: {
        limit: z.number().int().min(1).max(20).default(5),
      },
      outputSchema: {
        current_version: z.string(),
        entries: z.array(
          z.object({
            data_version: z.string(),
            crawled_at: z.string(),
            summary: z.string(),
            added: z.array(z.string()),
            removed: z.array(z.string()),
            changed: z.array(z.string()),
          }),
        ),
      },
      annotations: RO,
    },
    ({ limit }) => {
      const entries = artifact.changelog.slice(0, limit ?? 5);
      return ok(
        { current_version: dataVersion, entries },
        entries
          .map(
            (e) =>
              `- v${e.data_version} (${e.crawled_at.slice(0, 10)}): ${e.summary}`,
          )
          .join("\n"),
      );
    },
  );
}
