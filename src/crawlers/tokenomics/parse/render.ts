import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { slugify } from "../../../shared/slugs.js";

// HTML → canonical markdown for tokeneconomics.com pages. Unlike the shared
// htmlToMd (framework dialect, byte-stable), this renderer keeps tables as
// pipe tables, block-separates <div> cards, linearizes the cache explainer's
// stacked-fraction formulas, and splits the page into h2 sections.

const DROP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "img",
  "picture",
  "video",
  "audio",
  "iframe",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "nav",
  "aside",
  "template",
  "canvas",
  "dialog",
]);

const BLOCK_TAGS = new Set([
  "div",
  "section",
  "article",
  "figure",
  "figcaption",
  "header",
  "footer",
  "blockquote",
  "main",
  "dl",
  "dt",
  "dd",
]);

const H2 = "\u0000H2\u0000";

export interface RenderedSection {
  id: string;
  title: string;
  body: string;
}

/** Heading/label text with a space between adjacent child elements, so
 * `<span>L4</span>Model…` reads "L4 Model…" instead of "L4Model…". */
export function spacedText($: CheerioAPI, el: Cheerio<AnyNode>): string {
  const parts: string[] = [];
  el.each((_, n) => walk(n));
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .trim();
  function walk(n: AnyNode): void {
    if (n.type === "text") {
      parts.push((n as unknown as { data: string }).data);
      return;
    }
    if (n.type !== "tag") return;
    const tag = (n as Element).tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) return;
    if (tag === "br") {
      parts.push(" ");
      return;
    }
    for (const c of (n as Element).children) walk(c);
  }
}

