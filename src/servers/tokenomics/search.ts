import type { TokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import {
  addTokens,
  snippetOf,
  type SearchDoc as GenericSearchDoc,
  type SearchResult as GenericSearchResult,
} from "../../shared/search.js";
import { URI } from "./uris.js";

export { search } from "../../shared/search.js";

export const SEARCH_ENTITY_TYPES = [
  "document-section",
  "layer",
  "bigt-class",
  "lever",
  "metric",
  "persona",
  "value-category",
  "glossary-term",
  "focus-item",
] as const;
export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];
export type SearchDoc = GenericSearchDoc<SearchEntityType>;
export type SearchResult = GenericSearchResult<SearchEntityType>;

/** Built once at startup. Structured records outrank document sections of
 * equal relevance (higher title/field weights) so a query like "cache hit
 * rate" lands on the metric before the prose that mentions it. */
export function buildSearchIndex(a: TokenomicsArtifact): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const push = (
    entity_type: SearchEntityType,
    slug: string,
    title: string,
    uri: string,
    fields: [string, number][],
    snippet: string,
  ) => {
    const tokens = new Map<string, number>();
    addTokens(tokens, title, 8);
    for (const [text, w] of fields) addTokens(tokens, text, w);
    docs.push({
      entity_type,
      slug,
      title,
      uri,
      snippet: snippetOf(snippet),
      tokens,
    });
  };
  for (const l of a.layers) {
    push(
      "layer",
      l.slug,
      `L${l.number} ${l.name}`,
      URI.layer(l.slug),
      [
        [l.key_metric, 4],
        [l.primary_levers.join(" "), 4],
        [l.description_md, 1],
      ],
      l.description_md,
    );
  }
  for (const c of a.bigt.classes) {
    push(
      "bigt-class",
      c.slug,
      `${c.notation} ${c.name}`,
      URI.bigtClass(c.slug),
      [
        [c.description, 2],
        [c.fix, 3],
      ],
      c.description,
    );
  }
  for (const l of a.levers) {
    push(
      "lever",
      l.slug,
      l.name,
      URI.lever(l.slug),
      [
        [l.description_md, 2],
        [l.effect ?? "", 1],
      ],
      l.description_md,
    );
  }
  for (const m of a.metrics) {
    push(
      "metric",
      m.slug,
      m.name,
      URI.metric(m.slug),
      [
        [m.formula ?? m.formula_text ?? "", 4],
        [m.definition_md, 2],
      ],
      m.definition_md,
    );
  }
  for (const p of a.personas) {
    push(
      "persona",
      p.slug,
      p.name,
      URI.persona(p.slug),
      [
        [p.responsibility, 3],
        [p.signals.join(" "), 2],
        [p.description_md, 1],
      ],
      p.responsibility,
    );
  }
  for (const v of a.value.categories) {
    push(
      "value-category",
      v.slug,
      v.name,
      URI.document("value-classification"),
      [
        [v.description, 2],
        [v.estimate_as ?? "", 2],
      ],
      v.description,
    );
  }
  for (const g of a.glossary) {
    push(
      "glossary-term",
      g.slug,
      g.term,
      URI.glossary,
      [[g.definition, 3]],
      g.definition,
    );
  }
  for (const f of a.focusTracker) {
    push(
      "focus-item",
      f.slug,
      f.title,
      URI.focusTracker,
      [
        [f.identifiers.join(" "), 5],
        [f.body_md, 1],
      ],
      f.body_md,
    );
  }
  for (const d of a.documents) {
    const body = a.documentBodies.get(d.slug) ?? "";
    for (const part of body.split(/\n(?=## )/)) {
      const m = /^## (.+) \{section=([^}]+)\}/.exec(part);
      if (!m) continue;
      push(
        "document-section",
        `${d.slug}#${m[2]}`,
        `${d.title}: ${m[1]}`,
        URI.document(d.slug),
        [[part, 1]],
        part.replace(/^## .+\n/, ""),
      );
    }
  }
  return docs;
}
