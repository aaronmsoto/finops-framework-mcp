// JSON Schemas for the FOCUS spec artifact (data/focus/{version}/). Single
// source of truth for the server's loadArtifactGeneric (T-028) call — the
// crawler (src/crawlers/focus/) emits data matching these shapes.

const provenanceProps = {
  source_url: { type: "string", format: "uri" },
  license: { const: "CC-BY-4.0" },
} as const;
const provenanceRequired = ["source_url", "license"] as const;

const stringArray = { type: "array", items: { type: "string" } } as const;
const nullableString = { type: ["string", "null"] } as const;
const parseQuality = { enum: ["parsed", "markdown_only"] } as const;

function collectionSchema(
  id: string,
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `focus-spec-mcp/${id}`,
    type: "array",
    items: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
}

export const focusColumnsSchema = collectionSchema(
  "columns",
  {
    id: { type: "string" },
    slug: { type: "string" },
    display_name: { type: "string" },
    description_md: { type: "string" },
    column_type: { enum: ["Metric", "Dimension", "unknown"] },
    feature_level: {
      enum: ["Mandatory", "Conditional", "Recommended", "unknown"],
    },
    allows_nulls: { type: ["boolean", "null"] },
    data_type: nullableString,
    value_format_md: nullableString,
    number_range: nullableString,
    allowed_values: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          description: { type: "string" },
        },
        required: ["value", "description"],
        additionalProperties: false,
      },
    },
    requirements: stringArray,
    introduced_version: nullableString,
    parse_quality: parseQuality,
    ...provenanceProps,
  },
  [
    "id",
    "slug",
    "display_name",
    "description_md",
    "column_type",
    "feature_level",
    "allows_nulls",
    "data_type",
    "value_format_md",
    "number_range",
    "allowed_values",
    "requirements",
    "introduced_version",
    "parse_quality",
    ...provenanceRequired,
  ],
);

export const focusAttributesSchema = collectionSchema(
  "attributes",
  {
    id: { type: "string" },
    slug: { type: "string" },
    display_name: { type: "string" },
    description_md: { type: "string" },
    requirements: stringArray,
    exceptions_md: nullableString,
    introduced_version: nullableString,
    parse_quality: parseQuality,
    ...provenanceProps,
  },
  [
    "id",
    "slug",
    "display_name",
    "description_md",
    "requirements",
    "exceptions_md",
    "introduced_version",
    "parse_quality",
    ...provenanceRequired,
  ],
);

const ingestReportSchema = {
  type: "object",
  properties: {
    parsed: { type: "integer" },
    markdown_only: { type: "integer" },
  },
  required: ["parsed", "markdown_only"],
  additionalProperties: false,
} as const;

export const focusVersionManifestSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focus-spec-mcp/manifest",
  type: "object",
  properties: {
    spec_version: { type: "string" },
    source_tag: { type: "string" },
    data_version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    crawled_at: { type: "string" },
    source_urls: stringArray,
    counts: {
      type: "object",
      properties: {
        columns: { type: "integer" },
        attributes: { type: "integer" },
      },
      required: ["columns", "attributes"],
      additionalProperties: false,
    },
    ingest_report: {
      type: "object",
      properties: {
        columns: ingestReportSchema,
        attributes: ingestReportSchema,
      },
      required: ["columns", "attributes"],
      additionalProperties: false,
    },
    parse_warnings: stringArray,
    sha256: {
      type: "object",
      additionalProperties: { type: "string", pattern: "^[0-9a-f]{64}$" },
    },
  },
  required: [
    "spec_version",
    "source_tag",
    "data_version",
    "crawled_at",
    "source_urls",
    "counts",
    "ingest_report",
    "parse_warnings",
    "sha256",
  ],
  additionalProperties: false,
} as const;

/** Per-version artifact file path (relative to data/focus/{version}/) → schema. */
export const FOCUS_ARTIFACT_FILES: Record<string, Record<string, unknown>> = {
  "manifest.json": focusVersionManifestSchema,
  "columns.json": focusColumnsSchema,
  "attributes.json": focusAttributesSchema,
};
