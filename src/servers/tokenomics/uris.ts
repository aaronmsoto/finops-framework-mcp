// Canonical tokenomics:// URIs — single constant authority, lowercase, no
// trailing slash (same conventions as the framework and FOCUS servers).

export const AUTHORITY = "tokenomics://overview";

export const URI = {
  start: `${AUTHORITY}/start`,
  bigt: `${AUTHORITY}/bigt`,
  glossary: `${AUTHORITY}/glossary`,
  focusTracker: `${AUTHORITY}/focus-tracker`,
  manifest: `${AUTHORITY}/meta/manifest`,
  document: (slug: string) => `${AUTHORITY}/documents/${slug}`,
  layer: (slug: string) => `${AUTHORITY}/layers/${slug}`,
  metric: (slug: string) => `${AUTHORITY}/metrics/${slug}`,
  persona: (slug: string) => `${AUTHORITY}/personas/${slug}`,
  lever: (slug: string) => `${AUTHORITY}/levers/${slug}`,
  bigtClass: (slug: string) => `${AUTHORITY}/bigt/${slug}`,
} as const;

export const TEMPLATES = {
  document: `${AUTHORITY}/documents/{slug}`,
  layer: `${AUTHORITY}/layers/{slug}`,
  metric: `${AUTHORITY}/metrics/{slug}`,
  persona: `${AUTHORITY}/personas/{slug}`,
  lever: `${AUTHORITY}/levers/{slug}`,
  bigtClass: `${AUTHORITY}/bigt/{slug}`,
} as const;
