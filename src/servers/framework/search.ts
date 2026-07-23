import type { Artifact } from "../../shared/index.js";
import { URI } from "./uris.js";

export type SearchEntityType =
  | "capability"
  | "kpi"
  | "persona"
  | "principle"
  | "phase"
  | "domain"
  | "technology-category"
  | "maturity-level"
  | "scope";

export interface SearchDoc {
  entity_type: SearchEntityType;
  slug: string;
  title: string;
  uri: string;
  snippet: string;
  tokens: Map<string, number>;
}

export interface SearchResult {
  entity_type: SearchEntityType;
  slug: string;
  title: string;
  uri: string;
  snippet: string;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function addTokens(
  map: Map<string, number>,
  text: string,
  weight: number,
): void {
  for (const t of tokenize(text)) {
    map.set(t, (map.get(t) ?? 0) + weight);
  }
}

function snippetOf(text: string): string {
  // Strip markdown constructs only — never intra-word characters like
  // hyphens ("technology-related" must survive, critique-2).
  const flat = text
    .replace(/^[#>\-*]+\s*/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 220 ? `${flat.slice(0, 217)}…` : flat;
}

/** Built at server startup from the artifact — never persisted (critique m10). */
export function buildSearchIndex(artifact: Artifact): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const doc = (
    entity_type: SearchEntityType,
    slug: string,
    title: string,
    uri: string,
    fields: { text: string; weight: number }[],
    snippetSource: string,
  ) => {
    const tokens = new Map<string, number>();
    addTokens(tokens, title, 6);
    for (const f of fields) addTokens(tokens, f.text, f.weight);
    docs.push({
      entity_type,
      slug,
      title,
      uri,
      snippet: snippetOf(snippetSource),
      tokens,
    });
  };

  for (const c of artifact.capabilities) {
    doc(
      "capability",
      c.slug,
      c.title,
      URI.capability(c.slug),
      [
        { text: c.summary, weight: 3 },
        { text: c.definition_md, weight: 1 },
        { text: Object.values(c.maturity_raw).join(" "), weight: 1 },
        { text: c.kpi_bullets.join(" "), weight: 1 },
        { text: c.inputs_outputs_md, weight: 1 },
      ],
      c.summary || c.definition_md,
    );
  }
  for (const k of artifact.kpis) {
    doc(
      "kpi",
      k.slug,
      k.title,
      URI.kpi(k.slug),
      [
        { text: k.description_md, weight: 2 },
        { text: k.formula ?? "", weight: 2 },
      ],
      k.description_md,
    );
  }
  for (const p of artifact.personas) {
    doc(
      "persona",
      p.slug,
      p.title,
      URI.persona(p.slug),
      [{ text: p.description_md, weight: 1 }],
      p.description_md,
    );
  }
  for (const p of artifact.principles) {
    doc(
      "principle",
      p.slug,
      p.title,
      URI.principles,
      [{ text: p.description_md, weight: 2 }],
      p.description_md,
    );
  }
  for (const p of artifact.phases) {
    doc(
      "phase",
      p.slug,
      p.title,
      URI.phases,
      [{ text: p.description_md, weight: 2 }],
      p.description_md,
    );
  }
  for (const d of artifact.domains) {
    doc(
      "domain",
      d.slug,
      d.title,
      URI.domains,
      [
        { text: d.description_md, weight: 2 },
        { text: d.capability_slugs.join(" "), weight: 1 },
      ],
      d.description_md,
    );
  }
  for (const t of artifact.technology_categories) {
    doc(
      "technology-category",
      t.slug,
      t.title,
      URI.technologyCategories,
      [{ text: t.description_md, weight: 2 }],
      t.description_md,
    );
  }
  for (const m of artifact.maturity_levels) {
    doc(
      "maturity-level",
      m.slug,
      m.title,
      URI.maturityModel,
      [
        { text: m.characteristics_md, weight: 2 },
        { text: m.sample_goals_md, weight: 2 },
      ],
      m.characteristics_md,
    );
  }
  doc(
    "scope",
    "scopes",
    artifact.scopes.title,
    URI.scopes,
    [
      {
        text: artifact.scopes.sections
          .map((s) => `${s.heading} ${s.body_md}`)
          .join(" "),
        weight: 1,
      },
    ],
    artifact.scopes.sections[0]?.body_md ?? "",
  );
  return docs;
}

export function search(
  index: SearchDoc[],
  query: string,
  entityTypes?: SearchEntityType[],
): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const results: SearchResult[] = [];
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