/** Collapsed visible text of an element (inline elements joined as-is). */
export function flatText(el: Cheerio<AnyNode>): string {
  return el.text().replace(/\s+/g, " ").trim();
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/** Linearize a `.tc-formula` block: "A = num / (den)" plus its where-lines. */
export function formulaLines($: CheerioAPI, el: Cheerio<AnyNode>): string[] {
  const lines: string[] = [];
  el.find(".tc-mathrow").each((_, row) => {
    const $row = $(row);
    const eq = flatText($row.find(".tc-eq").first());
    const num = flatText($row.find(".tc-num").first());
    const den = flatText($row.find(".tc-den").first());
    if (num && den) {
      const paren = (x: string) => (/[+\-×*/−]/.test(x) ? `(${x})` : x);
      lines.push(
        `${eq} ${paren(num)} / ${paren(den)}`.replace(/\s+/g, " ").trim(),
      );
    } else {
      lines.push(flatText($row));
    }
  });
  el.find(".tc-where").each((_, w) => {
    const t = flatText($(w));
    if (t) lines.push(t);
  });
  return lines;
}

export interface RenderOptions {
  origin: string;
}

/** Render `root` to markdown with h2 sentinels, then split into sections. */
export function renderSections(
  $: CheerioAPI,
  root: Cheerio<AnyNode>,
  opts: RenderOptions,
): { preamble: string; sections: RenderedSection[] } {
  const out: string[] = [];
  const usedIds = new Set<string>();
  const heads: { id: string; title: string }[] = [];

  root.each((_, n) => render(n));

  const text = out.join("");
  const chunks = text.split(H2);
  const preamble = tidy(chunks[0] ?? "");
  const sections: RenderedSection[] = [];
  for (let i = 1; i < chunks.length; i++) {
    const head = heads[i - 1] as { id: string; title: string };
    sections.push({
      id: head.id,
      title: head.title,
      body: tidy(chunks[i] ?? ""),
    });
  }
  return { preamble, sections };

  function tidy(s: string): string {
    return s
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/g, "").replace(/^ (?=\S)/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function block(fn: () => void): void {
    out.push("\n\n");
    fn();
    out.push("\n\n");
  }

  function children(n: Element): void {
    for (const c of n.children) render(c);
  }

  function sectionIdFor(el: Cheerio<AnyNode>, title: string): string {
    const own = el.attr("id");
    const sec = el.closest("section[id]").attr("id");
    let id = slugify(own ?? sec ?? title) || "section";
    if (usedIds.has(id)) {
      // A second h2 inside the same <section id>: disambiguate by title.
      id = slugify(`${id}-${title}`);
    }
    let n = 2;
    const base = id;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  }

  function render(n: AnyNode): void {
    if (n.type === "text") {
      out.push((n as unknown as { data: string }).data.replace(/\s+/g, " "));
      return;
    }
    if (n.type !== "tag" && n.type !== "script" && n.type !== "style") return;
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    const $el = $(el);
    if (DROP_TAGS.has(tag)) return;
    if ($el.attr("aria-hidden") === "true") return;
    if ($el.hasClass("tc-formula")) {
      block(() =>
        out.push(
          formulaLines($, $el)
            .map((l) => `\`${l}\``)
            .join("\n\n"),
        ),
      );
      return;
    }
    switch (tag) {
      case "h1":
        return;
      case "h2": {
        const title = spacedText($, $el);
        if (!title || /^on this page$/i.test(title)) return;
        heads.push({ id: sectionIdFor($el, title), title });
        out.push(H2);
        return;
      }
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const title = spacedText($, $el);
        if (!title) return;
        const depth = Math.min(Number(tag[1]), 5);
        out.push(`\n\n${"#".repeat(depth)} ${title}\n\n`);
        return;
      }
      case "p":
      case "summary":
        block(() => children(el));
        return;
      case "br":
        out.push("\n");
        return;
      case "hr":
        return;
      case "ul":
      case "ol": {
        out.push("\n\n");
        $el.children("li").each((i, li) => {
          const marker = tag === "ol" ? `${i + 1}.` : "-";
          const inner: string[] = [];
          const saved = out.length;
          for (const c of (li as Element).children) render(c);
          inner.push(...out.splice(saved));
          const text = inner
            .join("")
            .replace(/\n{2,}/g, "\n")
            .trim()
            .split("\n")
            .map((l, j) => (j === 0 ? l : `  ${l}`))
            .join("\n");
          if (text) out.push(`${marker} ${text}\n`);
        });
        out.push("\n");
        return;
      }
      case "table": {
        const rows: string[][] = [];
        $el.find("tr").each((_, tr) => {
          const cells: string[] = [];
          $(tr)
            .children("th, td")
            .each((__, c) => {
              cells.push(escapeCell(inlineText($(c))));
            });
          if (cells.length) rows.push(cells);
        });
        if (rows.length === 0) return;
        const width = Math.max(...rows.map((r) => r.length));
        const pad = (r: string[]) => [
          ...r,
          ...Array(width - r.length).fill(""),
        ];
        const lines = [
          `| ${pad(rows[0] as string[]).join(" | ")} |`,
          `|${" --- |".repeat(width)}`,
          ...rows.slice(1).map((r) => `| ${pad(r).join(" | ")} |`),
        ];
        block(() => out.push(lines.join("\n")));
        return;
      }
      case "strong":
      case "b": {
        const t = inlineText($el);
        if (t) out.push(`**${t}**`);
        return;
      }
      case "em":
      case "i": {
        const t = inlineText($el);
        if (t) out.push(`*${t}*`);
        return;
      }
      case "code": {
        const t = flatText($el);
        if (t) out.push(`\`${t}\``);
        return;
      }
      case "a": {
        out.push(linkMd($el));
        return;
      }
      default:
        if (BLOCK_TAGS.has(tag) || tag === "details") {
          block(() => children(el));
        } else {
          children(el);
        }
    }
  }

  function linkMd($a: Cheerio<AnyNode>): string {
    const t = flatText($a);
    if (!t) return "";
    const href = $a.attr("href");
    let url: string | null;
    try {
      url = href ? new URL(href, opts.origin).toString() : null;
    } catch {
      url = null;
    }
    if (url && url.startsWith(opts.origin) && !href?.startsWith("#")) {
      return `[${t}](${url})`;
    }
    return t;
  }

  /** Inline-only rendering for table cells and emphasis (no block breaks). */
  function inlineText(el: Cheerio<AnyNode>): string {
    const parts: string[] = [];
    el.contents().each((_, c) => {
      if (c.type === "text") {
        parts.push((c as unknown as { data: string }).data);
        return;
      }
      if (c.type !== "tag") return;
      const t = (c as Element).tagName.toLowerCase();
      const $c = $(c);
      if (DROP_TAGS.has(t)) return;
      if (t === "code") parts.push(`\`${flatText($c)}\``);
      else if (t === "strong" || t === "b") {
        const x = inlineText($c);
        if (x) parts.push(`**${x}**`);
      } else if (t === "em" || t === "i") {
        const x = inlineText($c);
        if (x) parts.push(`*${x}*`);
      } else if (t === "a") parts.push(linkMd($c));
      else if (t === "br" || t === "p" || t === "li" || t === "div")
        parts.push(` ${inlineText($c)} `);
      else parts.push(inlineText($c));
    });
    return parts.join("").replace(/\s+/g, " ").trim();
  }
}
