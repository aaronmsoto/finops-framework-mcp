import type { FocusAttribute } from "../../../shared/focus/types.js";
import { LICENSE } from "../../../shared/types.js";
import { extractRequirements } from "./table.js";
import { h1Title, sectionBody } from "./sections.js";

export interface ParsedAttributeFile {
  attribute: FocusAttribute;
  warnings: string[];
}

/**
 * Parses one FOCUS attribute markdown file (spec "Also ingest per tag":
 * `## Attribute ID`, `## Attribute Name`, `## Description`,
 * `## Requirements` (bulleted), `## Exceptions`, `## Introduced (version)`).
 * Never throws — degrades to `parse_quality: "markdown_only"` on failure.
 */
export function parseAttributeFile(
  md: string,
  opts: { slug: string; sourceUrl: string },
): ParsedAttributeFile {
  const warnings: string[] = [];
  const lines = md.split("\n");

  const attributeId = sectionBody(lines, "Attribute ID");
  const displayName = sectionBody(lines, "Attribute Name");
  const descriptionMd = sectionBody(lines, "Description") ?? "";
  const requirementsBody = sectionBody(lines, "Requirements");
  const exceptionsMd = sectionBody(lines, "Exceptions");
  const introducedVersion = sectionBody(lines, "Introduced (version)");

  const requirements = requirementsBody
    ? extractRequirements(requirementsBody)
    : [];
  if (requirementsBody && requirements.length === 0) {
    warnings.push(
      `${opts.slug}: Requirements section had no MUST/SHOULD bullets`,
    );
  }

  const fallbackTitle = h1Title(md) ?? opts.slug;
  const parsed = attributeId !== null && displayName !== null;
  if (!parsed) warnings.push(`${opts.slug}: degraded to markdown_only`);

  const attribute: FocusAttribute = {
    id: attributeId ?? fallbackTitle,
    slug: opts.slug,
    display_name: displayName ?? fallbackTitle,
    description_md: descriptionMd,
    requirements,
    exceptions_md: exceptionsMd,
    introduced_version: introducedVersion,
    source_url: opts.sourceUrl,
    license: LICENSE,
    parse_quality: parsed ? "parsed" : "markdown_only",
  };
  return { attribute, warnings };
}
