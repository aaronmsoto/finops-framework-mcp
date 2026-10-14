import { load, type CheerioAPI } from "cheerio";
import type { TkDocument } from "../../../shared/tokenomics/types.js";
import { ORIGIN, type RegistryEntry } from "../urls.js";
import {
  flatText,
  renderSections,
  spacedText,
  type RenderedSection,
} from "./render.js";

export interface ParsedDocument {
  meta: TkDocument;
  preamble: string;
  sections: RenderedSection[];
}

/** Interactive widgets whose rendered text is UI chrome, not guidance. */
const WIDGET_SELECTORS = [
  ".tc-sim",
  ".tc-simulator",
  "[data-sim]",
  ".tfep-share",
  ".tfep-player",
  ".tfep-snippet-actions",
  ".te-docs-toc",
  ".wp-toc",
  ".sr-only",
];

export function contentRoot($: CheerioAPI) {
  const docs = $(".te-docs-content").first();
  if (docs.length) return docs;
  const primary = $("main#primary").first();
  return primary.length ? primary : $("main").first();
}

/** dateModified from the page's JSON-LD graph, if present. */
export function jsonLdModified($: CheerioAPI): string | null {
  let found: string | null = null;
  $('script[type="application/ld+json"]').each((_, s) => {
    if (found) return;
    try {
      const data = JSON.parse($(s).text()) as unknown;
      const nodes: unknown[] = Array.isArray(data)
        ? data
        : ((data as { "@graph"?: unknown[] })["@graph"] ?? [data]);
      for (const node of nodes) {
        const m = (node as { dateModified?: unknown }).dateModified;
        if (typeof m === "string") {
          found = m.slice(0, 10);
          return;
        }
      }
    } catch {
      /* malformed JSON-LD is ignored; modified falls back to REST */
    }
  });
  return found;
}

export function statusOf(
  entry: RegistryEntry,
  pageText: string,
): Pick<TkDocument, "status" | "status_source" | "status_date"> {
  const s = entry.statusPattern?.exec(pageText);
  const d = entry.datePattern?.exec(pageText);
  return {
    status: s?.[1] ?? entry.statusFallback,
    status_source: s ? "page" : "registry",
    status_date: d?.[1] ?? null,
  };
}

export function parseDocument(
  entry: RegistryEntry,
  html: string,
  restModified: string | null,
): ParsedDocument {
  const $ = load(html);
  const pageText = flatText($("body"));
  const modified = jsonLdModified($) ?? restModified;
  const root = contentRoot($);
  const title =
    (entry.title ?? spacedText($, root.find("h1").first())) ||
    spacedText($, $("h1").first()) ||
    ($('meta[property="og:title"]').attr("content") ?? entry.slug);
  root.find(WIDGET_SELECTORS.join(", ")).remove();
  const { preamble, sections } = renderSections($, root, { origin: ORIGIN });
  const words = [preamble, ...sections.map((s) => `${s.title} ${s.body}`)]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    meta: {
      slug: entry.slug,
      title: title.replace(/\s+/g, " ").trim(),
      url: entry.url,
      kind: entry.kind,
      ...statusOf(entry, pageText),
      modified,
      author: entry.author,
      license: "CC-BY-4.0",
      sections: sections.map((s) => ({ id: s.id, title: s.title })),
      word_count: words,
    },
    preamble,
    sections,
  };
}
