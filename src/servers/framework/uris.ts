// Canonical finops:// URIs — single constant authority, lowercase, no
// trailing slash (critique m6). One place defines them; resources, tools
// (resource_link blocks), and prompts all import from here.

export const AUTHORITY = "finops://framework";

export const URI = {
  overview: `${AUTHORITY}/overview`,
  principles: `${AUTHORITY}/principles`,
  phases: `${AUTHORITY}/phases`,
  domains: `${AUTHORITY}/domains`,
  scopes: `${AUTHORITY}/scopes`,
  technologyCategories: `${AUTHORITY}/technology-categories`,
  maturityModel: `${AUTHORITY}/maturity-model`,
  personasIndex: `${AUTHORITY}/personas`,
  capabilitiesIndex: `${AUTHORITY}/capabilities`,
  manifest: `${AUTHORITY}/meta/manifest`,
  changelog: `${AUTHORITY}/meta/changelog`,
  persona: (slug: string) => `${AUTHORITY}/personas/${slug}`,
  capability: (slug: string) => `${AUTHORITY}/capabilities/${slug}`,
  capabilityMaturity: (slug: string, level: string) =>
    `${AUTHORITY}/capabilities/${slug}/maturity/${level}`,
  kpi: (slug: string) => `${AUTHORITY}/kpis/${slug}`,
} as const;

export const TEMPLATES = {
  persona: `${AUTHORITY}/personas/{slug}`,
  capability: `${AUTHORITY}/capabilities/{slug}`,
  capabilityMaturity: `${AUTHORITY}/capabilities/{slug}/maturity/{level}`,
  kpi: `${AUTHORITY}/kpis/{slug}`,
} as const;
