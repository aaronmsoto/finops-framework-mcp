import type { TkDocumentKind } from "../../shared/tokenomics/types.js";

export const ORIGIN = "https://www.tokeneconomics.com";
export const USER_AGENT =
  "tokenomics-overview-mcp-crawler/0.1 (+https://github.com/aaronmsoto/finops-framework-mcp)";

/** REST listings used for discovery + modified dates only — bodies come from
 * the rendered HTML (project bodies are Custom HTML blocks or empty in REST). */
export const REST_LISTINGS = [
  `${ORIGIN}/wp-json/wp/v2/pages?per_page=100&_fields=id,link,modified`,
  `${ORIGIN}/wp-json/wp/v2/te_doc?per_page=100&_fields=id,link,modified`,
  `${ORIGIN}/wp-json/wp/v2/te_page?per_page=100&_fields=id,link,modified`,
  `${ORIGIN}/wp-json/wp/v2/asset?per_page=100&_fields=id,link,modified`,
];

/** Pages deliberately never ingested (spec "Sources"): State of Tokenomics
 * (report is all rights reserved), site chrome, events, membership. Matched
 * against the URL path; anything else unregistered is reported, not fetched. */
export const DENY_PATH_PREFIXES = [
  "/state-of-tokenomics",
  "/insights/state-of-tokenomics",
  "/about",
  "/membership",
  "/events",
  "/timeline",
  "/tokenomics-nyc",
  "/tokenomics-100-sf",
  "/tokenomics-certified",
  "/tokenomics-mind-map",
];

export interface RegistryEntry {
  slug: string;
  url: string;
  kind: TkDocumentKind;
  /** Regex over the page's visible text capturing the status label. */
  statusPattern: RegExp | null;
  /** Used (status_source "registry") when the page shows no label. */
  statusFallback: string;
  /** Regex capturing a status/last-updated date, when the page states one. */
  datePattern: RegExp | null;
  author: string | null;
  /** Display title when the page's h1 is a tagline rather than a name. */
  title?: string;
}

/** The v1 document registry (spec "Sources"). Order is presentation order. */
export const REGISTRY: RegistryEntry[] = [
  {
    slug: "what-is-tokenomics",
    url: `${ORIGIN}/docs/overview/what-is-tokenomics/`,
    kind: "docs",
    statusPattern: /\b(Working Draft)\s+(?:[A-Z][a-z]+ \d{4})/,
    statusFallback: "Working Draft",
    datePattern: /Working Draft\s+([A-Z][a-z]+ \d{4})/,
    author: null,
  },
  {
    slug: "five-layer-stack",
    url: `${ORIGIN}/projects/the-five-layer-tokenomics-stack/`,
    kind: "project",
    statusPattern: null,
    statusFallback: "Draft paper (projects index label)",
    datePattern: null,
    author: null,
  },
  {
    slug: "five-layer-stack-paper",
    url: `${ORIGIN}/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/`,
    kind: "paper",
    statusPattern: null,
    statusFallback: "Draft paper (projects index label)",
    datePattern: null,
    author: null,
  },
  {
    slug: "big-t-notation",
    url: `${ORIGIN}/projects/big-t-notation/`,
    kind: "project",
    statusPattern: null,
    statusFallback: "Published project explainer (no status label)",
    datePattern: null,
    author: "Dan Neff (Adobe)",
  },
  {
    slug: "big-t-notation-paper",
    url: `${ORIGIN}/docs/projects/big-t/big-t-notation-paper/`,
    kind: "paper",
    statusPattern: /\b(Working Draft)\s+(?:[A-Z][a-z]+ \d{4})/,
    statusFallback: "Working Draft",
    datePattern: /Working Draft\s+([A-Z][a-z]+ \d{4})/,
    author: "Dan Neff (Adobe)",
  },
  {
    slug: "cache-explainer",
    url: `${ORIGIN}/cache-explainer/`,
    title: "AI Tokenomics Prompt Cache Explainer",
    kind: "project",
    statusPattern: /\b(Release Candidate \d+)\b/,
    statusFallback: "Release Candidate",
    datePattern: /Last updated:?\s*(\d{4}-\d{2}-\d{2})/,
    author: "Tokenomics Foundation Consumption Working Group",
  },
  {
    slug: "personas-operating-model",
    url: `${ORIGIN}/personas-and-operating-model-map/`,
    kind: "project",
    statusPattern: /\b(Release Candidate \d+)\b/,
    statusFallback: "Release Candidate",
    datePattern: /Last updated:?\s*(\d{4}-\d{2}-\d{2})/,
    author: null,
  },
  {
    slug: "value-classification",
    url: `${ORIGIN}/ai-value-classification/`,
    kind: "project",
    statusPattern: /\b(Release Candidate \d+)\b/,
    statusFallback: "Release Candidate",
    datePattern: /Last updated:?\s*(\d{4}-\d{2}-\d{2})/,
    author: null,
  },
  {
    slug: "focus-1-5-for-ai",
    url: `${ORIGIN}/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/`,
    kind: "project",
    statusPattern: /\b(Status as of \d{1,2} [A-Z][a-z]{2,8} \d{4})/,
    statusFallback: "Status page (nothing on it is a commitment)",
    datePattern: /Status as of (\d{1,2} [A-Z][a-z]{2,8} \d{4})/,
    author: "Matt Cowsert",
  },
  {
    slug: "total-cost-of-ai",
    url: `${ORIGIN}/insights/total-cost-of-ai-tca/`,
    kind: "insight",
    statusPattern: null,
    statusFallback: "Podcast episode 17 (TCA is a proposal, not ratified)",
    datePattern: null,
    author: "J.R. Storment",
  },
  {
    slug: "routing-wars",
    url: `${ORIGIN}/insights/podcast-16-of-tokenomics-brief-routing-wars-tokenomics-in-action/`,
    kind: "insight",
    statusPattern: null,
    statusFallback:
      "Podcast episode 16 (survey data described as early, directional)",
    datePattern: null,
    author: "J.R. Storment",
  },
  {
    slug: "what-tokenomics-is-and-isnt",
    url: `${ORIGIN}/what-tokenomics-is-and-what-it-isnt/`,
    kind: "insight",
    statusPattern: null,
    statusFallback: "Member-call synthesis (unlisted page)",
    datePattern: null,
    author: null,
  },
];

export const EXPECTED_COUNTS: Record<string, number> = {
  documents: 12,
  stages: 3,
  layers: 5,
  bigt_classes: 6,
  bigt_variables: 3,
  metrics: 7,
  personas: 12,
  value_categories: 10,
  booking_destinations: 5,
  cache_providers: 3,
};

/** Lower bounds for collections whose exact size tracks upstream edits. */
export const MIN_COUNTS: Record<string, number> = {
  levers: 20,
  glossary: 15,
  focus_tracker: 10,
};

/** Accept rendered HTML pages and REST JSON; reject error pages. */
export function isValidTokenomicsBody(url: string, body: string): boolean {
  if (url.includes("/wp-json/")) return body.trimStart().startsWith("[");
  if (url.endsWith("robots.txt")) return true;
  return body.length > 2000 && /<main\b/i.test(body);
}
