import type { FocusVersionArtifact } from "../../shared/focus/artifact.js";
import {
  addTokens,
  snippetOf,
  type SearchDoc as GenericSearchDoc,
  type SearchResult as GenericSearchResult,
} from "../../shared/search.js";
import { URI } from "./uris.js";

export { search } from "../../shared/search.js";

export type SearchEntityType = "column" | "attribute";

export type SearchDoc = GenericSearchDoc<SearchEntityType>;
export type SearchResult = GenericSearchResult<SearchEntityType>;

/** Built at server startup, one index per spec version (search_focus is
 * version-scoped — columns are added/renamed across versions, so a merged
 * cross-version index would blur which version a hit actually applies to). */
/** Cached per version artifact object (see the framework server's search.ts:
 * the Worker builds a fresh server per request); search never mutates it.
 * Keyed by artifact alone even though `version` is baked into each doc's URI:
 * loadFocusStore gives every version its own artifact object. */
const INDEX_CACHE = new WeakMap<FocusVersionArtifact, SearchDoc[]>();

export function buildSearchIndex(
  version: string,
  artifact: FocusVersionArtifact,
): SearchDoc[] {
  let docs = INDEX_CACHE.get(artifact);
  if (!docs) {
    docs = computeSearchIndex(version, artifact);
    INDEX_CACHE.set(artifact, docs);
  }
  return docs;
}

function computeSearchIndex(
  version: string,
  artifact: FocusVersionArtifact,
): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const c of artifact.columns) {
    const tokens = new Map<string, number>();
    addTokens(tokens, c.display_name, 6);
    addTokens(tokens, c.id, 6);
    addTokens(tokens, c.description_md, 3);
    addTokens(tokens, c.requirements.join(" "), 1);
    docs.push({
      entity_type: "column",
      slug: c.slug,
      title: c.display_name,
      uri: URI.column(version, c.slug),
      snippet: snippetOf(c.description_md),
      tokens,
    });
  }
  for (const a of artifact.attributes) {
    const tokens = new Map<string, number>();
    addTokens(tokens, a.display_name, 6);
    addTokens(tokens, a.id, 6);
    addTokens(tokens, a.description_md, 3);
    addTokens(tokens, a.requirements.join(" "), 1);
    docs.push({
      entity_type: "attribute",
      slug: a.slug,
      title: a.display_name,
      uri: URI.attribute(version, a.slug),
      snippet: snippetOf(a.description_md),
      tokens,
    });
  }
  return docs;
}
