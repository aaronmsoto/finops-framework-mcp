import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  FocusStore,
  FocusVersionArtifact,
} from "../../shared/focus/artifact.js";
import {
  calculableKpiSlugs,
  calculateKpi,
  hasFormula,
} from "../../shared/focus/kpi-calc.js";
import type {
  FocusSampleKind,
  KpiMappingEntry,
} from "../../shared/focus/types.js";
import { parseCsv } from "../../shared/focus/validate.js";
import { nearestMatches } from "../../shared/slugs.js";
import {
  cursorContext,
  err,
  isErr,
  ok,
  paginate as genericPaginate,
  RO,
  type ToolResult,
} from "../../shared/tools.js";
import { attributeMd, columnMd, footer } from "./render.js";
import { buildSearchIndex, search } from "./search.js";
import { FRAMEWORK_KPI_URI, URI } from "./uris.js";

export const DEFAULT_VERSION = "1.2";

const FEATURE_LEVELS = [
  "Mandatory",
  "Conditional",
  "Recommended",
  "unknown",
] as const;
const COLUMN_TYPES = ["Metric", "Dimension", "unknown"] as const;
const ENTITY_TYPES = ["column", "attribute"] as const;
const KPI_CATEGORIES = [
  "effective_savings_rate",
  "commitment_discounts",
  "forecast_accuracy",
  "unit_economics",
  "allocation",
  "variance",
] as const;

const KPI_MAPPING_BANNER =
  "UNOFFICIAL: this KPI→FOCUS column mapping is derived by this server " +
  "— it is not published or endorsed by the FinOps Foundation or the FOCUS project.";

const SAMPLE_KINDS = ["official", "synthetic"] as const;

const CALCULATION_BANNER =
  "UNOFFICIAL CALCULATION: this value is computed by this server from its own derived FOCUS-terms " +
  "formula (see get_kpi_mapping) — not published, reviewed, or endorsed by the FinOps Foundation or " +
  "the FOCUS project. Computed over bundled sample data only, never user-supplied data.";

const sampleProvenanceSchema = {
  kind: z.enum(SAMPLE_KINDS),
  version: z.string(),
  row_count: z.number(),
  license: z.literal("CC-BY-4.0"),
  source_url: z.string().nullable(),
  seed: z.number().nullable(),
  note: z.string(),
};

const kpiMappingRowSchema = {
  kpi_slug: z.string(),
  kpi_title: z.string(),
  kpi_uri: z.string(),
  official: z.literal(false),
  category: z.enum(KPI_CATEGORIES),
  related_capability_slugs: z.array(z.string()),
  focus_formula: z.string(),
  columns: z.array(z.string()),
  caveat: z.string().nullable(),
};

const columnRecordSchema = {
  id: z.string(),
  slug: z.string(),
  display_name: z.string(),
  description_md: z.string(),
  column_type: z.enum(COLUMN_TYPES),
  feature_level: z.enum(FEATURE_LEVELS),
  allows_nulls: z.boolean().nullable(),
  data_type: z.string().nullable(),
  value_format_md: z.string().nullable(),
  number_range: z.string().nullable(),
  allowed_values: z
    .array(z.object({ value: z.string(), description: z.string() }))
    .nullable(),
  requirements: z.array(z.string()),
  introduced_version: z.string().nullable(),
  source_url: z.string(),
  license: z.literal("CC-BY-4.0"),
  parse_quality: z.enum(["parsed", "markdown_only"]),
};

const attributeRecordSchema = {
  id: z.string(),
  slug: z.string(),
  display_name: z.string(),
  description_md: z.string(),
  requirements: z.array(z.string()),
  exceptions_md: z.string().nullable(),
  introduced_version: z.string().nullable(),
  source_url: z.string(),
  license: z.literal("CC-BY-4.0"),
  parse_quality: z.enum(["parsed", "markdown_only"]),
};

