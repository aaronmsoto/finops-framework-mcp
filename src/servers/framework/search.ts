import type { Artifact } from "../../shared/index.js";
import {
  addTokens,
  snippetOf,
  type SearchDoc as GenericSearchDoc,
  type SearchResult as GenericSearchResult,
} from "../../shared/search.js";
import { URI } from "./uris.js";

export { search } from "../../shared/search.js";

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

export type SearchDoc = GenericSearchDoc<SearchEntityType>;
export type SearchResult = GenericSearchResult<SearchEntityType>;

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
