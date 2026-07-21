import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import type { Artifact } from "../../shared/index.js";
import { nearestMatches } from "../../shared/index.js";
import {
  capabilityMd,
  collectionMd,
  kpiMd,
  maturityLevelMd,
  overviewMd,
  personaMd,
} from "./render.js";
import { TEMPLATES, URI } from "./uris.js";

const RESOURCE_NOT_FOUND = -32002;

function notFound(
  uri: string,
  kind: string,
  input: string,
  candidates: string[],
): never {
  const near = nearestMatches(input, candidates);
  throw new McpError(
    RESOURCE_NOT_FOUND,
    `Resource not found: unknown ${kind} "${input}"` +
      (near.length ? ` — did you mean: ${near.join(", ")}?` : ""),
    { uri },
  );
}

const MD = "text/markdown";
const JSONM = "application/json";

export function registerResources(server: McpServer, artifact: Artifact): void {
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
    (uri) => text(uri.href, overviewMd(artifact)),
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
      "Official Crawl/Walk/Run levels plus the flagged Pre-Crawl extension",
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
      "All 11 personas (6 core + 5 allied)",
      "personas-index",
    ],
    [
      "capabilities-index",
      URI.capabilitiesIndex,
      "All 22 capabilities grouped by domain",
      "capabilities-index",
    ],
  ];
  for (const [name, uri, description, which] of collections) {
    server.registerResource(
      name,
      uri,
      { title: description, description, ...std() },
      (u) => text(u.href, collectionMd(artifact, which)),
    );
  }

  // Concrete per-entity resources (critique m7) + templates for completion.
  for (const c of artifact.capabilities) {
    server.registerResource(
      `capability-${c.slug}`,
      URI.capability(c.slug),
      { title: c.title, description: c.summary.slice(0, 180), ...std() },
      (u) => text(u.href, capabilityMd(artifact, c)),
    );
  }
  for (const p of artifact.personas) {
    server.registerResource(
      `persona-${p.slug}`,
      URI.persona(p.slug),
      {
        title: `${p.title} persona`,
        description: `${p.category} persona`,
        ...std(),
      },
      (u) => text(u.href, personaMd(artifact, p)),
    );
  }

  const capSlugs = artifact.capabilities.map((c) => c.slug);
  const kpiSlugs = artifact.kpis.map((k) => k.slug);
  const levels = ["pre-crawl", "crawl", "walk", "run"];

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
      description:
        "One capability's assessment at one level (pre-crawl|crawl|walk|run), with parsed characteristics.",
      ...std(),
    },
    (uri, vars) => {
      const slug = String(vars.slug);
      const level = String(vars.level);
      const c = artifact.capabilities.find((x) => x.slug === slug);
      if (!c) notFound(uri.href, "capability", slug, capSlugs);
      if (!levels.includes(level))
        notFound(uri.href, "maturity level", level, levels);
      return text(uri.href, maturityLevelMd(artifact, c, level as "crawl"));
    },
  );

  server.registerResource(
    "kpi",
    new ResourceTemplate(TEMPLATES.kpi, {
      list: undefined,
      complete: {
        slug: (v) => kpiSlugs.filter((s) => s.startsWith(v)).slice(0, 20),
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
    "graph",
    URI.graph,
    {
      title: "Capability relationship graph",
      description:
        "All edges, official and inferred strictly partitioned; inferred edges carry evidence quotes and confidence.",
      mimeType: JSONM,
      annotations: { lastModified },
    },
    (u) =>
      text(
        u.href,
        JSON.stringify(
          {
            note: "official = harvested from finops.org page evidence; inferred = unofficial extension, see evidence_quote/confidence/heuristic per edge",
            official: artifact.relationships_official,
            inferred: artifact.relationships_inferred,
          },
          null,
          2,
        ),
        JSONM,
      ),
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
