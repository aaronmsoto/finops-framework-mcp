import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  FocusStore,
  FocusVersionArtifact,
} from "../../shared/focus/artifact.js";
import type { KpiMappingEntry } from "../../shared/focus/types.js";
import { nearestMatches } from "../../shared/index.js";
import {
  cursorContext,
  err,
  isErr,
  ok,
  paginate as genericPaginate,
  RO,
  type ToolResult,
} from "../../shared/tools.js";
import { attributeMd, columnMd } from "./render.js";
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

  function findColumn(artifact: FocusVersionArtifact, input: string) {
    const needle = input.toLowerCase();
    const c = artifact.columns.find(
      (x) => x.id.toLowerCase() === needle || x.slug === needle,
    );
    if (c) return c;
    const near = nearestMatches(
      input,
      artifact.columns.map((x) => x.slug),
    );
    return err(
      `Unknown column "${input}".` +
        (near.length ? ` Did you mean: ${near.join(", ")}?` : "") +
        ` Use list_columns for the full list.`,
    );
  }

  function findAttribute(artifact: FocusVersionArtifact, input: string) {
    const needle = input.toLowerCase();
    const a = artifact.attributes.find(
      (x) => x.id.toLowerCase() === needle || x.slug === needle,
    );
    if (a) return a;
    const near = nearestMatches(
      input,
      artifact.attributes.map((x) => x.slug),
    );
    return err(
      `Unknown attribute "${input}".` +
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
        "Full record for one FOCUS column: description, content constraints (type, feature level, nulls, data type, value format), allowed values, normative requirements, and the version it was introduced in. Look up by Column ID (e.g. 'BilledCost') or its lowercase slug.",
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
      const c = findColumn(resolved.artifact, column);
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
      description:
        "All columns for one spec version, optionally filtered by feature_level (Mandatory|Conditional|Recommended) or column_type (Metric|Dimension). Default limit returns the full list in one call (43 in 1.0, 57 in 1.2).",
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
            : "."),
      );
    },
  );

  // ---- get_attribute ---------------------------------------------------------
  server.registerTool(
    "get_attribute",
    {
      title: "Get one FOCUS attribute",
      description:
        "Full record for one cross-cutting FOCUS attribute (naming/formatting conventions like currency codes, datetime format, key-value format): description, normative requirements, exceptions.",
      inputSchema: {
        slug: z
          .string()
          .describe("Attribute ID or slug, e.g. 'CurrencyCodeFormat'"),
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
    ({ slug, version }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      const a = findAttribute(resolved.artifact, slug);
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
        "The normative MUST/SHOULD bullets for one column, verbatim from the spec text — nothing else. Use get_column for the full record.",
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
      },
      annotations: RO,
    },
    ({ column, version }) => {
      const resolved = resolveVersion(version);
      if (isErr(resolved)) return resolved;
      const c = findColumn(resolved.artifact, column);
      if (isErr(c)) return c;
      return ok(
        {
          spec_version: resolved.version,
          column: c.id,
          requirements: c.requirements,
        },
        c.requirements.length
          ? c.requirements.map((r) => `- ${r}`).join("\n")
          : `No normative requirements bullets parsed for ${c.id}.`,
      );
    },
  );

  // ---- compare_versions ---------------------------------------------------
  server.registerTool(
    "compare_versions",
    {
      title: "Compare FOCUS 1.0 to 1.2",
      description:
        "The 1.0→1.2 column diff — an UNOFFICIAL derivation computed by this server from the two tagged spec releases, source-cited per entry. Without `column`: the full diff (14 added, 0 removed, 43 changed). With `column`: that one column's status and detail.",
      inputSchema: {
        column: z
          .string()
          .optional()
          .describe("Column ID to narrow to, e.g. 'BilledCost'"),
      },
      outputSchema: {
        from: z.string(),
        to: z.string(),
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
      const note =
        "UNOFFICIAL: this diff is derived by this server from the two tagged spec releases, not an official FOCUS changelog.";
      if (!column) {
        return ok(
          {
            from: diff.from,
            to: diff.to,
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
            column: changed.id,
            status: "changed",
            changed_fields: changed.changed_fields,
            from_source_url: changed.from_source_url,
            to_source_url: changed.to_source_url,
          },
          `${note}\n\n\`${changed.id}\` changed fields: ${changed.changed_fields.join(", ")}.`,
        );
      }
      return ok(
        { from: diff.from, to: diff.to, column, status: "unchanged" },
        `${note}\n\n\`${column}\` is unchanged between ${diff.from} and ${diff.to} (or not a recognized column in either version).`,
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
        "discounts, forecast accuracy, unit economics, allocation) to the FOCUS columns needed to compute each, " +
        "with a FOCUS-terms formula translation. Not published or endorsed by the FinOps Foundation or the FOCUS " +
        "project. Filter by `kpi` slug, `capability` slug, or list everything for a `version`.",
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
        entries = entries.filter((k) =>
          k.related_capability_slugs.includes(capability),
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
}
