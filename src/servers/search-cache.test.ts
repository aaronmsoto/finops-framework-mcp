// The Cloudflare Worker builds a fresh MCP server per request, so each
// server's search index is cached per artifact object instead of being
// rebuilt on every createServer() call. These tests pin that contract: the
// same artifact yields the same index instance (no rebuild), a different
// artifact object gets its own index, and searching never mutates it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadArtifact, loadFocusStore } from "../shared/index.js";
import { loadTokenomicsArtifact } from "../shared/tokenomics/artifact.js";
import * as frameworkSearch from "./framework/search.js";
import * as focusSearch from "./focus/search.js";
import * as tokenomicsSearch from "./tokenomics/search.js";

const DATA = join(import.meta.dirname, "../../data");

describe("search index cache", () => {
  it("framework: reuses the index per artifact and rebuilds for a new one", () => {
    const a = loadArtifact(join(DATA, "framework"));
    const first = frameworkSearch.buildSearchIndex(a);
    expect(frameworkSearch.buildSearchIndex(a)).toBe(first);
    const b = loadArtifact(join(DATA, "framework"));
    const other = frameworkSearch.buildSearchIndex(b);
    expect(other).not.toBe(first);
    expect(other).toEqual(first);
  });

  it("focus: reuses the index per version artifact", () => {
    const store = loadFocusStore(join(DATA, "focus"));
    const v12 = store.versions.get("1.2");
    expect(v12).toBeDefined();
    const first = focusSearch.buildSearchIndex("1.2", v12!);
    expect(focusSearch.buildSearchIndex("1.2", v12!)).toBe(first);
    const v10 = store.versions.get("1.0")!;
    expect(focusSearch.buildSearchIndex("1.0", v10)).not.toBe(first);
  });

  it("tokenomics: reuses the index and searching leaves it unchanged", () => {
    const a = loadTokenomicsArtifact(join(DATA, "tokenomics"));
    const index = tokenomicsSearch.buildSearchIndex(a);
    const dump = (x: unknown) =>
      JSON.stringify(x, (_k, v: unknown) => (v instanceof Map ? [...v] : v));
    const snapshot = dump(index);
    tokenomicsSearch.search(index, "model routing gateway");
    tokenomicsSearch.search(index, "cache hit rate");
    expect(tokenomicsSearch.buildSearchIndex(a)).toBe(index);
    expect(dump(index)).toBe(snapshot);
  });
});
