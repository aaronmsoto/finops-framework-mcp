import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { normalizeHeading } from "../md.js";

export function load(html: string): CheerioAPI {
  return cheerio.load(html);
}

/**
 * Find the wrapper of the section whose h2/h3 heading normalizes to one of
 * the given names. Returns the heading element; content is read relative to
 * it. Heading-text anchoring, never ids/classes (critique B2).
 */
export function findHeading(
  $: CheerioAPI,
  level: "h2" | "h3" | "h4" | "h5",
  names: string[],
): Cheerio<AnyNode> | null {
  return findHeadings($, level, names)[0] ?? null;
}

/** All headings matching the names — some pages repeat a section heading. */
export function findHeadings(
  $: CheerioAPI,
  level: "h2" | "h3" | "h4" | "h5",
  names: string[],
): Cheerio<AnyNode>[] {
  const wanted = names.map(normalizeHeading);
  const found: Cheerio<AnyNode>[] = [];
  $(level).each((_, el) => {
    const t = normalizeHeading($(el).text());
    if (wanted.includes(t)) found.push($(el));
  });
  return found;
}

/**
 * Content of the section started by `heading`: the siblings following it
 * within its parent container. Works for both "heading + siblings share a
 * wrapper div" (capability pages) and flat layouts (section pages), because
 * we stop at the next heading of the same or higher level.
 */
export function sectionContent(
  $: CheerioAPI,
  heading: Cheerio<AnyNode>,
): Cheerio<AnyNode> {
  const el = heading.get(0);
  const tag = el && "tagName" in el ? el.tagName.toLowerCase() : "h2";
  const stop =
    ["h1", "h2", "h3", "h4"].slice(0, Number(tag[1])).join(", ") + `, ${tag}`;
  const siblings = heading.nextUntil(stop);
  if (siblings.length > 0) return siblings;
  // Heading alone in a wrapper: use the wrapper's following siblings.
  return heading.parent().nextUntil(stop);
}

/** All h4 subsections inside a section: heading text → nodes until next h4. */
export function h4Blocks(
  $: CheerioAPI,
  section: Cheerio<AnyNode>,
): { title: string; nodes: Cheerio<AnyNode> }[] {
  const blocks: { title: string; nodes: Cheerio<AnyNode> }[] = [];
  section
    .find("h4")
    .addBack("h4")
    .each((_, el) => {
      const $el = $(el);
      blocks.push({ title: $el.text().trim(), nodes: $el.nextUntil("h4") });
    });
  return blocks;
}

/** Slug of the last path segment of an on-site link, if it matches prefix. */
export function slugFromHref(
  href: string | undefined,
  pathPrefix: string,
): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, "https://www.finops.org");
    if (u.hostname !== "www.finops.org" && u.hostname !== "finops.org")
      return null;
    const path = u.pathname.replace(/\/+$/, "");
    const prefix = pathPrefix.replace(/\/+$/, "");
    if (!path.startsWith(prefix + "/")) return null;
    const rest = path.slice(prefix.length + 1).split("/");
    return rest.length === 1 && rest[0] ? rest[0] : null;
  } catch {
    return null;
  }
}
