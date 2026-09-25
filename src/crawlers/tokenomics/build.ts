import { scanForInjection } from "../../shared/sanitize.js";
import { documentMarkdownPath } from "../../shared/tokenomics/artifact.js";
import type {
  TkBigT,
  TkCacheProvider,
  TkCrossLink,
  TkCrosswalkEntry,
  TkDocument,
  TkFocusTrackerItem,
  TkGlossaryTerm,
  TkLayer,
  TkLever,
  TkMetric,
  TkPersona,
  TkStage,
  TkValue,
} from "../../shared/tokenomics/types.js";
import {
  CROSSWALK,
  STATED_LINKS,
  trackerLinkTargets,
  type StatedLinkSpec,
} from "./links-data.js";
import {
  composeDocumentMd,
  deriveDocument,
  withOverview,
} from "./markdown/documents.js";
import { composeCollection, deriveCollection } from "./markdown/records.js";
import * as SPEC from "./markdown/specs.js";
import { parseDocument, type ParsedDocument } from "./parse/document.js";
import {
  extractBigT,
  extractBigTLevers,
  extractCacheGlossary,
  extractCacheMetrics,
  extractCacheProviders,
  extractDefinitionGlossary,
  extractFocusTracker,
  extractLayers,
  extractPersonas,
  extractProseMetrics,
  extractStackLevers,
  extractStages,
  extractValue,
} from "./parse/entities.js";
import { EXPECTED_COUNTS, MIN_COUNTS, REGISTRY } from "./urls.js";

// The crawl-independent core: registry HTML → canonical markdown (compose),
// markdown → JSON entities (derive), and the assess checks. `refresh` feeds
// it fetched HTML; `derive` feeds it the committed markdown only.

export interface Entities {
  documents: TkDocument[];
  stages: TkStage[];
  layers: TkLayer[];
  bigt: TkBigT;
  levers: TkLever[];
  metrics: TkMetric[];
  personas: TkPersona[];
  value: TkValue;
  glossary: TkGlossaryTerm[];
  focusTracker: TkFocusTrackerItem[];
  cacheProviders: TkCacheProvider[];
}

/** Parse every registry page and compose the full markdown layer. */
export function composeFromHtml(
  html: Map<string, string>,
  restModified: Map<string, string>,
): Map<string, string> {
  const get = (slug: string): string => {
    const h = html.get(slug);
    if (!h) throw new Error(`no HTML fetched for registry document "${slug}"`);
    return h;
  };
  const docs: ParsedDocument[] = REGISTRY.map((e) =>
    withOverview(
      parseDocument(e, get(e.slug), restModified.get(e.url) ?? null),
    ),
  );
  const layers = extractLayers(get("five-layer-stack-paper"));
  const bigt = extractBigT(get("big-t-notation"));
  const value = extractValue(get("value-classification"));
  const glossary = uniqueGlossary([
    ...extractDefinitionGlossary(get("what-is-tokenomics")),
    ...extractCacheGlossary(get("cache-explainer")),
  ]);
  const md = new Map<string, string>();
  for (const d of docs)
    md.set(documentMarkdownPath(d.meta.slug), composeDocumentMd(d));
  const put = (
    file: string,
    spec: SPEC.CollectionSpecT,
    recs: object[],
    fm = {},
  ) =>
    md.set(
      `content/markdown/${file}`,
      composeCollection(spec, recs as never, fm),
    );
  put("stages.md", SPEC.STAGES, extractStages(get("personas-operating-model")));
  put("layers.md", SPEC.LAYERS, layers);
  put(
    "bigt-variables.md",
    SPEC.BIGT_VARIABLES,
    bigt.variables.map((v) => ({ ...v, slug: v.symbol })),
  );
  put("bigt-classes.md", SPEC.BIGT_CLASSES, bigt.classes, {
    notation: bigt.notation,
    expansion: bigt.expansion,
  });
  put("levers.md", SPEC.LEVERS, [
    ...extractStackLevers(layers),
    ...extractBigTLevers(get("big-t-notation")),
  ]);
  put("metrics.md", SPEC.METRICS, [
    ...extractCacheMetrics(get("cache-explainer")),
    ...extractProseMetrics({
      definition: get("what-is-tokenomics"),
      value: get("value-classification"),
      tca: get("total-cost-of-ai"),
    }),
  ]);
  put(
    "personas.md",
    SPEC.PERSONAS,
    extractPersonas(get("personas-operating-model")),
  );
  put("value-categories.md", SPEC.VALUE_CATEGORIES, value.categories);
  put("booking-destinations.md", SPEC.BOOKING_DESTINATIONS, value.booking);
  put("glossary.md", SPEC.GLOSSARY, glossary);
  put(
    "focus-tracker.md",
    SPEC.FOCUS_TRACKER,
    extractFocusTracker(get("focus-1-5-for-ai")),
  );
  put(
    "cache-providers.md",
    SPEC.CACHE_PROVIDERS,
    extractCacheProviders(get("cache-explainer")),
  );
  return md;
}

