// Entity types for the FinOps Framework data artifact.
// Contract: docs/architecture.md §3-§4. Official crawled content lives in
// content/, unofficial derivations (official: false) live in derived/.

export const LICENSE = "CC-BY-4.0" as const;

export interface Provenance {
  source_url: string;
  license: typeof LICENSE;
}

export type OfficialMaturityLevel = "crawl" | "walk" | "run";
/** "pre-crawl" is an unofficial extension — see MaturityExtension. */
export type MaturityLevelSlug = "pre-crawl" | OfficialMaturityLevel;

export const OFFICIAL_MATURITY_LEVELS: readonly OfficialMaturityLevel[] = [
  "crawl",
  "walk",
  "run",
];
export const ALL_MATURITY_LEVELS: readonly MaturityLevelSlug[] = [
  "pre-crawl",
  "crawl",
  "walk",
  "run",
];

export interface Principle extends Provenance {
  slug: string;
  title: string;
  description_md: string;
  order: number;
}

export interface Phase extends Provenance {
  slug: string;
  title: string;
  description_md: string;
  order: number;
}

export interface Domain extends Provenance {
  slug: string;
  title: string;
  description_md: string;
  capability_slugs: string[];
}

export interface HeadlineGroup {
  label: string;
  items: string[];
}

export type ActivityPersona =
  | { kind: "core"; persona_slug: string }
  | { kind: "allied"; persona_slug: string }
  | { kind: "allied-group" };

export interface FunctionalActivity {
  /** Core persona slug, or the literal allied-group bucket the site uses. */
  persona: ActivityPersona;
  heading: string;
  items: string[];
}

export interface ExampleKpi {
  objective: string;
  kpi: string;
}

export interface Capability extends Provenance {
  slug: string;
  title: string;
  wp_id: number;
  domain_slug: string;
  summary: string;
  definition_md: string;
  headline_groups: HeadlineGroup[];
  /** Verbatim per-level maturity assessment markdown (official content). */
  maturity_raw: Record<OfficialMaturityLevel, string>;
  functional_activities: FunctionalActivity[];
  kpi_bullets: string[];
  example_kpis: ExampleKpi[];
  inputs_outputs_md: string;
  featured_kpi_ids: number[];
}

export type PersonaCategory = "core" | "allied";

export interface Persona extends Provenance {
  slug: string;
  title: string;
  category: PersonaCategory;
  description_md: string;
}

export interface ScopeSection {
  heading: string;
  body_md: string;
}

/** Scopes are conceptual guidance, not an enumerable entity set (critique B3). */
export interface ScopeDoc extends Provenance {
  title: string;
  sections: ScopeSection[];
}

export interface TechnologyCategory extends Provenance {
  slug: string;
  title: string;
  description_md: string;
}

export interface MaturityLevel extends Provenance {
  slug: OfficialMaturityLevel;
  title: string;
  characteristics_md: string;
  sample_goals_md: string;
  official: true;
}

/** The unofficial pre-crawl extension — lives in derived/, never content/. */
export interface MaturityExtension {
  slug: "pre-crawl";
  title: "Pre-Crawl (unofficial extension)";
  description_md: string;
  official: false;
}

export interface Kpi extends Provenance {
  slug: string;
  title: string;
  wp_id: number;
  description_md: string;
  formula?: string;
  data_sources: string[];
  /** Official cross-links from the KPI modal/page "Related Capabilities". */
  related_capability_slugs: string[];
  /** Capabilities on whose pages this KPI is featured. */
  featured_on: string[];
}

export type ParseQuality = "itemized" | "raw_fallback";

/**
 * A discrete item parsed from a capability's maturity assessment bullets.
 * Semantics: these are assessment CHARACTERISTICS (rubric states an assessor
 * checks for), not to-do steps. Unofficial parsing of official prose.
 * (Entity name "Action" kept per owner brief; rename pending owner approval.)
 */
export interface Action {
  capability_slug: string;
  maturity: OfficialMaturityLevel;
  text: string;
  ordinal: number;
  /** Set when this item is a nested child of another item. */
  parent_ordinal?: number;
  official: false;
  parse_quality: ParseQuality;
}

export interface ChangelogEntry {
  data_version: string;
  crawled_at: string;
  summary: string;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface EntityCounts {
  principles: number;
  phases: number;
  domains: number;
  capabilities: number;
  personas: number;
  technology_categories: number;
  maturity_levels: number;
  kpis: number;
}

export interface Manifest {
  data_version: string;
  schema_version: string;
  crawled_at: string;
  source_urls: string[];
  /** sha256 per artifact file, keyed by path relative to the artifact root. */
  sha256: Record<string, string>;
  counts: EntityCounts;
  counts_mismatch?: Record<string, { expected: number; actual: number }>;
  parse_warnings: string[];
}

/** The fully loaded, validated artifact — the server's only data source. */
export interface Artifact {
  manifest: Manifest;
  principles: Principle[];
  phases: Phase[];
  domains: Domain[];
  capabilities: Capability[];
  personas: Persona[];
  scopes: ScopeDoc;
  technology_categories: TechnologyCategory[];
  maturity_levels: MaturityLevel[];
  maturity_extension: MaturityExtension;
  kpis: Kpi[];
  actions: Action[];
  changelog: ChangelogEntry[];
}

export const EXPECTED_COUNTS: EntityCounts = {
  principles: 6,
  phases: 3,
  domains: 4,
  capabilities: 22,
  personas: 11,
  technology_categories: 5,
  maturity_levels: 3,
  kpis: 88,
};
