import type {
  FocusAllowedValue,
  FocusColumn,
  FocusColumnType,
  FocusFeatureLevel,
} from "../../../shared/focus/types.js";
import { LICENSE } from "../../../shared/types.js";
import { extractRequirements, findPipeTable } from "./table.js";
import { h1Title, introSection, sectionBody } from "./sections.js";

export interface ParsedColumnFile {
  column: FocusColumn;
  warnings: string[];
}

function normalizeColumnType(value: string | undefined): FocusColumnType {
  if (value === "Metric" || value === "Dimension") return value;
  return "unknown";
}

function normalizeFeatureLevel(value: string | undefined): FocusFeatureLevel {
  if (
    value === "Mandatory" ||
    value === "Conditional" ||
    value === "Recommended"
  )
    return value;
  return "unknown";
}

function normalizeBool(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  const v = value.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/**
 * Parses one FOCUS column markdown file (spec "Column file format"): H1 +
 * prose + normative statements, `## Column ID`, `## Display Name`,
 * `## Description`, `## Content constraints` (table, optionally followed by
 * an "Allowed values" table), `## Introduced (version)`. Never throws — an
 * unparseable file degrades to `parse_quality: "markdown_only"` with
 * whatever fields could be recovered (spec "Ingestion rules": a parse
 * failure never blocks the artifact).
 */
export function parseColumnFile(
  md: string,
  opts: { slug: string; sourceUrl: string },
): ParsedColumnFile {
  const warnings: string[] = [];
  const lines = md.split("\n");

  const columnId = sectionBody(lines, "Column ID");
  const displayName = sectionBody(lines, "Display Name");
  const descriptionMd = sectionBody(lines, "Description") ?? "";
  const constraintsBody = sectionBody(lines, "Content Constraints");
  const introducedVersion = sectionBody(lines, "Introduced (version)");
  const requirements = extractRequirements(introSection(lines));

  let columnType: FocusColumnType = "unknown";
  let featureLevel: FocusFeatureLevel = "unknown";
  let allowsNulls: boolean | null = null;
  let dataType: string | null = null;
  let valueFormatMd: string | null = null;
  let numberRange: string | null = null;
  let allowedValues: FocusAllowedValue[] | null = null;

  if (constraintsBody) {
    const constraintLines = constraintsBody.split("\n");
    const first = findPipeTable(constraintLines);
    if (first) {
      const byKey = new Map(
        first.table.rows.map((r) => [(r[0] ?? "").toLowerCase(), r[1]]),
      );
      columnType = normalizeColumnType(byKey.get("column type"));
      featureLevel = normalizeFeatureLevel(byKey.get("feature level"));
      allowsNulls = normalizeBool(byKey.get("allows nulls"));
      dataType = byKey.get("data type") ?? null;
      valueFormatMd = byKey.get("value format") ?? null;
      numberRange = byKey.get("number range") ?? null;

      const second = findPipeTable(constraintLines, first.nextIdx);
      if (second) {
        allowedValues = second.table.rows
          .filter((r) => r.length >= 2)
          .map((r) => ({
            value: r[0] as string,
            description: (r[1] ?? "") as string,
          }));
      }
    } else {
      warnings.push(`${opts.slug}: Content constraints section has no table`);
    }
  } else {
    warnings.push(`${opts.slug}: no Content constraints section found`);
  }

  const fallbackTitle = h1Title(md) ?? opts.slug;
  const parsed =
    columnId !== null &&
    displayName !== null &&
    columnType !== "unknown" &&
    featureLevel !== "unknown";
  if (!parsed) warnings.push(`${opts.slug}: degraded to markdown_only`);

  const column: FocusColumn = {
    id: columnId ?? fallbackTitle,
    slug: opts.slug,
    display_name: displayName ?? fallbackTitle,
    description_md: descriptionMd,
    column_type: columnType,
    feature_level: featureLevel,
    allows_nulls: allowsNulls,
    data_type: dataType,
    value_format_md: valueFormatMd,
    number_range: numberRange,
    allowed_values: allowedValues,
    requirements,
    introduced_version: introducedVersion,
    source_url: opts.sourceUrl,
    license: LICENSE,
    parse_quality: parsed ? "parsed" : "markdown_only",
  };
  return { column, warnings };
}