/** Glossary terms can repeat across documents (e.g. KV cache): keep each
 * definition, disambiguating the later slug with its document. */
function uniqueGlossary(terms: TkGlossaryTerm[]): TkGlossaryTerm[] {
  const seen = new Set<string>();
  return terms.map((t) => {
    let slug = t.slug;
    if (seen.has(slug)) slug = `${slug}-${t.provenance.document}`;
    seen.add(slug);
    return { ...t, slug };
  });
}

/** Offline derive: canonical markdown → typed entities. */
export function deriveEntities(md: Map<string, string>): Entities {
  const need = (rel: string) => {
    const t = md.get(rel);
    if (t === undefined) throw new Error(`missing markdown file ${rel}`);
    return t;
  };
  const coll = <T>(file: string, spec: SPEC.CollectionSpecT) =>
    deriveCollection(spec, need(`content/markdown/${file}`)).records as T[];
  const documents = REGISTRY.map((e) =>
    deriveDocument(need(documentMarkdownPath(e.slug))),
  );
  const classes = deriveCollection(
    SPEC.BIGT_CLASSES,
    need("content/markdown/bigt-classes.md"),
  );
  const variables = coll<TkBigT["variables"][number] & { slug?: string }>(
    "bigt-variables.md",
    SPEC.BIGT_VARIABLES,
  ).map((v) => ({
    symbol: v.symbol,
    name: v.name,
    description: v.description,
    provenance: v.provenance,
  }));
  return {
    documents,
    stages: coll("stages.md", SPEC.STAGES),
    layers: coll("layers.md", SPEC.LAYERS),
    bigt: {
      notation: String(classes.frontmatter.notation),
      expansion: String(classes.frontmatter.expansion),
      variables,
      classes: classes.records as unknown as TkBigT["classes"],
    },
    levers: coll("levers.md", SPEC.LEVERS),
    metrics: coll("metrics.md", SPEC.METRICS),
    personas: coll("personas.md", SPEC.PERSONAS),
    value: {
      categories: coll("value-categories.md", SPEC.VALUE_CATEGORIES),
      booking_destinations: coll(
        "booking-destinations.md",
        SPEC.BOOKING_DESTINATIONS,
      ),
    },
    glossary: coll("glossary.md", SPEC.GLOSSARY),
    focusTracker: coll("focus-tracker.md", SPEC.FOCUS_TRACKER),
    cacheProviders: coll("cache-providers.md", SPEC.CACHE_PROVIDERS),
  };
}

