import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";
import type { FocusStore } from "../../shared/focus/artifact.js";
import { columnMd, diffMd, overviewMd } from "./render.js";
import { DEFAULT_VERSION } from "./tools.js";
import { URI } from "./uris.js";

const KPI_MAPPING_PROMPT_BANNER =
  "UNOFFICIAL: the KPI→FOCUS column mapping below is derived by this server " +
  "— it is not published or endorsed by the FinOps Foundation or the FOCUS project.";

// Prompts render server-side with embedded-resource content blocks so the
// workflow survives hosts that never surface resources to the model
// (mirrors the framework server's prompts.ts pattern).

type Msg = {
  role: "user" | "assistant";
  content:
    | { type: "text"; text: string }
    | {
        type: "resource";
        resource: { uri: string; mimeType: string; text: string };
      };
};

function embedded(uri: string, text: string): Msg {
  return {
    role: "user",
    content: {
      type: "resource",
      resource: { uri, mimeType: "text/markdown", text },
    },
  };
}

function instruction(text: string): Msg {
  return { role: "user", content: { type: "text", text } };
}

export function registerPrompts(server: McpServer, store: FocusStore): void {
  const versionSlugs = store.index.versions.map((v) => v.spec_version);
  const latestArtifact = store.versions.get(store.index.latest);
  if (!latestArtifact) {
    throw new Error(
      `focus store: latest version "${store.index.latest}" has no loaded artifact`,
    );
  }
  // .optional() must wrap the schema BEFORE completable(), and completable()
  // must be the outermost call: zod v4's .optional()/.describe() clone the
  // schema, which would drop the SDK's completable marker if applied after
  // (critique-2 M1' — same reasoning, extended to .optional()).
  const versionArg = (desc: string) =>
    completable(z.string().optional().describe(desc), (v = "") =>
      versionSlugs.filter((s) => s.startsWith(v)),
    );
  const columnArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      latestArtifact.columns
        .map((c) => c.id)
        .filter((s) => s.toLowerCase().startsWith(v.toLowerCase())),
    );
  const kpiSlugs = store.kpiMapping.kpis.map((k) => k.kpi_slug);
  const kpiArg = (desc: string) =>
    completable(z.string().optional().describe(desc), (v = "") =>
      kpiSlugs.filter((s) => s.startsWith(v)),
    );
  const kpiCapabilitySlugs = [
    ...new Set(
      store.kpiMapping.kpis.flatMap((k) => k.related_capability_slugs),
    ),
  ];
  const kpiCapabilityArg = (desc: string) =>
    completable(z.string().optional().describe(desc), (v = "") =>
      kpiCapabilitySlugs.filter((s) => s.startsWith(v)),
    );

  server.registerPrompt(
    "explain-focus",
    {
      title: "Explain the FOCUS spec",
      description:
        "Guided orientation to the FOCUS (FinOps Open Cost & Usage Specification): what it standardizes, how versions differ, and how to look up columns.",
      argsSchema: {
        version: versionArg(
          `Which version to focus on (${versionSlugs.join("|")}); default latest`,
        ),
      },
    },
    ({ version }) => {
      const v = version ?? store.index.latest;
      const artifact = store.versions.get(v) ?? latestArtifact;
      return {
        messages: [
          embedded(
            URI.overview,
            overviewMd({ latest: store.index.latest, versionSlugs }, artifact),
          ),
          instruction(
            `Using the embedded overview above, explain FOCUS ${v} to someone new to it: what problem it solves ` +
              `(a common billing data schema across cloud/SaaS providers), the Mandatory vs Conditional vs ` +
              `Recommended feature levels (call list_columns to show real examples of each), and how to look up ` +
              `a specific column (get_column) or its normative requirements (get_requirements). Close by noting ` +
              `this server also serves other versions (${versionSlugs.filter((s) => s !== v).join(", ")}) via compare_versions.`,
          ),
        ],
      };
    },
  );

  server.registerPrompt(
    "map-column-across-versions",
    {
      title: "Trace one column across FOCUS versions",
      description:
        "For one Column ID, show its record in each served version and the 1.0→1.2 diff status, citing sources.",
      argsSchema: {
        column: columnArg("Column ID, e.g. 'BilledCost'"),
      },
    },
    ({ column }) => {
      const messages: Msg[] = [];
      for (const [version, artifact] of store.versions) {
        const c = artifact.columns.find(
          (x) => x.id.toLowerCase() === column.toLowerCase(),
        );
        if (c)
          messages.push(
            embedded(
              URI.column(version, c.slug),
              columnMd(artifact, version, c),
            ),
          );
      }
      messages.push(
        embedded(
          URI.changes(store.diff.from, store.diff.to),
          diffMd(store.diff),
        ),
      );
      messages.push(
        instruction(
          `Using the embedded column document(s) and diff above for "${column}", summarize: which versions ` +
            `define it, whether its content constraints changed, and (via compare_versions(column: "${column}") ` +
            `if you need the machine-readable form) its exact diff status between ${store.diff.from} and ${store.diff.to}.`,
        ),
      );
      return { messages };
    },
  );

  server.registerPrompt(
    "map-kpi-to-focus-columns",
    {
      title: "Map a framework KPI to FOCUS columns",
      description:
        "UNOFFICIAL: guides computing a framework KPI from FOCUS data — which columns it needs, the FOCUS-terms " +
        "formula, and (where a formula is registered) the computed value over bundled sample data. Filter by " +
        "`kpi` slug, or `capability` slug to see every KPI mapped for that capability.",
      argsSchema: {
        kpi: kpiArg(
          "Framework KPI slug, e.g. 'effective-savings-rate-percentage'",
        ),
        capability: kpiCapabilityArg(
          "Framework capability slug, e.g. 'rate-optimization'",
        ),
        version: versionArg(
          `FOCUS spec version (${versionSlugs.join("|")}); default "${DEFAULT_VERSION}"`,
        ),
      },
    },
    ({ kpi, capability, version }) => {
      const v = version ?? DEFAULT_VERSION;
      const artifact = store.versions.get(v) ?? latestArtifact;

      if (kpi) {
        const entry = store.kpiMapping.kpis.find(
          (k) => k.kpi_slug.toLowerCase() === kpi.toLowerCase(),
        );
        if (!entry) {
          return {
            messages: [
              instruction(
                `Unknown KPI "${kpi}" in the mapping. Call get_kpi_mapping with no \`kpi\` to list every mapped ` +
                  `KPI, pick a slug, and re-invoke this prompt.`,
              ),
            ],
          };
        }
        const columns = entry.columns_by_version[v];
        const messages: Msg[] = [];
        for (const colId of columns ?? []) {
          const c = artifact.columns.find(
            (x) => x.id.toLowerCase() === colId.toLowerCase(),
          );
          if (c)
            messages.push(
              embedded(URI.column(v, c.slug), columnMd(artifact, v, c)),
            );
        }
        messages.push(
          instruction(
            `${KPI_MAPPING_PROMPT_BANNER}\n\nUsing the embedded FOCUS ${v} column document(s) above for the ` +
              `columns "${entry.kpi_title}" needs (${(columns ?? []).join(", ") || "none for this version"}), ` +
              `call get_kpi_mapping(kpi: "${entry.kpi_slug}") for the exact FOCUS-terms formula, then ` +
              `calculate_kpi(kpi: "${entry.kpi_slug}", version: "${v}") to compute it over bundled sample data ` +
              `(the tool will error with guidance if no formula is registered — not every mapped KPI has one). ` +
              `Explain the result in terms of the embedded column(s), and cite the caveat` +
              (entry.caveat
                ? ` ("${entry.caveat}")`
                : " if the tool reports one") +
              `.`,
          ),
        );
        return { messages };
      }

      if (capability) {
        const entries = store.kpiMapping.kpis.filter((k) =>
          k.related_capability_slugs.includes(capability),
        );
        return {
          messages: [
            instruction(
              `${KPI_MAPPING_PROMPT_BANNER}\n\nCall get_kpi_mapping(capability: "${capability}", version: "${v}") ` +
                `to list the KPI(s) mapped for this capability` +
                (entries.length
                  ? ` (currently: ${entries.map((e) => e.kpi_title).join(", ")})`
                  : "") +
                `. For each, re-invoke this prompt with \`kpi\` set to its slug to get the FOCUS columns, formula, ` +
                `and a computed sample value.`,
            ),
          ],
        };
      }

      return {
        messages: [
          instruction(
            `${KPI_MAPPING_PROMPT_BANNER}\n\nCall get_kpi_mapping with no arguments to list every framework KPI ` +
              `this server maps to FOCUS ${v} columns. Then re-invoke this prompt with \`kpi\` set to one slug ` +
              `(or \`capability\` to narrow by capability) to walk through its FOCUS columns, formula, and a ` +
              `computed sample value via calculate_kpi.`,
          ),
        ],
      };
    },
  );
}
