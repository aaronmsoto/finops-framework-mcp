import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { ORIGIN } from "./urls.js";

/**
 * Normalize a heading for structure-anchored matching: lowercase, entities
 * decoded, "&"/"and" folded, punctuation/whitespace collapsed (critique B2).
 */
export function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/&amp;|&#0?38;|&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function absoluteUrl(href: string | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, ORIGIN).toString();
  } catch {
    return null;
  }
}

/**
 * Minimal HTML → markdown for the framework's prose (p, lists, headings,
 * bold/em, links, simple tables are flattened to text). Sanitization rules
 * (docs/architecture.md §6.3): scripts/styles/comments dropped by cheerio
 * parsing here; `data:` URIs dropped; off-finops.org links kept as plain
 * text so crawled content cannot smuggle live external links.
 */
export function htmlToMd($: CheerioAPI, node: Cheerio<AnyNode>): string {
  const out: string[] = [];
  node.each((_, n) => render($(n), ""));
  return out
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  function renderChildren(el: Cheerio<AnyNode>, listPrefix: string): void {
    el.contents().each((_, child) => {
      render($(child), listPrefix);
    });
  }

  function render(el: Cheerio<AnyNode>, listPrefix: string): void {
    const node0 = el.get(0);
    if (!node0) return;
    if (node0.type === "text") {
      out.push(el.text().replace(/\s+/g, " "));
      return;
    }
    if (
      node0.type !== "tag" &&
      node0.type !== "script" &&
      node0.type !== "style"
    ) {
      return;
    }
    const tag = "tagName" in node0 ? node0.tagName.toLowerCase() : "";
    switch (tag) {
      case "script":
      case "style":
      case "noscript":
      case "svg":
      case "img":
      case "iframe":
      case "form":
      case "button":
        return;
      case "br":
        out.push("\n");
        return;
      case "p": {
        out.push("\n\n");
        renderChildren(el, listPrefix);
        out.push("\n\n");
        return;
      }
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const depth = Math.min(Number(tag[1]) + 1, 6);
        out.push(
          `\n\n${"#".repeat(depth)} ${el.text().replace(/\s+/g, " ").trim()}\n\n`,
        );
        return;
      }
      case "ul":
      case "ol": {
        out.push("\n");
        el.children("li").each((i, li) => {
          const marker = tag === "ol" ? `${i + 1}.` : "-";
          out.push(`\n${listPrefix}${marker} `);
          renderChildren($(li), listPrefix + "  ");
        });
        out.push("\n");
        return;
      }
      case "li": {
        renderChildren(el, listPrefix);
        return;
      }
      case "strong":
      case "b": {
        out.push("**");
        renderChildren(el, listPrefix);
        out.push("**");
        return;
      }
      case "em":
      case "i": {
        out.push("*");
        renderChildren(el, listPrefix);
        out.push("*");
        return;
      }
      case "a": {
        const url = absoluteUrl(el.attr("href"));
        const text = el.text().replace(/\s+/g, " ").trim();
        if (!text) return;
        if (url && url.startsWith(ORIGIN) && !url.startsWith("data:")) {
          out.push(`[${text}](${url})`);
        } else {
          out.push(text);
        }
        return;
      }
      default:
        renderChildren(el, listPrefix);
    }
  }
}

/** Flat text of an element with collapsed whitespace. */
export function textOf(el: Cheerio<AnyNode>): string {
  return el.text().replace(/\s+/g, " ").trim();
}

/** Direct list items of a <ul>/<ol>, each with optional one-level children. */
export interface ListItem {
  text: string;
  children: string[];
}

export function parseList($: CheerioAPI, list: Cheerio<AnyNode>): ListItem[] {
  const items: ListItem[] = [];
  list.children("li").each((_, li) => {
    const $li = $(li);
    const children: string[] = [];
    $li.find("ul li, ol li").each((_, sub) => {
      const t = textOf($(sub));
      if (t) children.push(t);
    });
    const own = $li.clone();
    own.find("ul, ol").remove();
    const text = textOf(own);
    if (text) items.push({ text, children });
  });
  return items;
}
