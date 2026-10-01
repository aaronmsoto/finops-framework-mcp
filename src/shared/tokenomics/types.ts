// Entity types for the Tokenomics Foundation artifact (data/tokenomics/).
// Spec: .agents/specs/tokenomics-overview-mcp.md "Data model". The crawler
// (src/crawlers/tokenomics/) emits these shapes; the server only reads them.

export type TkLicense = "CC-BY-4.0";

/** Per-record provenance: which registry document (and section) a record
 * was parsed from. Status/date live on the document record. */
export interface TkProvenance {
  document: string;
  section: string | null;
  source_url: string;
  license: TkLicense;
}

export type TkDocumentKind = "docs" | "project" | "paper" | "insight";

export interface TkDocumentSection {
  id: string;
  title: string;
}

export interface TkDocument {
  slug: string;
  title: string;
  url: string;
  kind: TkDocumentKind;
  /** Status label as published (e.g. "Release Candidate 1"). */
  status: string;
  /** "page" when the label was read off the page; "registry" when the page
   * carries none and the label comes from the pinned registry entry. */
  status_source: "page" | "registry";
  status_date: string | null;
  modified: string | null;
  author: string | null;
  license: TkLicense;
  sections: TkDocumentSection[];
  word_count: number;
}

export interface TkStage {
  slug: string;
  name: string;
  scope: string;
  key_question: string;
  provenance: TkProvenance;
}

export interface TkLayerComponent {
  name: string;
  items: string[];
}

export interface TkLayer {
  slug: string;
  number: number;
  name: string;
  /** Label used in the paper's summary table, e.g. "L4 Model and quantization". */
  table_label: string;
  /** "Moves the multiplier?" cell verbatim. */
  multiplier_effect: string;
  moves_multiplier: boolean;
  key_metric: string;
  primary_levers: string[];
  description_md: string;
  components: TkLayerComponent[];
  tooling_md: string | null;
  provenance: TkProvenance;
}

export interface TkBigTVariable {
  symbol: string;
  name: string;
  description: string;
  provenance: TkProvenance;
}

export interface TkBigTClass {
  slug: string;
  order: number;
  notation: string;
  name: string;
  headline: string;
  description: string;
  fix: string;
  provenance: TkProvenance;
}

export type TkLeverKind =
  | "stack-primary-lever"
  | "bigt-lever"
  | "architectural-approach"
  | "worked-example-step";

export interface TkLever {
  slug: string;
  name: string;
  kind: TkLeverKind;
  layer: number | null;
  bigt_classes: string[];
  description_md: string;
  /** Token reduction or cost figure as published, when the source gives one. */
  effect: string | null;
  provenance: TkProvenance;
}

export interface TkMetric {
  slug: string;
  name: string;
  /** Linearized formula, built only from the page's own formula text. */
  formula: string | null;
  /** Formula exactly as a stated sentence when the page gives it in prose. */
  formula_text: string | null;
  definition_md: string;
  targets: string[];
  inputs: string[];
  provenance: TkProvenance;
}

export interface TkPersona {
  slug: string;
  name: string;
  core: boolean;
  stages: string[];
  responsibility: string;
  description_md: string;
  signals: string[];
  provenance: TkProvenance;
}

export interface TkValueCategory {
  slug: string;
  name: string;
  group: string;
  description: string;
  estimate_as: string | null;
  provenance: TkProvenance;
}

export interface TkBookingDestination {
  slug: string;
  name: string;
  description: string;
  provenance: TkProvenance;
}

export interface TkGlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  provenance: TkProvenance;
}

export type TkFocusBucket = "done" | "flight" | "consider" | "out";

export interface TkFocusTrackerItem {
  slug: string;
  title: string;
  bucket: TkFocusBucket;
  kind: string;
  labels: string[];
  /** Backticked identifiers named in the card (column/property names). */
  identifiers: string[];
  body_md: string;
  links: string[];
  provenance: TkProvenance;
}

export interface TkCacheProvider {
  slug: string;
  provider: string;
  write_charge: string;
  read_charge: string;
  minimum_prefix: string;
  lifetime_notes: string;
  reviewed: string;
  provenance: TkProvenance;
}

export type TkEntityType =
  | "document"
  | "stage"
  | "layer"
  | "bigt-class"
  | "lever"
  | "metric"
  | "persona"
  | "value-category"
  | "glossary-term"
  | "focus-item";

export type TkCrossLinkServer = "framework" | "focus" | "focus-working-draft";

export interface TkCrossLinkTarget {
  server: TkCrossLinkServer;
  kind: string;
  id: string;
  /** null for FOCUS working-draft items no published server serves yet. */
  uri: string | null;
}

export interface TkCrossLink {
  from: { type: TkEntityType; slug: string };
  target: TkCrossLinkTarget;
  /** Quote found verbatim (whitespace-normalized) in the source document. */
  evidence: string;
  document: string;
  source_url: string;
  official: true;
}

export interface TkCrosswalkEntry {
  from: { type: TkEntityType; slug: string };
  target: TkCrossLinkTarget;
  rationale: string;
  official: false;
}

export interface TkChangelogEntry {
  data_version: string;
  crawled_at: string;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface TkManifest {
  data_version: string;
  schema_version: string;
  crawled_at: string;
  source_urls: string[];
  sha256: Record<string, string>;
  counts: Record<string, number>;
  parse_warnings: string[];
  /** On-site CC BY URLs discovered via REST/sitemap but not in the registry. */
  unregistered: string[];
}

export interface TkBigT {
  /** e.g. "T(n · k · a)" */
  notation: string;
  /** e.g. "requests × model calls per request × agent depth" */
  expansion: string;
  variables: TkBigTVariable[];
  classes: TkBigTClass[];
}

export interface TkValue {
  categories: TkValueCategory[];
  booking_destinations: TkBookingDestination[];
}
