import {
  LICENSE,
  type Domain,
  type MaturityLevel,
  type OfficialMaturityLevel,
  type Persona,
  type Phase,
  type Principle,
  type ScopeDoc,
  type TechnologyCategory,
} from "../../../shared/index.js";
import { slugify } from "../../../shared/index.js";
import { htmlToMd, normalizeHeading, textOf } from "../md.js";
import { findHeading, load, slugFromHref } from "./helpers.js";

const FOOTER_HEADINGS = new Set([
  "finops foundation",
  "resources",
  "training and certification",
  "make suggestions",
  "suggest a resource",
  "on this page",
  "related assets",
  "technology categories related assets",
]);

function isContentHeading(text: string): boolean {
  return !FOOTER_HEADINGS.has(normalizeHeading(text));
}

/** Principles page: six ff-card blocks with <h5> title + <ul> bullets. */
export function parsePrinciples(html: string, url: string): Principle[] {
  const $ = load(html);
  const out: Principle[] = [];
  $("h5").each((_, el) => {
    const $el = $(el);
    const title = textOf($el).replace(/\.$/, "");
    if (!title || !isContentHeading(title)) return;
    const card = $el.parent();
    const body = htmlToMd($, card.children().not("h5"));
    if (!body) return;
    out.push({
      slug: slugify(title),
      title,
      description_md: body,
      order: out.length + 1,
      source_url: url,
      license: LICENSE,
    });
  });
  return out;
}

/** Phases page: h2 Inform/Optimize/Operate each with an h3 tagline + prose. */
export function parsePhases(html: string, url: string): Phase[] {
  const $ = load(html);
  const out: Phase[] = [];
  const wanted = ["inform", "optimize", "operate"];
  $("h2").each((_, el) => {
    const $el = $(el);
    const title = textOf($el);
    if (!wanted.includes(normalizeHeading(title))) return;
    const content = $el.nextUntil("h2");
    out.push({
      slug: slugify(title),
      title,
      description_md: htmlToMd($, content),
      order: out.length + 1,
      source_url: url,
      license: LICENSE,
    });
  });
  return out;
}

/** Domains page: ff-domain-card blocks — h3 title, <p> description, capability links. */
export function parseDomains(html: string, url: string): Domain[] {
  const $ = load(html);
  const out: Domain[] = [];
  $("div.ff-domain-card").each((_, el) => {
    const $el = $(el);
    const title = textOf($el.find("h3").first());
    if (!title) return;
    const description_md = htmlToMd($, $el.children("p").first());
    const capability_slugs: string[] = [];
    $el.find("a").each((_, a) => {
      const s = slugFromHref($(a).attr("href"), "/framework/capabilities");
      if (s && !capability_slugs.includes(s)) capability_slugs.push(s);
    });
    out.push({
      slug: slugify(title),
      title,
      description_md,
      capability_slugs,
      source_url: url,
      license: LICENSE,
    });
  });
  return out;
}

/** Maturity model page: h2 Crawl/Walk/Run, h3 characteristics + sample goals. */
export function parseMaturityModel(html: string, url: string): MaturityLevel[] {
  const $ = load(html);
  const out: MaturityLevel[] = [];
  const levels: OfficialMaturityLevel[] = ["crawl", "walk", "run"];
  $("h2").each((_, el) => {
    const $el = $(el);
    const slug = normalizeHeading(textOf($el)) as OfficialMaturityLevel;
    if (!levels.includes(slug)) return;
    const section = $el.nextUntil("h2");
    let characteristics_md = "";
    let sample_goals_md = "";
    section.filter("h3").each((_, h3) => {
      const $h3 = $(h3);
      const name = normalizeHeading(textOf($h3));
      const body = htmlToMd($, $h3.nextUntil("h2, h3"));
      if (name.startsWith("maturity level characteristics"))
        characteristics_md = body;
      else if (name.startsWith("sample goals")) sample_goals_md = body;
    });
    out.push({
      slug,
      title: textOf($el),
      characteristics_md,
      sample_goals_md,
      official: true,
      source_url: url,
      license: LICENSE,
    });
  });
  return out;
}

/** Technology categories page: ff-card blocks with h3 "FinOps for X". */
export function parseTechnologyCategories(
  html: string,
  url: string,
): TechnologyCategory[] {
  const $ = load(html);
  const out: TechnologyCategory[] = [];
  $("h3").each((_, el) => {
    const $el = $(el);
    const title = textOf($el);
    if (!/^finops for /i.test(title)) return;
    const card = $el.closest("div.ff-card");
    const body = card.length ? card.clone() : $el.parent().clone();
    body.find("h3").remove();
    body.find("a.ff-button").remove();
    out.push({
      slug: slugify(title.replace(/^finops for /i, "")),
      title,
      description_md: htmlToMd($, body),
      source_url: url,
      license: LICENSE,
    });
  });
  return out;
}

/** Scopes page: single conceptual document (critique B3) — h3 sections. */
export function parseScopes(html: string, url: string): ScopeDoc {
  const $ = load(html);
  const title = textOf($("h1").first()) || "FinOps Scopes";
  const sections: { heading: string; body_md: string }[] = [];
  // Intro: prose between h1 and the first h3.
  const h1 = $("h1").first();
  const intro = htmlToMd(
    $,
    h1.parent().nextUntil("h3").add(h1.nextUntil("h3")).filter("p, div"),
  );
  if (intro) sections.push({ heading: "Overview", body_md: intro });
  $("h3").each((_, el) => {
    const $el = $(el);
    const heading = textOf($el);
    if (!heading || !isContentHeading(heading)) return;
    const body_md = htmlToMd($, $el.nextUntil("h2, h3"));
    if (body_md) sections.push({ heading, body_md });
  });
  return { title, sections, source_url: url, license: LICENSE };
}

export interface PersonaApiRecord {
  title: string;
  url: string;
  excerpt: string;
  id: number;
}

/** Persona detail page: prose + callout blocks (Objectives/Challenges/etc.). */
export function parsePersonaPage(
  html: string,
  url: string,
  category: "core" | "allied",
): Persona {
  const $ = load(html);
  const title = textOf($("h1").first());
  const prose = $("div.f24-content").first();
  const body = prose.length ? prose : $("h1").first().parent().parent();
  const description_md = htmlToMd($, body.children());
  return {
    slug: slugify(title),
    title,
    category,
    description_md,
    source_url: url,
    license: LICENSE,
  };
}

/** Framework overview page: markdown of the main prose. */
export function parseOverview(html: string): string {
  const $ = load(html);
  const h1 = $("h1").first();
  const chunks: string[] = [];
  const heading = findHeading($, "h2", ["what is the finops framework"]);
  const scope = heading ? heading.parent().parent() : h1.parents().eq(1);
  scope.find("p").each((_, p) => {
    const t = textOf($(p));
    if (t.length > 80) chunks.push(t);
  });
  return chunks.slice(0, 6).join("\n\n");
}
