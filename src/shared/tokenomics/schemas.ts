// JSON Schemas for the Tokenomics Foundation artifact (data/tokenomics/).
// Single source of truth for loadTokenomicsArtifact and the crawler's
// pre-emit validation; mirrors the entity types in ./types.ts.

const S = "https://json-schema.org/draft/2020-12/schema";
const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
const strArr = { type: "array", items: str } as const;
const bool = { type: "boolean" } as const;
const int = { type: "integer" } as const;

const provenance = {
  type: "object",
  properties: {
    document: str,
    section: nstr,
    source_url: { type: "string", format: "uri" },
    license: { const: "CC-BY-4.0" },
  },
  required: ["document", "section", "source_url", "license"],
  additionalProperties: false,
} as const;

function obj(
  properties: Record<string, unknown>,
  required: string[] = Object.keys(properties),
): Record<string, unknown> {
  return { type: "object", properties, required, additionalProperties: false };
}

function collection(
  id: string,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    $schema: S,
    $id: `tokenomics-overview-mcp/${id}`,
    type: "array",
    items: obj(properties),
  };
}

function root(
  id: string,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    $schema: S,
    $id: `tokenomics-overview-mcp/${id}`,
    ...obj(properties),
  };
}

export const documentsSchema = collection("documents", {
  slug: str,
  title: str,
  url: { type: "string", format: "uri" },
  kind: { enum: ["docs", "project", "paper", "insight"] },
  status: str,
  status_source: { enum: ["page", "registry"] },
  status_date: nstr,
  modified: nstr,
  author: nstr,
  license: { const: "CC-BY-4.0" },
  sections: { type: "array", items: obj({ id: str, title: str }) },
  word_count: int,
});

export const stagesSchema = collection("stages", {
  slug: str,
  name: str,
  scope: str,
  key_question: str,
  provenance,
});

export const layersSchema = collection("layers", {
  slug: str,
  number: int,
  name: str,
  table_label: str,
  multiplier_effect: str,
  moves_multiplier: bool,
  key_metric: str,
  primary_levers: strArr,
  description_md: str,
  components: { type: "array", items: obj({ name: str, items: strArr }) },
  tooling_md: nstr,
  provenance,
});

export const bigtSchema = root("bigt", {
  notation: str,
  expansion: str,
  variables: {
    type: "array",
    items: obj({ symbol: str, name: str, description: str, provenance }),
  },
  classes: {
    type: "array",
    items: obj({
      slug: str,
      order: int,
      notation: str,
      name: str,
      headline: str,
      description: str,
      fix: str,
      provenance,
    }),
  },
});

export const leversSchema = collection("levers", {
  slug: str,
  name: str,
  kind: {
    enum: [
      "stack-primary-lever",
      "bigt-lever",
      "architectural-approach",
      "worked-example-step",
    ],
  },
  layer: { type: ["integer", "null"] },
  bigt_classes: strArr,
  description_md: str,
  effect: nstr,
  provenance,
});

export const metricsSchema = collection("metrics", {
  slug: str,
  name: str,
  formula: nstr,
  formula_text: nstr,
  definition_md: str,
  targets: strArr,
  inputs: strArr,
  provenance,
});

export const personasSchema = collection("personas", {
  slug: str,
  name: str,
  core: bool,
  stages: strArr,
  responsibility: str,
  description_md: str,
  signals: strArr,
  provenance,
});

export const valueSchema = root("value", {
  categories: {
    type: "array",
    items: obj({
      slug: str,
      name: str,
      group: str,
      description: str,
      estimate_as: nstr,
      provenance,
    }),
  },
  booking_destinations: {
    type: "array",
    items: obj({ slug: str, name: str, description: str, provenance }),
  },
});

export const glossarySchema = collection("glossary", {
  slug: str,
  term: str,
  definition: str,
  provenance,
});

export const focusTrackerSchema = collection("focus-tracker", {
  slug: str,
  title: str,
  bucket: { enum: ["done", "flight", "consider", "out"] },
  kind: str,
  labels: strArr,
  identifiers: strArr,
  body_md: str,
  links: strArr,
  provenance,
});

export const cacheProvidersSchema = collection("cache-providers", {
  slug: str,
  provider: str,
  write_charge: str,
  read_charge: str,
  minimum_prefix: str,
  lifetime_notes: str,
  reviewed: str,
  provenance,
});

const entityRef = obj({
  type: {
    enum: [
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
    ],
  },
  slug: str,
});
const crossTarget = obj({
  server: { enum: ["framework", "focus", "focus-working-draft"] },
  kind: str,
  id: str,
  uri: nstr,
});

export const crosslinksSchema = collection("crosslinks", {
  from: entityRef,
  target: crossTarget,
  evidence: str,
  document: str,
  source_url: { type: "string", format: "uri" },
  official: { const: true },
});

export const crosswalkSchema = collection("crosswalk", {
  from: entityRef,
  target: crossTarget,
  rationale: str,
  official: { const: false },
});

export const changelogSchema = collection("changelog", {
  data_version: str,
  crawled_at: str,
  added: strArr,
  removed: strArr,
  changed: strArr,
});

export const manifestSchema = root("manifest", {
  data_version: str,
  schema_version: str,
  crawled_at: str,
  source_urls: strArr,
  sha256: { type: "object", additionalProperties: str },
  counts: { type: "object", additionalProperties: int },
  parse_warnings: strArr,
  unregistered: strArr,
});

/** Every JSON file in the artifact → its schema (the loader validates all). */
export const TOKENOMICS_ARTIFACT_FILES: Record<
  string,
  Record<string, unknown>
> = {
  "manifest.json": manifestSchema,
  "content/documents.json": documentsSchema,
  "content/stages.json": stagesSchema,
  "content/layers.json": layersSchema,
  "content/bigt.json": bigtSchema,
  "content/levers.json": leversSchema,
  "content/metrics.json": metricsSchema,
  "content/personas.json": personasSchema,
  "content/value.json": valueSchema,
  "content/glossary.json": glossarySchema,
  "content/focus-tracker.json": focusTrackerSchema,
  "content/cache-providers.json": cacheProvidersSchema,
  "derived/crosslinks.json": crosslinksSchema,
  "derived/crosswalk.json": crosswalkSchema,
  "derived/changelog.json": changelogSchema,
};

export const TOKENOMICS_SCHEMA_VERSION = "1.0.0";
