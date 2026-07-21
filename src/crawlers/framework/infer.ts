import type {
  Action,
  Capability,
  CapabilityRelationship,
  Kpi,
} from "../../shared/index.js";
import type { ParsedCapabilityPage } from "./parse/capability.js";

// Relationship extraction. Restrained per critique M14:
//  - official edges only from on-page evidence, each with evidence_url;
//  - inferred edges limited to related/informs with a QUOTED evidence
//    sentence, a named heuristic, and enum confidence;
//  - prerequisite edges only when the quoted text uses dependency language.

const PREREQ_RE =
  /\b(requires?|depends? (on|upon)|prerequisite|must (first|already) (have|be)|builds? (on|upon))\b/i;

function key(r: CapabilityRelationship): string {
  return `${r.type}:${r.from}->${r.to}:${r.heuristic ?? "official"}`;
}

export function officialRelationships(
  pages: ParsedCapabilityPage[],
  kpis: Kpi[],
  pageUrl: (slug: string) => string,
): CapabilityRelationship[] {
  const out = new Map<string, CapabilityRelationship>();
  const add = (r: CapabilityRelationship) => {
    if (r.from !== r.to && !out.has(key(r))) out.set(key(r), r);
  };

  for (const p of pages) {
    for (const to of p.definition_capability_links) {
      add({
        from: p.slug,
        to,
        type: "related",
        source: "official",
        evidence_url: pageUrl(p.slug),
        rationale: `The ${p.slug} Definition links to ${to}.`,
      });
    }
    for (const to of p.inputs_outputs_capability_links) {
      add({
        from: p.slug,
        to,
        type: "related",
        source: "official",
        evidence_url: pageUrl(p.slug),
        rationale: `The ${p.slug} Inputs & Outputs section links to ${to}.`,
      });
    }
  }

  // Shared-KPI co-links: capabilities the Foundation itself relates to the
  // same KPI (modal "Related Capabilities" + featured placement).
  for (const kpi of kpis) {
    const caps = [
      ...new Set([...kpi.related_capability_slugs, ...kpi.featured_on]),
    ].sort();
    for (let i = 0; i < caps.length; i++) {
      for (let j = i + 1; j < caps.length; j++) {
        add({
          from: caps[i] as string,
          to: caps[j] as string,
          type: "related",
          source: "official",
          evidence_url: kpi.source_url,
          rationale: `Both are officially linked to the KPI "${kpi.title}".`,
        });
      }
    }
  }
  return [...out.values()];
}

interface TitleMatcher {
  slug: string;
  res: RegExp[];
}

function titleMatchers(capabilities: Capability[]): TitleMatcher[] {
  return capabilities.map((c) => {
    const escaped = c.title
      .replace(/&/g, "(?:&|and)")
      .replace(/[.*+?^${}()[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    // Single-word titles (Allocation, Forecasting, …) double as common
    // nouns; require exact title-case so lowercase prose usage never
    // creates an edge (critique-2 M5': false positives).
    const singleWord = !/\s/.test(c.title);
    return {
      slug: c.slug,
      res: [new RegExp(`\\b${escaped}\\b`, singleWord ? "" : "i")],
    };
  });
}

/** True when the match sits inside a parenthetical list of 2+ commas —
 *  the "(Product, Leadership, …, Sustainability)" persona-list pattern. */
function insideParentheticalList(text: string, index: number): boolean {
  const open = text.lastIndexOf("(", index);
  if (open < 0) return false;
  const close = text.indexOf(")", index);
  if (close < 0) return false;
  const inner = text.slice(open + 1, close);
  return (inner.match(/,/g) ?? []).length >= 2;
}

export function inferredRelationships(
  capabilities: Capability[],
  actions: Action[],
): CapabilityRelationship[] {
  const out = new Map<string, CapabilityRelationship>();
  const matchers = titleMatchers(capabilities);

  const texts: { slug: string; text: string; where: string }[] = [];
  for (const a of actions) {
    texts.push({
      slug: a.capability_slug,
      text: a.text,
      where: `${a.maturity} assessment`,
    });
  }
  for (const c of capabilities) {
    for (const b of c.kpi_bullets) {
      texts.push({ slug: c.slug, text: b, where: "KPI bullets" });
    }
  }

  for (const { slug, text, where } of texts) {
    for (const m of matchers) {
      if (m.slug === slug) continue;
      const match = m.res.map((re) => re.exec(text)).find((x) => x !== null);
      if (!match) continue;
      if (insideParentheticalList(text, match.index)) continue;
      const quote = text.length > 240 ? `${text.slice(0, 237)}…` : text;
      const prereq = PREREQ_RE.test(text);
      // Bare mentions carry no reliable direction — emit an undirected
      // `related` edge (canonical from<to). Direction is asserted only for
      // prerequisite edges backed by explicit dependency language
      // (critique-2 M5': inverted informs edges).
      const [a, b] = [m.slug, slug].sort();
      const r: CapabilityRelationship = {
        from: prereq ? m.slug : (a as string),
        to: prereq ? slug : (b as string),
        type: prereq ? "prerequisite" : "related",
        source: "inferred",
        heuristic: prereq
          ? "title-mention-dependency-language"
          : "title-mention",
        evidence_quote: quote,
        confidence: prereq ? "moderate" : "weak",
        rationale: prereq
          ? `The ${slug} ${where} text names ${m.slug} explicitly with dependency language.`
          : `The ${slug} ${where} text names ${m.slug} explicitly (no direction implied).`,
      };
      const k = `${r.type}:${r.from}->${r.to}`;
      const existing = out.get(k);
      // Keep the strongest single edge per (type, from, to).
      if (
        !existing ||
        (existing.confidence === "weak" && r.confidence !== "weak")
      ) {
        out.set(k, r);
      }
    }
  }

  const edges = [...out.values()];
  assertAcyclicPrerequisites(edges);
  return edges;
}

/** Cycle check on prerequisite edges — fail the crawl rather than emit nonsense. */
export function assertAcyclicPrerequisites(
  edges: CapabilityRelationship[],
): void {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== "prerequisite") continue;
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
  }
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (n: string): void => {
    state.set(n, 1);
    stack.push(n);
    for (const next of adj.get(n) ?? []) {
      if (state.get(next) === 1) {
        throw new Error(
          `inferred prerequisite cycle: ${[...stack, next].join(" -> ")}`,
        );
      }
      if (!state.has(next)) visit(next);
    }
    stack.pop();
    state.set(n, 2);
  };
  for (const n of adj.keys()) if (!state.has(n)) visit(n);
}
