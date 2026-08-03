// Generic in-memory ranked keyword search core shared by every MCP server
// built on this framework. A server builds its own SearchDoc index from its
// artifact (entity-type-specific field weighting) and calls `search` here to
// rank it — never persisted, built fresh at server startup.

export interface SearchDoc<T extends string> {
  entity_type: T;
  slug: string;
  title: string;
  uri: string;
  snippet: string;
  tokens: Map<string, number>;
}

export interface SearchResult<T extends string> {
  entity_type: T;
  slug: string;
  title: string;
  uri: string;
  snippet: string;
  score: number;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

export function addTokens(
  map: Map<string, number>,
  text: string,
  weight: number,
): void {
  for (const t of tokenize(text)) {
    map.set(t, (map.get(t) ?? 0) + weight);
  }
}

/** Strip markdown constructs only — never intra-word characters like
 * hyphens ("technology-related" must survive, critique-2). */
export function snippetOf(text: string): string {
  const flat = text
    .replace(/^[#>\-*]+\s*/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 220 ? `${flat.slice(0, 217)}…` : flat;
}

export function search<T extends string>(
  index: SearchDoc<T>[],
  query: string,
  entityTypes?: T[],
): SearchResult<T>[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const results: SearchResult<T>[] = [];
  for (const d of index) {
    if (
      entityTypes &&
      entityTypes.length > 0 &&
      !entityTypes.includes(d.entity_type)
    ) {
      continue;
    }
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      const w = d.tokens.get(t) ?? 0;
      if (w > 0) matched += 1;
      score += w;
    }
    // Require at least half the terms to hit so multi-word queries stay precise.
    if (matched === 0 || matched < Math.ceil(terms.length / 2)) continue;
    results.push({
      entity_type: d.entity_type,
      slug: d.slug,
      title: d.title,
      uri: d.uri,
      snippet: d.snippet,
      score: score * (matched / terms.length),
    });
  }
  return results.sort(
    (a, b) => b.score - a.score || a.slug.localeCompare(b.slug),
  );
}
