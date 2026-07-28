import { ccByFooter } from "../../shared/footer.js";
import type {
  FocusAttribute,
  FocusColumn,
  FocusDiff,
} from "../../shared/index.js";
import type { FocusVersionArtifact } from "../../shared/focus/artifact.js";

// One renderer per entity, shared by the resource handlers, the tools, and
// the prompts — so the two surfaces can never drift (mirrors the framework
// server's render.ts pattern).

export function footer(
  artifact: FocusVersionArtifact,
  sourceUrl: string,
): string {
  const m = artifact.manifest;
  return ccByFooter({
    sourceUrl,
    licenseHolder: "FinOps Foundation",
    packageName: "focus-spec-mcp",
    dataVersion: m.data_version,
    crawledAt: m.crawled_at,
  });
}

export function columnMd(
  artifact: FocusVersionArtifact,
  version: string,
  c: FocusColumn,
): string {
  const parts: string[] = [`# ${c.display_name} (\`${c.id}\`)`];
  parts.push(
    `FOCUS ${version} · type: **${c.column_type}** · feature level: **${c.feature_level}**` +
      (c.introduced_version ? ` · introduced in ${c.introduced_version}` : ""),
  );
  parts.push(c.description_md);
  parts.push(
    `## Content constraints\n\n` +
      `- Allows nulls: ${c.allows_nulls === null ? "unspecified" : c.allows_nulls}\n` +
      `- Data type: ${c.data_type ?? "unspecified"}\n` +
      `- Value format: ${c.value_format_md ?? "unspecified"}\n` +
      `- Number range: ${c.number_range ?? "unspecified"}`,
  );
  if (c.allowed_values && c.allowed_values.length > 0) {
    parts.push(
      `## Allowed values\n\n` +
        c.allowed_values
          .map((v) => `- \`${v.value}\`: ${v.description}`)
          .join("\n"),
    );
  }
  if (c.requirements.length > 0) {
    parts.push(
      `## Requirements (normative)\n\n` +
        c.requirements.map((r) => `- ${r}`).join("\n"),
    );
  }
  if (c.parse_quality === "markdown_only") {
    parts.push(
      `_Note: this record could not be fully structured from source — fields ` +
        `above may be incomplete. See the source document for the authoritative text._`,
    );
  }
  return parts.join("\n\n") + footer(artifact, c.source_url);
}

export function attributeMd(
  artifact: FocusVersionArtifact,
  version: string,
  a: FocusAttribute,
): string {
  const parts: string[] = [`# ${a.display_name} (\`${a.id}\`)`];
  parts.push(
    `FOCUS ${version} attribute` +
      (a.introduced_version ? ` · introduced in ${a.introduced_version}` : ""),
  );
  parts.push(a.description_md);
  if (a.requirements.length > 0) {
    parts.push(
      `## Requirements (normative)\n\n` +
        a.requirements.map((r) => `- ${r}`).join("\n"),
    );
  }
  if (a.exceptions_md) {
    parts.push(`## Exceptions\n\n${a.exceptions_md}`);
  }
  if (a.parse_quality === "markdown_only") {
    parts.push(
      `_Note: this record could not be fully structured from source — fields ` +
        `above may be incomplete. See the source document for the authoritative text._`,
    );
  }
  return parts.join("\n\n") + footer(artifact, a.source_url);
}

export function glossaryMd(artifact: FocusVersionArtifact): string {
  return (
    artifact.glossary_md +
    footer(artifact, "https://focus.finops.org/#glossary")
  );
}

export function diffMd(diff: FocusDiff): string {
  const parts: string[] = [
    `# FOCUS ${diff.from} → ${diff.to} column diff (unofficial derivation)`,
    `_UNOFFICIAL: this diff is derived by this server from the two tagged ` +
      `spec releases; every entry cites the raw column file it came from. ` +
      `It is not an official FOCUS changelog._`,
  ];
  if (diff.added_columns.length > 0) {
    parts.push(
      `## Added (${diff.added_columns.length})\n\n` +
        diff.added_columns
          .map((c) => `- \`${c.id}\` — ${c.source_url}`)
          .join("\n"),
    );
  }
  if (diff.removed_columns.length > 0) {
    parts.push(
      `## Removed (${diff.removed_columns.length})\n\n` +
        diff.removed_columns
          .map((c) => `- \`${c.id}\` — ${c.source_url}`)
          .join("\n"),
    );
  }
  if (diff.changed_columns.length > 0) {
    parts.push(
      `## Changed (${diff.changed_columns.length})\n\n` +
        diff.changed_columns
          .map(
            (c) =>
              `- \`${c.id}\`: ${c.changed_fields.join(", ")} (${c.from_source_url} → ${c.to_source_url})`,
          )
          .join("\n"),
    );
  }
  return parts.join("\n\n");
}

export function overviewMd(
  store: { latest: string; versionSlugs: string[] },
  latestArtifact: FocusVersionArtifact,
): string {
  return (
    `# FOCUS specification — agent orientation\n\n` +
    `This server exposes the FOCUS (FinOps Open Cost & Usage Specification) ` +
    `spec text at ${store.versionSlugs.join(" and ")} as structured, ` +
    `version-pinned data. Columns are added, renamed, and re-semanticized ` +
    `across releases — every tool takes a \`version\` parameter (default ` +
    `"${store.latest}", the latest pinned version) and echoes \`spec_version\` ` +
    `in its response.\n\n` +
    `## How to navigate\n\n` +
    `- \`list_versions\` — available spec versions.\n` +
    `- \`list_columns\` (filter by feature_level/column_type), \`get_column\` ` +
    `— column records.\n` +
    `- \`get_attribute\` — cross-cutting formatting/naming rules.\n` +
    `- \`get_requirements\` — a column's normative MUST/SHOULD bullets, ` +
    `verbatim.\n` +
    `- \`search_focus\` — keyword search over one version's columns/attributes.\n` +
    `- \`compare_versions\` — the 1.0→1.2 diff (unofficial derivation, source-cited).\n` +
    `- Full documents are also resources under \`focus://spec/…\`.\n\n` +
    `Data version ${latestArtifact.manifest.data_version}, crawled ` +
    `${latestArtifact.manifest.crawled_at.slice(0, 10)}.`
  );
}
