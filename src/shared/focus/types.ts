// Entity types for the FOCUS specification data artifact (data/focus/).
// Contract: .agents/specs/focus-mcp-v1.md. Markdown is canonical; these
// records are a best-effort structured derivation of it — a parse failure
// degrades a single record to parse_quality "markdown_only", it never
// blocks the artifact (spec "Ingestion rules").

import { LICENSE } from "../types.js";

export type FocusColumnType = "Metric" | "Dimension" | "unknown";
export type FocusFeatureLevel =
  "Mandatory" | "Conditional" | "Recommended" | "unknown";
export type FocusParseQuality = "parsed" | "markdown_only";

export interface FocusAllowedValue {
  value: string;
  description: string;
}

export interface FocusColumn {
  id: string;
  slug: string;
  display_name: string;
  description_md: string;
  column_type: FocusColumnType;
  feature_level: FocusFeatureLevel;
  allows_nulls: boolean | null;
  data_type: string | null;
  value_format_md: string | null;
  number_range: string | null;
  allowed_values: FocusAllowedValue[] | null;
  requirements: string[];
  introduced_version: string | null;
  source_url: string;
  license: typeof LICENSE;
  parse_quality: FocusParseQuality;
}

export interface FocusAttribute {
  id: string;
  slug: string;
  display_name: string;
  description_md: string;
  requirements: string[];
  exceptions_md: string | null;
  introduced_version: string | null;
  source_url: string;
  license: typeof LICENSE;
  parse_quality: FocusParseQuality;
}

export interface FocusIngestReport {
  parsed: number;
  markdown_only: number;
}

export interface FocusVersionManifest {
  spec_version: string;
  source_tag: string;
  data_version: string;
  crawled_at: string;
  source_urls: string[];
  counts: { columns: number; attributes: number };
  ingest_report: {
    columns: FocusIngestReport;
    attributes: FocusIngestReport;
  };
  parse_warnings: string[];
  /** sha256 per artifact file, keyed by path relative to the version dir. */
  sha256: Record<string, string>;
}

export interface FocusIndexVersionEntry {
  spec_version: string;
  dir: string;
  data_version: string;
  source_tag: string;
  manifest_sha256: string;
}

export interface FocusIndex {
  latest: string;
  versions: FocusIndexVersionEntry[];
  /** sha256 of each file in data/focus/derived/, keyed by filename. */
  derived: Record<string, string>;
}

export interface FocusColumnRef {
  id: string;
  source_url: string;
}

export interface FocusColumnChanged {
  id: string;
  changed_fields: string[];
  from_source_url: string;
  to_source_url: string;
}

/** The 1.0 -> 1.2 diff (spec "Version model"): unofficial derivation, but
 * every entry is source-cited back to the raw column file it came from. */
export interface FocusDiff {
  from: string;
  to: string;
  source: { from_tag: string; to_tag: string };
  added_columns: FocusColumnRef[];
  removed_columns: FocusColumnRef[];
  changed_columns: FocusColumnChanged[];
}
