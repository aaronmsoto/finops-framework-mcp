import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Artifact } from "../../shared/index.js";
import { notFound } from "../../shared/mcp-not-found.js";
import {
  ALL_MATURITY_LEVELS,
  OFFICIAL_MATURITY_LEVELS,
} from "../../shared/types.js";
import type { ServerOptions } from "./server.js";
import {
  capabilityMd,
  collectionMd,
  kpiMd,
  maturityLevelMd,
  overviewMd,
  personaMd,
} from "./render.js";
import { TEMPLATES, URI } from "./uris.js";

const MD = "text/markdown";
const JSONM = "application/json";

export function registerResources(
  server: McpServer,
  artifact: Artifact,
  opts: ServerOptions = {},
): void {
  const experimental = opts.experimental ?? false;
  const lastModified = artifact.manifest.crawled_at;
  const std = (extra?: Record<string, unknown>) => ({
    mimeType: MD,
    annotations: { lastModified, ...(extra ?? {}) },
  });
  const text = (uri: string, body: string, mimeType = MD) => ({
    contents: [{ uri, mimeType, text: body }],
  });

  server.registerResource(
    "overview",
    URI.overview,
    {
      title: "FinOps Framework overview",
      description:
        "Start here: what the framework contains and how to navigate this server.",
      ...std({ priority: 0.9 }),
    },
    (uri) => text(uri.href, overviewMd(artifact, experimental)),
  );

  const collections: [
    string,
    string,
    string,
    Parameters<typeof collectionMd>[1],
  ][] = [
    ["principles", URI.principles, "The 6 FinOps Principles", "principles"],
    [
      "phases",
      URI.phases,
      "The 3 FinOps Phases (iterative lifecycle)",
      "phases",
    ],
    [
      "domains",
      URI.domains,
      "The 4 FinOps Domains with their capabilities",
      "domains",
    ],
    [
      "technology-categories",
      URI.technologyCategories,
      "The 5 Technology Categories (FinOps for Cloud/SaaS/AI/Data Center/Data Cloud)",
      "technology-categories",
    ],
    [
      "maturity-model",
      URI.maturityModel,
      experimental
        ? "Official Crawl/Walk/Run levels plus the flagged Pre-Crawl extension"
        : "Official Crawl/Walk/Run maturity levels",
      "maturity-model",
    ],
    [
      "scopes",
      URI.scopes,
      "FinOps Scopes — conceptual guidance document",
      "scopes",
    ],
    [
      "personas-index",
      URI.personasIndex,
      `All ${artifact.personas.length} personas ` +
        `(${artifact.personas.filter((p) => p.category === "core").length} core + ` +
        `${artifact.personas.filter((p) => p.category === "allied").length} allied)`,
      "personas-index",
    ],
    [
      "capabilities-index",
      URI.capabilitiesIndex,
      `All ${artifact.capabilities.length} capabilities grouped by domain`,
      "capabilities-index",
    ],
  ];
  for (const [name, uri, description, which] of collections) {
    server.registerResource(
      name,
      uri,
      { title: description, description, ...std() },
      (u) => text(u.href, collectionMd(artifact, which, experimental)),
    );
  }

  const capSlugs = artifact.capabilities.map((c) => c.slug);
  const kpiSlugs = artifact.kpis.map((k) => k.slug);
  const levels: string[] = experimental
    ? [...ALL_MATURITY_LEVELS]
    : [...OFFICIAL_MATURITY_LEVELS];

  // Capability and persona docs are templates WITH list callbacks: every
  // concrete entry still appears in resources/list (critique m7), and any
  // slug miss routes through notFound() for the -32002 + suggestions
  // contract instead of the SDK's generic -32602 (critique-2 M2').
  server.registerResource(
    "capability",
    new ResourceTemplate(TEMPLATES.capability, {
      list: () => ({
        resources: artifact.capabilities.map((c) => ({
          uri: URI.capability(c.slug),
          name: c.title,
          description: c.summary.slice(0, 180),
          mimeType: MD,
        })),
      }),
      complete: { slug: (v) => capSlugs.filter((s) => s.startsWith(v)) },
    }),
    {
      title: "Capability document",
      description:
        "Full capability document: definition, maturity assessments, activities, KPIs, inputs/outputs.",
      ...std(),
    },
    (uri, vars) => {
      const slug = String(vars.slug);
      const c = artifact.capabilities.find((x) => x.slug === slug);
      if (!c) notFound(uri.href, "capability", slug, capSlugs);
      return text(uri.href, capabilityMd(artifact, c));
    },
  );
  server.registerResource(
    "persona",
    new ResourceTemplate(TEMPLATES.persona, {
      list: () => ({
        resources: artifact.personas.map((p) => ({
          uri: URI.persona(p.slug),
          name: `${p.title} persona`,
          description: `${p.category} persona`,
          mimeType: MD,
        })),
      }),
      complete: {
        slug: (v) =>
          artifact.personas.map((p) => p.slug).filter((s) => s.startsWith(v)),
      },
    }),
    {
      title: "Persona document",
      description:
        "One persona's goals, objectives, and capability involvement.",
      ...std(),
    },
    (uri, vars) => {
      const slug = String(vars.slug);
      const p = artifact.personas.find((x) => x.slug === slug);
      if (!p)
        notFound(
          uri.href,
          "persona",
          slug,
          artifact.personas.map((x) => x.slug),
        );
      return text(uri.href, personaMd(artifact, p));
    },
  );

  server.registerResource(
    "capability-maturity",
    new ResourceTemplate(TEMPLATES.capabilityMaturity, {
      list: undefined,
      complete: {
        slug: (v) => capSlugs.filter((s) => s.startsWith(v)),
        level: (v) => levels.filter((l) => l.startsWith(v)),
      },
    }),
    {
      title: "Capability maturity level",
      description: experimental
        ? "One capability's assessment at one level (pre-crawl|crawl|walk|run), with parsed characteristics."
        : "One capability's official assessment text at one level (crawl|walk|run).",
      ...std(),
    },
    (uri, vars) => {
      const slug = String(vars.slug);
      const level = String(vars.level);
      const c = artifact.capabilities.find((x) => x.slug === slug);
      if (!c) notFound(uri.href, "capability", slug, capSlugs);
      if (!levels.includes(level))
        notFound(uri.href, "maturity level", level, levels);
      return text(
        uri.href,
        maturityLevelMd(artifact, c, level as "crawl", experimental),
      );
    },
  );

  server.registerResource(
    "kpi",
    new ResourceTemplate(TEMPLATES.kpi, {
      list: undefined,
      complete: {
        slug: (v) => kpiSlugs.filter((s) => s.startsWith(v)),
      },
    }),
    {
      title: "KPI library entry",
      description:
        "Full KPI record: description, formula, data sources, related capabilities.",
      ...std(),
    },
    (uri, vars) => {
      const slug = String(vars.slug);
      const k = artifact.kpis.find((x) => x.slug === slug);
      if (!k) notFound(uri.href, "KPI", slug, kpiSlugs);
      return text(uri.href, kpiMd(artifact, k));
    },
  );

  server.registerResource(
    "manifest",
    URI.manifest,
    {
      title: "Data manifest",
      description:
        "Data/schema versions, crawl date, counts, source URLs, attribution.",
      mimeType: JSONM,
      annotations: { lastModified },
    },
    (u) => text(u.href, JSON.stringify(artifact.manifest, null, 2), JSONM),
  );

  server.registerResource(
    "changelog",
    URI.changelog,
    {
      title: "Crawl changelog",
      description:
        "Rolling per-crawl diff summaries (what changed between data versions).",
      mimeType: JSONM,
      annotations: { lastModified },
    },
    (u) => text(u.href, JSON.stringify(artifact.changelog, null, 2), JSONM),
  );
}
