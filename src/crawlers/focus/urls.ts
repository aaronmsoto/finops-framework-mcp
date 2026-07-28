export const REPO = "FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec";
export const ORIGIN = "https://raw.githubusercontent.com";
export const USER_AGENT =
  "finops-focus-mcp-crawler/1.0 (+https://github.com/aaronmsoto/finops-framework-mcp)";

export interface FocusVersionDef {
  spec_version: string;
  source_tag: string;
  expected_columns: number;
}

/** Non-goal (v1, spec): only these two tags are ingested. */
export const VERSIONS: readonly FocusVersionDef[] = [
  { spec_version: "1.0", source_tag: "v1.0", expected_columns: 43 },
  { spec_version: "1.2", source_tag: "v1.2", expected_columns: 57 },
];

export function rawUrl(tag: string, path: string): string {
  return `${ORIGIN}/${REPO}/${tag}/${path}`;
}

export function jsDelivrFlatTreeUrl(tag: string): string {
  return `https://data.jsdelivr.com/v1/packages/gh/${REPO}@${tag}?structure=flat`;
}

/** All content here is markdown/JSON from a trusted, versioned git tag — the
 * default HTML-page validity check (min length + <h1>) does not apply. */
export function isValidFocusBody(_url: string, body: string): boolean {
  return body.length > 0;
}
