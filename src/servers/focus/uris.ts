// Canonical focus:// URIs (spec "Version model" §URIs). Single constant
// authority, lowercase, no trailing slash — mirrors the framework server's
// uris.ts pattern so both servers stay consistent.

export const AUTHORITY = "focus://spec";

export const URI = {
  overview: `${AUTHORITY}/overview`,
  versions: `${AUTHORITY}/versions`,
  changes: (from: string, to: string) => `${AUTHORITY}/changes/${from}-${to}`,
  glossary: (version: string) => `${AUTHORITY}/${version}/glossary`,
  changelog: (version: string) => `${AUTHORITY}/${version}/changelog`,
  column: (version: string, slug: string) =>
    `${AUTHORITY}/${version}/columns/${slug}`,
  attribute: (version: string, slug: string) =>
    `${AUTHORITY}/${version}/attributes/${slug}`,
} as const;

export const TEMPLATES = {
  glossary: `${AUTHORITY}/{version}/glossary`,
  changelog: `${AUTHORITY}/{version}/changelog`,
  column: `${AUTHORITY}/{version}/columns/{slug}`,
  attribute: `${AUTHORITY}/{version}/attributes/{slug}`,
} as const;

// The framework server's finops://framework/kpis/{slug} URI, duplicated
// (not imported) intentionally: the two servers package separately
// (spec "Packaging"), and this authority is a fixed public contract
// (src/servers/framework/uris.ts's URI.kpi) cross-validated in tests, not
// a shared runtime dependency.
export const FRAMEWORK_KPI_URI = (slug: string) =>
  `finops://framework/kpis/${slug}`;
