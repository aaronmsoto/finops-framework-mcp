import { doc } from "../../../shared/markdown/compose.js";
import { parseFrontmatter } from "../../../shared/markdown/frontmatter.js";
import {
  num,
  parseHeadingAttr,
  splitHeadingSections,
  str,
} from "../../../shared/markdown/derive.js";
import type {
  TkDocument,
  TkDocumentKind,
} from "../../../shared/tokenomics/types.js";
import type { ParsedDocument } from "../parse/document.js";

// Canonical document markdown: front-matter (metadata) + `# Title` +
// `## Section {section=id}` per section. The page preamble (text before the
// first h2) becomes an "Overview" section so every byte of body text lives
// under an addressable section id.

export const OVERVIEW_ID = "overview";

/** Folds the preamble into an Overview section (idempotent on metadata). */
export function withOverview(p: ParsedDocument): ParsedDocument {
  if (!p.preamble) return p;
  const id = p.sections.some((s) => s.id === OVERVIEW_ID)
    ? "page-overview"
    : OVERVIEW_ID;
  const sections = [{ id, title: "Overview", body: p.preamble }, ...p.sections];
  return {
    preamble: "",
    sections,
    meta: {
      ...p.meta,
      sections: sections.map((s) => ({ id: s.id, title: s.title })),
    },
  };
}

export function composeDocumentMd(p: ParsedDocument): string {
  const m = p.meta;
  return doc(
    {
      slug: m.slug,
      title: m.title,
      source_url: m.url,
      kind: m.kind,
      status: m.status,
      status_source: m.status_source,
      status_date: m.status_date ?? undefined,
      modified: m.modified ?? undefined,
      author: m.author ?? undefined,
      license: m.license,
      word_count: m.word_count,
    },
    [
      `# ${m.title}`,
      ...p.sections.map((s) => `## ${s.title} {section=${s.id}}\n\n${s.body}`),
    ],
  );
}

export function deriveDocument(text: string): TkDocument {
  const { data, body } = parseFrontmatter(text);
  const { sections } = splitHeadingSections(body, 2);
  const opt = (k: string) =>
    typeof data[k] === "string" ? (data[k] as string) : null;
  return {
    slug: str(data, "slug"),
    title: str(data, "title"),
    url: str(data, "source_url"),
    kind: str(data, "kind") as TkDocumentKind,
    status: str(data, "status"),
    status_source: str(data, "status_source") as TkDocument["status_source"],
    status_date: opt("status_date"),
    modified: opt("modified"),
    author: opt("author"),
    license: "CC-BY-4.0",
    sections: sections.map((s) => {
      const a = parseHeadingAttr(s.title, "section");
      return { id: a.value, title: a.label };
    }),
    word_count: num(data, "word_count"),
  };
}
