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
  /** sha256 of each file in data/focus/samples/ (manifest.json + every CSV),
   * keyed by path relative to data/focus/samples/. */
  samples: Record<string, string>;
}

export type FocusSampleKind = "official" | "synthetic";

/** One bundled sample CSV calculate_kpi (T-034) may compute against:
 * `official` is real published FOCUS-Sample-Data (only exists for 1.0 —
 * spec "Sources"); `synthetic` is this project's deterministic seeded
 * generator (T-032), available for every version. Never user-supplied. */
export interface FocusSampleEntry {
  version: string;
  kind: FocusSampleKind;
  /** Path relative to data/focus/samples/, e.g. "1.0/official/focus_sample.csv". */
  file: string;
  row_count: number;
  license: typeof LICENSE;
  /** Upstream URL for `official`; null for `synthetic` (nothing to cite). */
  source_url: string | null;
  /** Generator seed for `synthetic`; null for `official`. */
  seed: number | null;
  note: string;
}

export interface FocusSampleManifest {
  samples: FocusSampleEntry[];
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

/** One framework KPI mapped to the FOCUS columns needed to compute it
 * (spec "KPI->FOCUS mapping methodology"): unofficial derivation, never
 * endorsed by the FinOps Foundation or the FOCUS project. `kpi_slug` must
 * match a slug in data/framework/content/kpis.json (cross-validated in
 * tests, not at runtime — the FOCUS artifact never depends on the
 * framework artifact). `columns_by_version` keys are FOCUS spec versions;
 * every column id must exist in that version's columns.json (cross-
 * validated both by loadFocusStore and by tests). */
export interface KpiMappingEntry {
  kpi_slug: string;
  kpi_title: string;
  official: false;
  category:
    | "effective_savings_rate"
    | "commitment_discounts"
    | "forecast_accuracy"
    | "unit_economics"
    | "allocation"
    | "variance";
  /** Copied from the framework KPI's related_capability_slugs, for the
   * get_kpi_mapping `capability` filter — may be empty. */
  related_capability_slugs: string[];
  focus_formula: string;
  columns_by_version: Record<string, string[]>;
  /** Non-null when FOCUS alone cannot fully compute the KPI (e.g. it needs
   * an external forecast or budget figure). */
  caveat: string | null;
}

export interface KpiMapping {
  official: false;
  methodology: string;
  kpis: KpiMappingEntry[];
}