/** Markdown markup + whitespace normalization for evidence matching. */
export function normalizeForEvidence(text: string): string {
  return text
    .replace(/\*\*|`|\*/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function paragraphOf(body: string, evidence: string): string | null {
  const needle = normalizeForEvidence(evidence);
  for (const p of body.split(/\n\s*\n/)) {
    if (normalizeForEvidence(p).includes(needle))
      return normalizeForEvidence(p);
  }
  return normalizeForEvidence(body).includes(needle)
    ? normalizeForEvidence(body)
    : null;
}

function firstSentenceWith(body: string, id: string): string | null {
  const flat = normalizeForEvidence(body);
  const sentences = flat.split(/(?<=[.!?])\s+/);
  const s = sentences.find((x) => new RegExp(`\\b${id}\\b`).test(x));
  return s ?? null;
}

/**
 * Stated cross-links: hand-registered ones plus one per FOCUS identifier on
 * the tracker page. Throws when evidence is missing from the document, or a
 * FOCUS target's identifier is not in the evidence's paragraph.
 */
export function buildCrossLinks(
  e: Entities,
  bodies: Map<string, string>,
  focusColumnIds: Set<string>,
  focusAttributes: Map<string, string> = new Map(),
): TkCrossLink[] {
  const urlOf = new Map(e.documents.map((d) => [d.slug, d.url]));
  const out: TkCrossLink[] = [];
  const check = (spec: StatedLinkSpec) => {
    const body = bodies.get(spec.document);
    if (!body)
      throw new Error(`cross-link cites unknown document ${spec.document}`);
    const para = paragraphOf(body, spec.evidence);
    if (!para) {
      throw new Error(
        `cross-link evidence not found in ${spec.document}: "${spec.evidence}"`,
      );
    }
    for (const t of spec.targets) {
      if (t.server === "framework") {
        const mention = spec.mentions?.[t.id];
        if (
          !mention ||
          !normalizeForEvidence(spec.evidence)
            .toLowerCase()
            .includes(mention.toLowerCase())
        ) {
          throw new Error(
            `cross-link target ${t.id} is not named by its evidence in ${spec.document}`,
          );
        }
      } else if (!new RegExp(`\\b${t.id}\\b`).test(para)) {
        throw new Error(
          `cross-link target ${t.id} is not named near its evidence in ${spec.document}`,
        );
      }
      out.push({
        from: spec.from,
        target: t,
        evidence: normalizeForEvidence(spec.evidence),
        document: spec.document,
        source_url: urlOf.get(spec.document) as string,
        official: true,
      });
    }
  };
  for (const spec of STATED_LINKS) check(spec);
  for (const item of e.focusTracker) {
    for (const { id, target } of trackerLinkTargets(
      item,
      focusColumnIds,
      focusAttributes,
    )) {
      const sentence = firstSentenceWith(item.body_md, id);
      if (!sentence) continue; // identifier only in a heading/label: no sentence to cite
      check({
        from: { type: "focus-item", slug: item.slug },
        document: "focus-1-5-for-ai",
        evidence: sentence,
        targets: [target],
      });
    }
  }
  return out;
}

export function buildCrosswalk(): TkCrosswalkEntry[] {
  return CROSSWALK.map((c) => ({ ...c, official: false as const }));
}

export function countsOf(e: Entities): Record<string, number> {
  return {
    documents: e.documents.length,
    stages: e.stages.length,
    layers: e.layers.length,
    bigt_classes: e.bigt.classes.length,
    bigt_variables: e.bigt.variables.length,
    levers: e.levers.length,
    metrics: e.metrics.length,
    personas: e.personas.length,
    value_categories: e.value.categories.length,
    booking_destinations: e.value.booking_destinations.length,
    glossary: e.glossary.length,
    focus_tracker: e.focusTracker.length,
    cache_providers: e.cacheProviders.length,
  };
}

export interface Assessment {
  errors: string[];
  warnings: string[];
  counts: Record<string, number>;
}

/** "system prompt" is core vocabulary in AI tokenomics (prompt caching,
 * gateway routing); the other injection heuristics stay armed. */
export const INJECTION_ALLOW = ["system-prompt"] as const;

/** Pinned counts, provenance-section existence, and the injection scan. */
export function assess(e: Entities, md: Map<string, string>): Assessment {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = countsOf(e);
  for (const [k, n] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[k] !== n)
      errors.push(`count ${k}: expected ${n}, got ${counts[k]}`);
  }
  for (const [k, n] of Object.entries(MIN_COUNTS)) {
    if ((counts[k] ?? 0) < n)
      errors.push(`count ${k}: expected ≥${n}, got ${counts[k]}`);
  }
  const sections = new Map(
    e.documents.map((d) => [d.slug, new Set(d.sections.map((s) => s.id))]),
  );
  const provs = [
    ...e.stages,
    ...e.layers,
    ...e.bigt.classes,
    ...e.bigt.variables.map((v) => ({ ...v, slug: v.symbol })),
    ...e.levers,
    ...e.metrics,
    ...e.personas,
    ...e.value.categories,
    ...e.value.booking_destinations,
    ...e.glossary,
    ...e.focusTracker,
    ...e.cacheProviders,
  ];
  for (const r of provs) {
    const p = r.provenance;
    if (p.section !== null && !sections.get(p.document)?.has(p.section)) {
      errors.push(
        `${r.slug}: provenance section ${p.document}#${p.section} does not exist`,
      );
    }
  }
  for (const d of e.documents) {
    if (d.status_source === "registry") {
      warnings.push(
        `${d.slug}: no status label on page; using registry label "${d.status}"`,
      );
    }
  }
  for (const [rel, text] of md) {
    for (const hit of scanForInjection(rel, text, INJECTION_ALLOW)) {
      errors.push(
        `injection heuristic "${hit.pattern}" in ${rel}: …${hit.excerpt}…`,
      );
    }
  }
  return { errors, warnings, counts };
}
