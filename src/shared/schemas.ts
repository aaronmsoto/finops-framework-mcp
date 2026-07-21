// JSON Schemas for every artifact file. Single source of truth: the crawler
// emits these into data/framework/schema/ and the server validates the
// artifact against them at startup (docs/architecture.md §4).

export const SCHEMA_VERSION = "1.0.0";

const provenanceProps = {
  source_url: { type: "string", format: "uri" },
  license: { const: "CC-BY-4.0" },
} as const;
const provenanceRequired = ["source_url", "license"] as const;

const officialMaturity = { enum: ["crawl", "walk", "run"] } as const;

function arrayOf(items: unknown): Record<string, unknown> {
  return { type: "array", items };
}

const stringArray = arrayOf({ type: "string" });

function entitySchema(
  id: string,
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `finops-framework-mcp/${id}`,
    ...(properties.type !== undefined ? {} : {}),
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function collectionSchema(
  id: string,
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `finops-framework-mcp/${id}`,
    type: "array",
    items: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
}

export const principlesSchema = collectionSchema(
  "principles",
  {
    slug: { type: "string" },
    title: { type: "string" },
    description_md: { type: "string", minLength: 1 },
    order: { type: "integer" },
    ...provenanceProps,
  },
  ["slug", "title", "description_md", "order", ...provenanceRequired],
);

export const phasesSchema = collectionSchema(
  "phases",
  {
    slug: { type: "string" },
    title: { type: "string" },
    description_md: { type: "string", minLength: 1 },
    order: { type: "integer" },
    ...provenanceProps,
  },
  ["slug", "title", "description_md", "order", ...provenanceRequired],
);

export const domainsSchema = collectionSchema(
  "domains",
  {
    slug: { type: "string" },
    title: { type: "string" },
    description_md: { type: "string", minLength: 1 },
    capability_slugs: { ...stringArray, minItems: 1 },
    ...provenanceProps,
  },
  [
    "slug",
    "title",
    "description_md",
    "capability_slugs",
    ...provenanceRequired,
  ],
);

export const capabilitiesSchema = collectionSchema(
  "capabilities",
  {
    slug: { type: "string" },
    title: { type: "string" },
    wp_id: { type: "integer" },
    domain_slug: { type: "string" },
    summary: { type: "string" },
    definition_md: { type: "string", minLength: 1 },
    headline_groups: arrayOf({
      type: "object",
      properties: { label: { type: "string" }, items: stringArray },
      required: ["label", "items"],
      additionalProperties: false,
    }),
    maturity_raw: {
      type: "object",
      properties: {
        crawl: { type: "string", minLength: 1 },
        walk: { type: "string", minLength: 1 },
        run: { type: "string", minLength: 1 },
      },
      required: ["crawl", "walk", "run"],
      additionalProperties: false,
    },
    functional_activities: {
      ...arrayOf({
        type: "object",
        properties: {
          persona: {
            type: "object",
            properties: {
              kind: { enum: ["core", "allied", "allied-group"] },
              persona_slug: { type: "string" },
            },
            required: ["kind"],
            additionalProperties: false,
          },
          heading: { type: "string" },
          items: stringArray,
        },
        required: ["persona", "heading", "items"],
        additionalProperties: false,
      }),
      minItems: 1,
    },
    kpi_bullets: stringArray,
    example_kpis: arrayOf({
      type: "object",
      properties: { objective: { type: "string" }, kpi: { type: "string" } },
      required: ["objective", "kpi"],
      additionalProperties: false,
    }),
    inputs_outputs_md: { type: "string" },
    featured_kpi_ids: arrayOf({ type: "integer" }),
    ...provenanceProps,
  },
  [
    "slug",
    "title",
    "wp_id",
    "domain_slug",
    "summary",
    "definition_md",
    "headline_groups",
    "maturity_raw",
    "functional_activities",
    "kpi_bullets",
    "example_kpis",
    "inputs_outputs_md",
    "featured_kpi_ids",
    ...provenanceRequired,
  ],
);

export const personasSchema = collectionSchema(
  "personas",
  {
    slug: { type: "string" },
    title: { type: "string" },
    category: { enum: ["core", "allied"] },
    description_md: { type: "string", minLength: 1 },
    ...provenanceProps,
  },
  ["slug", "title", "category", "description_md", ...provenanceRequired],
);

export const scopesSchema = entitySchema(
  "scopes",
  {
    title: { type: "string" },
    sections: {
      ...arrayOf({
        type: "object",
        properties: {
          heading: { type: "string" },
          body_md: { type: "string" },
        },
        required: ["heading", "body_md"],
        additionalProperties: false,
      }),
      minItems: 1,
    },
    ...provenanceProps,
  },
  ["title", "sections", ...provenanceRequired],
);

export const technologyCategoriesSchema = collectionSchema(
  "technology-categories",
  {
    slug: { type: "string" },
    title: { type: "string" },
    description_md: { type: "string", minLength: 1 },
    ...provenanceProps,
  },
  ["slug", "title", "description_md", ...provenanceRequired],
);

export const maturityLevelsSchema = collectionSchema(
  "maturity-levels",
  {
    slug: officialMaturity,
    title: { type: "string" },
    characteristics_md: { type: "string", minLength: 1 },
    sample_goals_md: { type: "string" },
    official: { const: true },
    ...provenanceProps,
  },
  [
    "slug",
    "title",
    "characteristics_md",
    "sample_goals_md",
    "official",
    ...provenanceRequired,
  ],
);

export const maturityExtensionSchema = entitySchema(
  "maturity-extension",
  {
    slug: { const: "pre-crawl" },
    title: { const: "Pre-Crawl (unofficial extension)" },
    description_md: { type: "string", minLength: 1 },
    official: { const: false },
  },
  ["slug", "title", "description_md", "official"],
);

export const kpisSchema = collectionSchema(
  "kpis",
  {
    slug: { type: "string" },
    title: { type: "string" },
    wp_id: { type: "integer" },
    description_md: { type: "string", minLength: 1 },
    formula: { type: "string" },
    data_sources: stringArray,
    related_capability_slugs: stringArray,
    featured_on: stringArray,
    ...provenanceProps,
  },
  [
    "slug",
    "title",
    "wp_id",
    "description_md",
    "data_sources",
    "related_capability_slugs",
    "featured_on",
    ...provenanceRequired,
  ],
);

export const actionsSchema = collectionSchema(
  "actions",
  {
    capability_slug: { type: "string" },
    maturity: officialMaturity,
    text: { type: "string", minLength: 1 },
    ordinal: { type: "integer" },
    parent_ordinal: { type: "integer" },
    official: { const: false },
    parse_quality: { enum: ["itemized", "raw_fallback"] },
  },
  [
    "capability_slug",
    "maturity",
    "text",
    "ordinal",
    "official",
    "parse_quality",
  ],
);

export const relationshipsSchema = collectionSchema(
  "relationships",
  {
    from: { type: "string" },
    to: { type: "string" },
    type: { enum: ["prerequisite", "informs", "related"] },
    from_maturity: officialMaturity,
    to_min_maturity: officialMaturity,
    source: { enum: ["official", "inferred"] },
    evidence_url: { type: "string", format: "uri" },
    evidence_quote: { type: "string" },
    heuristic: { type: "string" },
    confidence: { enum: ["strong", "moderate", "weak"] },
    rationale: { type: "string" },
  },
  ["from", "to", "type", "source"],
);

export const changelogSchema = collectionSchema(
  "changelog",
  {
    data_version: { type: "string" },
    crawled_at: { type: "string" },
    summary: { type: "string" },
    added: stringArray,
    removed: stringArray,
    changed: stringArray,
  },
  ["data_version", "crawled_at", "summary", "added", "removed", "changed"],
);

export const manifestSchema = entitySchema(
  "manifest",
  {
    data_version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    schema_version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    crawled_at: { type: "string" },
    source_urls: stringArray,
    sha256: {
      type: "object",
      additionalProperties: { type: "string", pattern: "^[0-9a-f]{64}$" },
    },
    counts: {
      type: "object",
      properties: {
        principles: { type: "integer" },
        phases: { type: "integer" },
        domains: { type: "integer" },
        capabilities: { type: "integer" },
        personas: { type: "integer" },
        technology_categories: { type: "integer" },
        maturity_levels: { type: "integer" },
        kpis: { type: "integer" },
      },
      required: [
        "principles",
        "phases",
        "domains",
        "capabilities",
        "personas",
        "technology_categories",
        "maturity_levels",
        "kpis",
      ],
      additionalProperties: false,
    },
    counts_mismatch: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          expected: { type: "integer" },
          actual: { type: "integer" },
        },
        required: ["expected", "actual"],
        additionalProperties: false,
      },
    },
    parse_warnings: stringArray,
  },
  [
    "data_version",
    "schema_version",
    "crawled_at",
    "source_urls",
    "sha256",
    "counts",
    "parse_warnings",
  ],
);

/** Artifact file path (relative to artifact root) → schema. */
export const ARTIFACT_FILES: Record<string, Record<string, unknown>> = {
  "manifest.json": manifestSchema,
  "content/principles.json": principlesSchema,
  "content/phases.json": phasesSchema,
  "content/domains.json": domainsSchema,
  "content/capabilities.json": capabilitiesSchema,
  "content/personas.json": personasSchema,
  "content/scopes.json": scopesSchema,
  "content/technology-categories.json": technologyCategoriesSchema,
  "content/maturity-levels.json": maturityLevelsSchema,
  "content/kpis.json": kpisSchema,
  "derived/actions.json": actionsSchema,
  "derived/maturity-extension.json": maturityExtensionSchema,
  "derived/relationships-official.json": relationshipsSchema,
  "derived/relationships-inferred.json": relationshipsSchema,
  "derived/changelog.json": changelogSchema,
};

/** Schema file name (under schema/) for an artifact file path. */
export function schemaFileFor(artifactPath: string): string {
  const base = artifactPath.split("/").pop() as string;
  return base.replace(/\.json$/, ".schema.json");
}
