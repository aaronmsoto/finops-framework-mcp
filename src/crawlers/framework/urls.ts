export const ORIGIN = "https://www.finops.org";

export const URLS = {
  robots: `${ORIGIN}/robots.txt`,
  overview: `${ORIGIN}/framework/`,
  principles: `${ORIGIN}/framework/principles/`,
  phases: `${ORIGIN}/framework/phases/`,
  domains: `${ORIGIN}/framework/domains/`,
  maturityModel: `${ORIGIN}/framework/maturity-model/`,
  personasIndex: `${ORIGIN}/framework/personas/`,
  scopes: `${ORIGIN}/framework/scopes/`,
  technologyCategories: `${ORIGIN}/framework/technology-categories/`,
  capabilitiesApi: `${ORIGIN}/wp-json/wp/v2/capabilities-api?compare=all`,
  personasApi: `${ORIGIN}/wp-json/wp/v2/personas-api?compare=all`,
  kpisApi: `${ORIGIN}/wp-json/wp/v2/kpis-api?compare=all`,
  kpiCollection: `${ORIGIN}/wp-json/wp/v2/kpi?per_page=100`,
  capabilitiesSitemap: `${ORIGIN}/sitemap-capabilities.xml`,
} as const;

export const USER_AGENT =
  "finops-framework-mcp-crawler/0.1 (+https://github.com/aaronmsoto/finops-framework-mcp)";
