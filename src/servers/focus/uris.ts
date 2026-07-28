// Canonical focus:// URIs (spec "Version model" §URIs). Single constant
// authority, lowercase, no trailing slash — mirrors the framework server's
// uris.ts pattern so both servers stay consistent.

export const AUTHORITY = "focus://spec";

export const URI = {
  overview: `${AUTHORITY}/overview`,
  versions: `${AUTHORITY}/versions`,
  changes: (from: string, to: string) => `${AUTHORITY}/changes/${from}-${to}`,
  glossary: (version: string) => `${AUTHORITY}/${version}/glossary`,
  column: (version: string, slug: string) =>
    `${AUTHORITY}/${version}/columns/${slug}`,
  attribute: (version: string, slug: string) =>
    `${AUTHORITY}/${version}/attributes/${slug}`,
} as const;

export const TEMPLATES = {
  glossary: `${AUTHORITY}/{version}/glossary`,
  column: `${AUTHORITY}/{version}/columns/{slug}`,
  attribute: `${AUTHORITY}/{version}/attributes/{slug}`,
} as const;