export function registerTools(server: McpServer, store: FocusStore): void {
  const versionSlugs = store.index.versions.map((v) => v.spec_version);
  const searchIndexByVersion = new Map(
    [...store.versions.entries()].map(([v, a]) => [v, buildSearchIndex(v, a)]),
  );
  const columnCountsBySpec = versionSlugs
    .map((v) => `${store.versions.get(v)?.columns.length} in ${v}`)
    .join(", ");

  function resolveVersion(
    version: string | undefined,
  ): { version: string; artifact: FocusVersionArtifact } | ToolResult {
    const v = version ?? DEFAULT_VERSION;
    const artifact = store.versions.get(v);
    if (artifact) return { version: v, artifact };
    const near = nearestMatches(v, versionSlugs);
    return err(
      `Unknown FOCUS spec version "${v}". Valid: ${versionSlugs.join(", ")}.` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : ""),
    );
  }

  function findColumn(
    artifact: FocusVersionArtifact,
    currentVersion: string,
    input: string,
  ) {
    const needle = input.toLowerCase();
    const c = artifact.columns.find(
      (x) => x.id.toLowerCase() === needle || x.slug === needle,
    );
    if (c) return c;
    for (const [otherVersion, otherArtifact] of store.versions) {
      if (otherVersion === currentVersion) continue;
      const otherC = otherArtifact.columns.find(
        (x) => x.id.toLowerCase() === needle || x.slug === needle,
      );
      if (otherC) {
        const introduced = otherC.introduced_version;
        const addedNote =
          introduced && introduced !== otherVersion
            ? ` (added in ${introduced})`
            : "";
        return err(
          `"${otherC.id}" does not exist in FOCUS ${currentVersion} — it exists in FOCUS ${otherVersion}${addedNote}. ` +
            `Retry with version="${otherVersion}" or see compare_versions.`,
        );
      }
    }
    const near = nearestMatches(
      input,
      artifact.columns.map((x) => x.slug),
    );
    return err(
      `Unknown column "${input}" in FOCUS ${currentVersion}.` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
        ` Use list_columns for the full list.`,
    );
  }

  function findAttribute(
    artifact: FocusVersionArtifact,
    currentVersion: string,
    input: string,
  ) {
    const needle = input.toLowerCase();
    const a = artifact.attributes.find(
      (x) => x.id.toLowerCase() === needle || x.slug === needle,
    );
    if (a) return a;
    for (const [otherVersion, otherArtifact] of store.versions) {
      if (otherVersion === currentVersion) continue;
      const otherA = otherArtifact.attributes.find(
        (x) => x.id.toLowerCase() === needle || x.slug === needle,
      );
      if (otherA) {
        return err(
          `"${otherA.id}" does not exist in FOCUS ${currentVersion} — it exists in FOCUS ${otherVersion}. ` +
            `Attribute names change between versions; retry with version="${otherVersion}" or discover the current slug via search_focus.`,
        );
      }
    }
    const near = nearestMatches(
      input,
      artifact.attributes.map((x) => x.slug),
    );
    return err(
      `Unknown attribute "${input}" in FOCUS ${currentVersion}.` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : ""),
    );
  }

  function paginate<T>(
    items: T[],
    limit: number,
    cursorRaw: string | undefined,
    context: string,
    dataVersion: string,
  ) {
    return genericPaginate(items, limit, cursorRaw, context, dataVersion);
  }

  const columnLink = (version: string, slug: string) => ({
    type: "resource_link" as const,
    uri: URI.column(version, slug),
    name: slug,
    description: `Full ${slug} column document (FOCUS ${version})`,
    mimeType: "text/markdown",
  });

  // ---- list_versions -----------------------------------------------------
  server.registerTool(
    "list_versions",
    {
      title: "List FOCUS spec versions",
      description:
        "Every FOCUS spec version this server serves, with its source git tag and column/attribute counts. Start here to discover valid `version` values for the other tools. No parameters.",
      inputSchema: {},
      outputSchema: {
        latest: z.string(),
        versions: z.array(
          z.object({
            spec_version: z.string(),
            source_tag: z.string(),
            data_version: z.string(),
            is_latest: z.boolean(),
            counts: z.object({ columns: z.number(), attributes: z.number() }),
          }),
        ),
      },
      annotations: RO,
    },
    () => {
      const versions = store.index.versions.map((v) => {
        const artifact = store.versions.get(
          v.spec_version,
        ) as FocusVersionArtifact;
        return {
          spec_version: v.spec_version,
          source_tag: v.source_tag,
          data_version: v.data_version,
          is_latest: v.spec_version === store.index.latest,
          counts: artifact.manifest.counts,
        };
      });
      return ok(
        { latest: store.index.latest, versions },
        versions
          .map(
            (v) =>
              `- ${v.spec_version}${v.is_latest ? " (latest)" : ""}: ${v.counts.columns} columns, ${v.counts.attributes} attributes (source ${v.source_tag})`,
          )
          .join("\n"),
      );
    },
  );

  // ---- get_column ---------------------------------------------------------
  server.registerTool(
    "get_column",
    {
      title: "Get one FOCUS column",
      description:
        "Full record for one FOCUS column: description, content constraints (type, feature level, nulls, data type, value format), allowed values, normative requirements, and the version it was introduced in. Look up by the `column` parameter — a Column ID or its lowercase slug, e.g. 'BilledCost'.",
      inputSchema: {
        column: z.string().describe("Column ID or slug, e.g. 'BilledCost'"),
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
      },
      outputSchema: {
        spec_version: z.string(),
        column: z.object(columnRecordSchema),
        uri: z.string(),
      },
      annotations: RO,
    },
    ({ column, version }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      const c = findColumn(resolved.artifact, resolved.version, column);
      if (isErr(c)) return c;
      const structured = {
        spec_version: resolved.version,
        column: c,
        uri: URI.column(resolved.version, c.slug),
      };
      return {
        content: [
          {
            type: "text",
            text: columnMd(resolved.artifact, resolved.version, c),
          },
          columnLink(resolved.version, c.slug),
        ],
        structuredContent: structured,
      } as ToolResult;
    },
  );

  // ---- list_columns ---------------------------------------------------------
  server.registerTool(
    "list_columns",
    {
      title: "List FOCUS columns",
      description: `All columns for one spec version, optionally filtered by feature_level (Mandatory|Conditional|Recommended) or column_type (Metric|Dimension); the extra enum value 'unknown' is a crawler parse fallback that matches no column in the shipped data. Default limit returns the full list in one call (${columnCountsBySpec}).`,
      inputSchema: {
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
        feature_level: z.enum(FEATURE_LEVELS).optional(),
        column_type: z.enum(COLUMN_TYPES).optional(),
        limit: z.number().int().min(1).max(100).default(100),
        cursor: z.string().optional(),
      },
      outputSchema: {
        spec_version: z.string(),
        columns: z.array(
          z.object({
            id: z.string(),
            slug: z.string(),
            display_name: z.string(),
            column_type: z.enum(COLUMN_TYPES),
            feature_level: z.enum(FEATURE_LEVELS),
            introduced_version: z.string().nullable(),
            uri: z.string(),
          }),
        ),
        total: z.number(),
        nextCursor: z.string().optional(),
      },
      annotations: RO,
    },
    ({ version, feature_level, column_type, limit, cursor }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      let cols = resolved.artifact.columns;
      if (feature_level)
        cols = cols.filter((c) => c.feature_level === feature_level);
      if (column_type) cols = cols.filter((c) => c.column_type === column_type);
      const pg = paginate(
        cols,
        limit ?? 100,
        cursor,
        cursorContext("list_columns", {
          version: resolved.version,
          feature_level,
          column_type,
        }),
        resolved.artifact.manifest.data_version,
      );
      if (isErr(pg)) return pg;
      const rows = pg.page.map((c) => ({
        id: c.id,
        slug: c.slug,
        display_name: c.display_name,
        column_type: c.column_type,
        feature_level: c.feature_level,
        introduced_version: c.introduced_version,
        uri: URI.column(resolved.version, c.slug),
      }));
      return ok(
        {
          spec_version: resolved.version,
          columns: rows,
          total: cols.length,
          ...(pg.nextCursor ? { nextCursor: pg.nextCursor } : {}),
        },
        `FOCUS ${resolved.version}: ${cols.length} column(s)` +
          (rows.length
            ? ":\n" +
              rows
                .map(
                  (r) =>
                    `- ${r.display_name} (\`${r.id}\`) [${r.column_type}/${r.feature_level}]`,
                )
                .join("\n")
            : "") +
          (pg.nextCursor
            ? `\n\nShowing ${rows.length} of ${cols.length} — pass cursor: "${pg.nextCursor}" for more.`
            : ""),
      );
    },
  );

  // ---- search_focus ---------------------------------------------------------
  server.registerTool(
    "search_focus",
    {
      title: "Search FOCUS columns and attributes",
      description:
        "Ranked keyword search over one spec version's columns and attributes. Returns slug + uri per hit — feed into get_column/get_attribute. Use when you don't already know a Column ID.",
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe("Keywords, e.g. 'commitment discount'"),
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
        entity_types: z.array(z.enum(ENTITY_TYPES)).optional(),
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.string().optional(),
      },
      outputSchema: {
        spec_version: z.string(),
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
    ({ query, version, entity_types, limit, cursor }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      const index = searchIndexByVersion.get(resolved.version) ?? [];
      const all = search(
        index,
        query,
        entity_types as ("column" | "attribute")[] | undefined,
      );
      const p = paginate(
        all,
        limit ?? 10,
        cursor,
        cursorContext("search_focus", {
          version: resolved.version,
          query,
          entity_types,
        }),
        resolved.artifact.manifest.data_version,
      );
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
          spec_version: resolved.version,
          results,
          total: all.length,
          ...(p.nextCursor ? { nextCursor: p.nextCursor } : {}),
        },
        `${all.length} hit(s) for "${query}" in FOCUS ${resolved.version}` +
          (results.length
            ? ":\n" +
              results
                .map(
                  (r) =>
                    `- [${r.entity_type}] ${r.title} (${r.slug}): ${r.snippet.slice(0, 100)}`,
                )
                .join("\n")
            : ".") +
          (p.nextCursor
            ? `\n\nShowing ${results.length} of ${all.length} — pass cursor: "${p.nextCursor}" for more.`
            : ""),
      );
    },
  );

  // ---- get_attribute ---------------------------------------------------------
  server.registerTool(
    "get_attribute",
    {
      title: "Get one FOCUS attribute",
      description:
        "Full record for one cross-cutting FOCUS attribute (naming/formatting conventions like currency codes, datetime format, key-value format): description, normative requirements, exceptions. Look up by the `attribute` parameter — an attribute ID or its lowercase slug, e.g. 'datetime_format'. Attribute names can change between versions; discover current slugs via search_focus with entity_types=['attribute'].",
      inputSchema: {
        attribute: z
          .string()
          .describe("Attribute ID or slug, e.g. 'datetime_format'"),
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
      },
      outputSchema: {
        spec_version: z.string(),
        attribute: z.object(attributeRecordSchema),
        uri: z.string(),
      },
      annotations: RO,
    },
    ({ attribute, version }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      const a = findAttribute(resolved.artifact, resolved.version, attribute);
      if (isErr(a)) return a;
      const structured = {
        spec_version: resolved.version,
        attribute: a,
        uri: URI.attribute(resolved.version, a.slug),
      };
      return ok(
        structured,
        attributeMd(resolved.artifact, resolved.version, a),
      );
    },
  );

  // ---- get_requirements ---------------------------------------------------
  server.registerTool(
    "get_requirements",
    {
      title: "Get a column's normative requirements",
      description:
        "The normative MUST/SHOULD bullets for one column, verbatim from the spec text (plus source_url/license attribution). Use get_column for the full record.",
      inputSchema: {
        column: z.string().describe("Column ID or slug, e.g. 'BilledCost'"),
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
      },
      outputSchema: {
        spec_version: z.string(),
        column: z.string(),
        requirements: z.array(z.string()),
        source_url: z.string(),
        license: z.literal("CC-BY-4.0"),
      },
      annotations: RO,
    },
    ({ column, version }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      const c = findColumn(resolved.artifact, resolved.version, column);
      if (isErr(c)) return c;
      const body = c.requirements.length
        ? c.requirements.map((r) => `- ${r}`).join("\n")
        : `No normative requirements bullets parsed for ${c.id}.`;
      return ok(
        {
          spec_version: resolved.version,
          column: c.id,
          requirements: c.requirements,
          source_url: c.source_url,
          license: "CC-BY-4.0",
        },
        body + footer(resolved.artifact, c.source_url),
      );
    },
  );

  // ---- compare_versions ---------------------------------------------------
  server.registerTool(
    "compare_versions",
    {
      title: `Compare FOCUS ${store.diff.from} to ${store.diff.to}`,
      description: `The ${store.diff.from}→${store.diff.to} column diff — an UNOFFICIAL derivation computed by this server from the two tagged spec releases, source-cited per entry. Without \`column\`: the full diff (${store.diff.added_columns.length} added, ${store.diff.removed_columns.length} removed, ${store.diff.changed_columns.length} changed). With \`column\`: that one column's status and detail.`,
      inputSchema: {
        column: z
          .string()
          .optional()
          .describe("Column ID to narrow to, e.g. 'BilledCost'"),
      },
      outputSchema: {
        from: z.string(),
        to: z.string(),
        official: z.literal(false),
        column: z.string().optional(),
        status: z.enum(["added", "removed", "changed", "unchanged"]).optional(),
        changed_fields: z.array(z.string()).optional(),
        source_url: z.string().optional(),
        from_source_url: z.string().optional(),
        to_source_url: z.string().optional(),
        added_columns: z
          .array(z.object({ id: z.string(), source_url: z.string() }))
          .optional(),
        removed_columns: z
          .array(z.object({ id: z.string(), source_url: z.string() }))
          .optional(),
        changed_columns: z
          .array(
            z.object({
              id: z.string(),
              changed_fields: z.array(z.string()),
              from_source_url: z.string(),
              to_source_url: z.string(),
            }),
          )
          .optional(),
      },
      annotations: RO,
    },
    ({ column }) => {
      const diff = store.diff;
      const changelogUri = URI.changelog(diff.to);
      const note =
        "UNOFFICIAL: this diff is derived by this server from the two tagged spec releases, not an official FOCUS changelog. " +
        `Per the upstream CHANGELOG, most changes are not material unless specifically called out — read ${changelogUri} ` +
        'and each entry\'s source_url(s) below to judge materiality before treating a "changed" status as semantic.';
      if (!column) {
        return ok(
          {
            from: diff.from,
            to: diff.to,
            official: false,
            added_columns: diff.added_columns,
            removed_columns: diff.removed_columns,
            changed_columns: diff.changed_columns,
          },
          `${note}\n\nFOCUS ${diff.from} → ${diff.to}: ${diff.added_columns.length} added, ` +
            `${diff.removed_columns.length} removed, ${diff.changed_columns.length} changed.`,
        );
      }
      const needle = column.toLowerCase();
      const added = diff.added_columns.find(
        (c) => c.id.toLowerCase() === needle,
      );
      const removed = diff.removed_columns.find(
        (c) => c.id.toLowerCase() === needle,
      );
      const changed = diff.changed_columns.find(
        (c) => c.id.toLowerCase() === needle,
      );
      if (added) {
        return ok(
          {
            from: diff.from,
            to: diff.to,
            official: false,
            column: added.id,
            status: "added",
            source_url: added.source_url,
          },
          `${note}\n\n\`${added.id}\` was added in ${diff.to}.`,
        );
      }
      if (removed) {
        return ok(
          {
            from: diff.from,
            to: diff.to,
            official: false,
            column: removed.id,
            status: "removed",
            source_url: removed.source_url,
          },
          `${note}\n\n\`${removed.id}\` was removed in ${diff.to}.`,
        );
      }
      if (changed) {
        return ok(
          {
            from: diff.from,
            to: diff.to,
            official: false,
            column: changed.id,
            status: "changed",
            changed_fields: changed.changed_fields,
            from_source_url: changed.from_source_url,
            to_source_url: changed.to_source_url,
          },
          `${note}\n\n\`${changed.id}\` changed fields: ${changed.changed_fields.join(", ")}.`,
        );
      }
      const fromArtifact = store.versions.get(diff.from);
      const toArtifact = store.versions.get(diff.to);
      const matches = (x: { id: string; slug: string }) =>
        x.id.toLowerCase() === needle || x.slug === needle;
      const fromMatch = fromArtifact?.columns.find(matches);
      const toMatch = toArtifact?.columns.find(matches);
      if (!fromMatch && !toMatch) {
        const slugs = [
          ...new Set([
            ...(fromArtifact?.columns.map((x) => x.slug) ?? []),
            ...(toArtifact?.columns.map((x) => x.slug) ?? []),
          ]),
        ];
        const near = nearestMatches(column, slugs);
        return err(
          `Unknown column "${column}" in FOCUS ${diff.from} or ${diff.to}.` +
            (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
            ` Use list_columns for the full list.`,
        );
      }
      const canonicalId = (fromMatch ?? toMatch)!.id;
      return ok(
        {
          from: diff.from,
          to: diff.to,
          official: false,
          column: canonicalId,
          status: "unchanged",
        },
        `${note}\n\n\`${canonicalId}\` is unchanged between ${diff.from} and ${diff.to}.`,
      );
    },
  );

  // ---- get_kpi_mapping ------------------------------------------------------
  server.registerTool(
    "get_kpi_mapping",
    {
      title: "Get the KPI-to-FOCUS-column mapping",
      description:
        "UNOFFICIAL, derived-by-this-server mapping from framework KPIs (effective savings rate, commitment " +
        "discounts, forecast accuracy, unit economics, allocation, variance) to the FOCUS columns needed to " +
        "compute each, with a FOCUS-terms formula translation. Not published or endorsed by the FinOps Foundation " +
        "or the FOCUS project. Filter by `kpi` slug or `capability` slug (if both are passed, `kpi` wins and " +
        "`capability` is ignored), or pass neither to list everything for a `version`.",
      inputSchema: {
        kpi: z
          .string()
          .optional()
          .describe(
            "Framework KPI slug, e.g. 'effective-savings-rate-percentage'",
          ),
        capability: z
          .string()
          .optional()
          .describe(
            "Framework capability slug to filter by, e.g. 'rate-optimization'",
          ),
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
      },
      outputSchema: {
        spec_version: z.string(),
        official: z.literal(false),
        methodology: z.string(),
        total: z.number(),
        kpis: z.array(z.object(kpiMappingRowSchema)),
      },
      annotations: RO,
    },
    ({ kpi, capability, version }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;

      const toRow = (entry: KpiMappingEntry, columns: string[]) => ({
        kpi_slug: entry.kpi_slug,
        kpi_title: entry.kpi_title,
        kpi_uri: FRAMEWORK_KPI_URI(entry.kpi_slug),
        official: false as const,
        category: entry.category,
        related_capability_slugs: entry.related_capability_slugs,
        focus_formula: entry.focus_formula,
        columns,
        caveat: entry.caveat,
      });

      if (kpi) {
        const needle = kpi.toLowerCase();
        const entry = store.kpiMapping.kpis.find(
          (k) => k.kpi_slug.toLowerCase() === needle,
        );
        if (!entry) {
          const near = nearestMatches(
            kpi,
            store.kpiMapping.kpis.map((k) => k.kpi_slug),
          );
          return err(
            `Unknown KPI "${kpi}" in the mapping.` +
              (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
              ` Call get_kpi_mapping with no \`kpi\` to list every mapped KPI.`,
          );
        }
        const columns = entry.columns_by_version[resolved.version];
        if (!columns) {
          return err(
            `KPI "${entry.kpi_slug}" has no FOCUS ${resolved.version} mapping. ` +
              `Mapped versions: ${Object.keys(entry.columns_by_version).join(", ")}.`,
          );
        }
        const row = toRow(entry, columns);
        return ok(
          {
            spec_version: resolved.version,
            official: false,
            methodology: store.kpiMapping.methodology,
            total: 1,
            kpis: [row],
          },
          `${KPI_MAPPING_BANNER}\n\n# ${row.kpi_title} (FOCUS ${resolved.version})\n\n` +
            `${row.focus_formula}\n\nColumns: ${columns.join(", ")}` +
            (row.caveat ? `\n\nCaveat: ${row.caveat}` : "") +
            `\n\nFramework KPI: ${row.kpi_uri}`,
        );
      }

      let entries = store.kpiMapping.kpis;
      if (capability) {
        const needle = capability.toLowerCase();
        const capabilitySlugs = [
          ...new Set(
            store.kpiMapping.kpis.flatMap((k) => k.related_capability_slugs),
          ),
        ];
        if (!capabilitySlugs.some((s) => s.toLowerCase() === needle)) {
          const near = nearestMatches(capability, capabilitySlugs);
          return err(
            `Unknown capability "${capability}" in the KPI mapping.` +
              (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
              ` Call get_kpi_mapping with no \`capability\` to list every mapped KPI.`,
          );
        }
        entries = entries.filter((k) =>
          k.related_capability_slugs.some((s) => s.toLowerCase() === needle),
        );
      }
      const rows = entries
        .filter((k) => k.columns_by_version[resolved.version])
        .map((k) =>
          toRow(k, k.columns_by_version[resolved.version] as string[]),
        );
      return ok(
        {
          spec_version: resolved.version,
          official: false,
          methodology: store.kpiMapping.methodology,
          total: rows.length,
          kpis: rows,
        },
        `${KPI_MAPPING_BANNER}\n\n${store.kpiMapping.methodology}\n\n` +
          `FOCUS ${resolved.version}: ${rows.length} KPI mapping(s)` +
          (rows.length
            ? ":\n" +
              rows
                .map(
                  (r) => `- ${r.kpi_title} (${r.kpi_uri}): ${r.focus_formula}`,
                )
                .join("\n")
            : "."),
      );
    },
  );

  // ---- calculate_kpi -------------------------------------------------------
  server.registerTool(
    "calculate_kpi",
    {
      title: "Calculate a mapped KPI over bundled sample data",
      description:
        "UNOFFICIAL: computes one of the KPIs from get_kpi_mapping using this server's own derived FOCUS-terms " +
        "formula, over a bundled sample dataset — never user-supplied data. The default version " +
        `(${DEFAULT_VERSION}) bundles only this project's seeded synthetic sample; pass version:'1.0' to compute ` +
        "over the official FOCUS-Sample-Data sample. Not every mapped KPI has " +
        "a registered formula: some need an external input (a forecast or budget figure) FOCUS doesn't carry, or " +
        "ambiguous free-text unit matching this server won't guess at; those error with guidance instead.",
      inputSchema: {
        kpi: z
          .string()
          .describe(
            "Framework KPI slug, e.g. 'effective-savings-rate-percentage'",
          ),
        version: z
          .string()
          .optional()
          .describe(
            `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
          ),
        sample: z
          .enum(SAMPLE_KINDS)
          .optional()
          .describe(
            "Which bundled sample to compute over; defaults to 'official' where the version has one (currently only 1.0), else 'synthetic'. Requesting 'official' for a version without one errors.",
          ),
      },
      outputSchema: {
        spec_version: z.string(),
        official: z.literal(false),
        kpi_slug: z.string(),
        kpi_title: z.string(),
        kpi_uri: z.string(),
        value: z.number(),
        unit: z.enum(["percent", "ratio"]),
        focus_formula: z.string(),
        caveat: z.string().nullable(),
        sample: z.object(sampleProvenanceSchema),
      },
      annotations: RO,
    },
    ({ kpi, version, sample }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;

      const entry = store.kpiMapping.kpis.find(
        (k) => k.kpi_slug.toLowerCase() === kpi.toLowerCase(),
      );
      if (!entry) {
        const near = nearestMatches(
          kpi,
          store.kpiMapping.kpis.map((k) => k.kpi_slug),
        );
        return err(
          `Unknown KPI "${kpi}" in the mapping.` +
            (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
            ` Call get_kpi_mapping with no \`kpi\` to list every mapped KPI.`,
        );
      }
      if (!entry.columns_by_version[resolved.version]) {
        return err(
          `KPI "${entry.kpi_slug}" has no FOCUS ${resolved.version} mapping. ` +
            `Mapped versions: ${Object.keys(entry.columns_by_version).join(", ")}.`,
        );
      }
      if (!hasFormula(entry.kpi_slug)) {
        return err(
          `No calculable formula is registered for KPI "${entry.kpi_slug}": ` +
            `${entry.caveat ?? "its FOCUS-terms formula needs ambiguous free-text unit matching this server does not attempt to resolve automatically"}. ` +
            `Call get_kpi_mapping with kpi="${entry.kpi_slug}" for the FOCUS-terms formula to compute manually. ` +
            `Calculable KPIs: ${calculableKpiSlugs().join(", ")}.`,
        );
      }

      const available = store.sampleManifest.samples.filter(
        (s) => s.version === resolved.version,
      );
      if (available.length === 0) {
        return err(`No bundled sample data for FOCUS ${resolved.version}.`);
      }
      let sampleEntry;
      if (sample) {
        sampleEntry = available.find((s) => s.kind === sample);
        if (!sampleEntry) {
          return err(
            `No "${sample}" bundled sample for FOCUS ${resolved.version}. ` +
              `Available: ${available.map((s) => s.kind).join(", ")}.`,
          );
        }
      } else {
        sampleEntry =
          available.find((s) => s.kind === "official") ??
          (available[0] as (typeof available)[number]);
      }

      const csvText = store.sampleCsv.get(
        `${resolved.version}:${sampleEntry.kind}`,
      ) as string;
      const { header, rows } = parseCsv(csvText);

      let result;
      try {
        result = calculateKpi(entry.kpi_slug, { header, rows });
      } catch (e) {
        return err(
          `Could not calculate "${entry.kpi_slug}" over the FOCUS ${resolved.version} ` +
            `${sampleEntry.kind} sample: ${e instanceof Error ? e.message : String(e)}.`,
        );
      }

      const kindLabel: FocusSampleKind = sampleEntry.kind;
      const structured = {
        spec_version: resolved.version,
        official: false as const,
        kpi_slug: entry.kpi_slug,
        kpi_title: entry.kpi_title,
        kpi_uri: FRAMEWORK_KPI_URI(entry.kpi_slug),
        value: result.value,
        unit: result.unit,
        focus_formula: entry.focus_formula,
        caveat: entry.caveat,
        sample: {
          kind: kindLabel,
          version: sampleEntry.version,
          row_count: sampleEntry.row_count,
          license: sampleEntry.license,
          source_url: sampleEntry.source_url,
          seed: sampleEntry.seed,
          note: sampleEntry.note,
        },
      };
      const provenance =
        kindLabel === "official"
          ? `official FOCUS-Sample-Data (${sampleEntry.row_count} rows, source ${sampleEntry.source_url})`
          : `synthetic sample (${sampleEntry.row_count} rows, seed ${sampleEntry.seed}) — ${sampleEntry.note}`;
      return ok(
        structured,
        `${CALCULATION_BANNER}\n\n# ${entry.kpi_title} (FOCUS ${resolved.version})\n\n` +
          `${result.value}${result.unit === "percent" ? "%" : ""}\n\n` +
          `Formula: ${entry.focus_formula}\n\nSample: ${provenance}` +
          (entry.caveat ? `\n\nCaveat: ${entry.caveat}` : "") +
          `\n\nFramework KPI: ${FRAMEWORK_KPI_URI(entry.kpi_slug)}`,
      );
    },
  );
}
