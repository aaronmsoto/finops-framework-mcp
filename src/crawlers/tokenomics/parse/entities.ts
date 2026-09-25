import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { slugify } from "../../../shared/slugs.js";
import type {
  TkBigT,
  TkBookingDestination,
  TkCacheProvider,
  TkFocusBucket,
  TkFocusTrackerItem,
  TkGlossaryTerm,
  TkLayer,
  TkLever,
  TkMetric,
  TkPersona,
  TkProvenance,
  TkStage,
  TkValueCategory,
} from "../../../shared/tokenomics/types.js";
import { ORIGIN, REGISTRY } from "../urls.js";
import {
  flatText,
  formulaLines,
  renderSections,
  spacedText,
} from "./render.js";

// Entity extractors, one per structured block on a registry page. Each
// reads the rendered HTML (cheerio) because several signals live only in
// markup (data-status, data-stage, stacked-fraction formulas). Every
// extractor records the document + section it read from; the section ids
// are the ones renderSections assigns, re-checked at assess time.

export class ExtractError extends Error {}

function urlOf(doc: string): string {
  const e = REGISTRY.find((r) => r.slug === doc);
  if (!e) throw new ExtractError(`unknown registry document "${doc}"`);
  return e.url;
}

export function prov(doc: string, section: string | null): TkProvenance {
  return {
    document: doc,
    section,
    source_url: urlOf(doc),
    license: "CC-BY-4.0",
  };
}

function need<T>(value: T | null | undefined | "", what: string): T {
  if (value === null || value === undefined || value === "") {
    throw new ExtractError(`could not extract ${what}`);
  }
  return value;
}

/** Inline markdown of an element's children (code/strong/em kept). */
function inlineMd($: CheerioAPI, el: Cheerio<AnyNode>): string {
  const wrap = $("<div></div>").append(el.clone());
  const { preamble } = renderSections($, wrap, { origin: ORIGIN });
  return preamble.replace(/\s*\n\s*/g, " ").trim();
}

/** Block markdown of a set of elements (paragraphs, lists, tables kept). */
function blockMd($: CheerioAPI, els: Cheerio<AnyNode>): string {
  const wrap = $("<div></div>");
  els.each((_, e) => {
    wrap.append($(e).clone());
  });
  return renderSections($, wrap, { origin: ORIGIN }).preamble;
}

function tableRows(
  $: CheerioAPI,
  table: Cheerio<AnyNode>,
): { header: string[]; rows: Cheerio<AnyNode>[][] } {
  const header: string[] = [];
  table.find("thead th, tr:first-child th").each((_, th) => {
    header.push(flatText($(th)));
  });
  const rows: Cheerio<AnyNode>[][] = [];
  table.find("tbody tr").each((_, tr) => {
    const cells: Cheerio<AnyNode>[] = [];
    $(tr)
      .children("td, th")
      .each((__, c) => {
        cells.push($(c));
      });
    if (cells.length) rows.push(cells);
  });
  return { header, rows };
}

function tableWithHeader(
  $: CheerioAPI,
  scope: Cheerio<AnyNode>,
  first: RegExp,
) {
  let found: Cheerio<AnyNode> | null = null;
  scope.find("table").each((_, t) => {
    if (found) return;
    const th = flatText($(t).find("th").first());
    if (first.test(th)) found = $(t);
  });
  return need<Cheerio<AnyNode>>(
    found,
    `table whose first header matches ${first}`,
  );
}

// ---------------------------------------------------------------------------
// personas-operating-model: stages + personas

export function extractStages(html: string): TkStage[] {
  const $ = load(html);
  const table = tableWithHeader($, $("#wp-stages"), /^Stage$/);
  return tableRows($, table).rows.map((cells) => {
    const name = flatText(need(cells[0], "stage name cell"));
    return {
      slug: slugify(name),
      name,
      scope: flatText(need(cells[1], "stage scope")),
      key_question: flatText(need(cells[2], "stage key question")),
      provenance: prov("personas-operating-model", "wp-stages"),
    };
  });
}

export function extractPersonas(html: string): TkPersona[] {
  const $ = load(html);
  const table = tableWithHeader($, $("#wp-personas"), /^Persona$/);
  const summary = new Map<
    string,
    { stages: string[]; responsibility: string }
  >();
  for (const cells of tableRows($, table).rows) {
    const name = flatText(need(cells[0], "persona name"));
    const stages: string[] = [];
    need(cells[1], "persona stages")
      .find("[data-stage]")
      .each((_, s) => {
        stages.push(String($(s).attr("data-stage")));
      });
    summary.set(name, {
      stages,
      responsibility: flatText(need(cells[2], "persona responsibility")),
    });
  }
  const personas: TkPersona[] = [];
  $("#wp-personas h3.wp-h3").each((_, h) => {
    const $h = $(h);
    const name = flatText($h);
    const s = summary.get(name);
    if (!s) return; // "Why this set and not…" and other non-persona h3s
    const card = $h.parent().parent();
    const lede = flatText(card.find(".wp-persona__lede").first());
    const signals: string[] = [];
    card.find(".wp-signal").each((__, sig) => {
      signals.push(flatText($(sig)));
    });
    const detail = card.find(".wp-collapse, .wp-panel").clone();
    detail.find(".wp-signals").remove();
    const body = blockMd($, detail);
    personas.push({
      slug: slugify(name),
      name,
      core: true,
      stages: s.stages,
      responsibility: s.responsibility,
      description_md: [lede, body].filter(Boolean).join("\n\n"),
      signals,
      provenance: prov("personas-operating-model", "wp-personas"),
    });
  });
  $("#wp-allied .wp-allied-card").each((_, c) => {
    const $c = $(c);
    const name = flatText($c.find("b").first());
    personas.push({
      slug: slugify(name),
      name,
      core: false,
      stages: [],
      responsibility: "Allied persona",
      description_md: blockMd($, $c.find("p")),
      signals: [],
      provenance: prov("personas-operating-model", "wp-allied"),
    });
  });
  return personas;
}

// ---------------------------------------------------------------------------
// five-layer-stack-paper: layers + stack levers

export function extractLayers(html: string): TkLayer[] {
  const $ = load(html);
  const summary = tableWithHeader($, $("main"), /^Layer$/);
  const components = new Map<number, { name: string; items: string[] }[]>();
  $(".f2row").each((_, row) => {
    const num = Number(flatText($(row).find(".f2tag .num")).replace(/\D/g, ""));
    const list: { name: string; items: string[] }[] = [];
    $(row)
      .find(".f2c")
      .each((__, c) => {
        const items: string[] = [];
        $(c)
          .find("li")
          .each((___, li) => {
            items.push(flatText($(li)));
          });
        list.push({ name: flatText($(c).find("h4").first()), items });
      });
    components.set(num, list);
  });
  return tableRows($, summary).rows.map((cells) => {
    const label = flatText(need(cells[0], "layer label"));
    const m = need(/^L(\d)\s+(.+)$/.exec(label), `layer label "${label}"`);
    const number = Number(m[1]);
    const h2 = $(`h2#l${number}`);
    const title = spacedText($, h2).replace(/^L\d\s*/, "");
    const read = h2.closest(".read");
    const prose = read.find("p");
    const tableWrap = read.nextAll(".tablewrap").first();
    const effect = flatText(need(cells[1], "multiplier effect"));
    return {
      slug: `l${number}`,
      number,
      name: need(title, `L${number} heading`),
      table_label: label,
      multiplier_effect: effect,
      moves_multiplier: /^yes\b/i.test(effect),
      key_metric: flatText(need(cells[2], "key metric")),
      primary_levers: flatText(need(cells[3], "primary lever"))
        .split(/;\s*/)
        .map((x) => x.trim())
        .filter(Boolean),
      description_md: need(blockMd($, prose), `L${number} prose`),
      components: components.get(number) ?? [],
      tooling_md: tableWrap.length ? blockMd($, tableWrap.find("table")) : null,
      provenance: prov("five-layer-stack-paper", `l${number}`),
    };
  });
}

/** Big-T class slugs the paper's "Moves the multiplier?" cell names. */
function classesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/T\(([^)]+)\)/g)) {
    out.push(bigtSlug(`T(${m[1]})`));
  }
  return [...new Set(out)];
}

export function bigtSlug(notation: string): string {
  const inner = notation
    .replace(/^T\(/, "")
    .replace(/\)$/, "")
    .replace(/∞/g, "infinity")
    .replace(/[·*]/g, "-");
  return `t-${slugify(inner)}`;
}

export function extractStackLevers(layers: TkLayer[]): TkLever[] {
  const levers: TkLever[] = [];
  for (const l of layers) {
    for (const name of l.primary_levers) {
      levers.push({
        slug: slugify(`l${l.number}-${name}`),
        name: name[0]?.toUpperCase() + name.slice(1),
        kind: "stack-primary-lever",
        layer: l.number,
        bigt_classes: classesIn(l.multiplier_effect),
        description_md: `Primary lever for ${l.table_label} (key metric: ${l.key_metric}). ${l.multiplier_effect}.`,
        effect: null,
        provenance: prov("five-layer-stack-paper", "spectrum"),
      });
    }
  }
  return levers;
}

// ---------------------------------------------------------------------------
// big-t-notation (explainer): notation, variables, ladder, levers

export function extractBigT(html: string): TkBigT {
  const $ = load(html);
  const heroText = flatText($("main"));
  const nm = need(
    /(T\(n · k · a\))\s*(requests × [^.]*?agent depth)/.exec(heroText),
    "Big-T notation + expansion",
  );
  const variables: TkBigT["variables"] = [];
  $(".te-symbol").each((_, s) => {
    const card = $(s).closest(".te-section__card");
    variables.push({
      symbol: flatText($(s)),
      name: flatText(card.find("h3").first()),
      description: flatText(card.find("p").first()),
      provenance: prov("big-t-notation", "notation"),
    });
  });
  const classes: TkBigT["classes"] = [];
  $("#ladder")
    .nextAll()
    .addBack()
    .find(".te-section__card")
    .each((_, c) => {
      const $c = $(c);
      const notation = flatText($c.find("span.font-bold").first());
      if (!/^T\(/.test(notation)) return;
      const name = flatText($c.find("small").first());
      const paras = $c.find("p");
      const first = paras.first();
      const headline = flatText(first.find("strong").first());
      const description = flatText(first);
      const fix = flatText(paras.eq(1)).replace(/^Fix:\s*/, "");
      if (classes.some((x) => x.notation === notation)) return;
      classes.push({
        slug: bigtSlug(notation),
        order: classes.length + 1,
        notation,
        name,
        headline,
        description,
        fix: need(fix, `${notation} fix`),
        provenance: prov("big-t-notation", "ladder"),
      });
    });
  return {
    notation: nm[1] as string,
    expansion: nm[2] as string,
    variables,
    classes,
  };
}

export function extractBigTLevers(html: string): TkLever[] {
  const $ = load(html);
  const levers: TkLever[] = [];
  // "The five levers": h3 "N. Name" followed by a paragraph.
  $("#howto")
    .nextAll()
    .addBack()
    .find("h3")
    .each((_, h) => {
      const t = flatText($(h));
      const m = /^(\d)\.\s+(.+)$/.exec(t);
      if (!m) return;
      const body = flatText($(h).nextAll("p").first());
      levers.push({
        slug: slugify(`bigt-${m[2]}`),
        name: m[2] as string,
        kind: "bigt-lever",
        layer: null,
        bigt_classes: [],
        description_md: body,
        effect: null,
        provenance: prov("big-t-notation", "howto"),
      });
    });
  // Architectural approaches table (token reduction + class).
  const table = tableWithHeader($, $("main"), /^Approach$/);
  for (const cells of tableRows($, table).rows) {
    const name = flatText(need(cells[0], "approach name"));
    const cls = flatText(need(cells[3], "approach class"));
    levers.push({
      slug: slugify(`approach-${name.replace(/\(.*\)/, "")}`),
      name,
      kind: "architectural-approach",
      layer: null,
      bigt_classes: classesIn(cls),
      description_md: flatText(need(cells[1], "approach how")),
      effect: `Token reduction: ${flatText(need(cells[2], "approach reduction"))}`,
      provenance: prov("big-t-notation", "concepts"),
    });
  }
  // "The three levers in the example" cards (eyebrow + h3 + p).
  $("h3")
    .filter((_, h) => /three levers in the example/i.test(flatText($(h))))
    .first()
    .closest("section")
    .find(".te-section__card")
    .each((_, c) => {
      const $c = $(c);
      const name = flatText($c.find("h3").first());
      levers.push({
        slug: slugify(`example-${name}`),
        name,
        kind: "worked-example-step",
        layer: null,
        bigt_classes: [],
        description_md: `${flatText($c.find(".te-section__eyebrow").first())}: ${flatText($c.find("p").last())}`,
        effect:
          "Part of the worked example that moves ten summaries from $3.04 (T(n·k)) to $0.09 (T(n)), roughly 34×",
        provenance: prov("big-t-notation", "savings"),
      });
    });
  return levers;
}

// ---------------------------------------------------------------------------
// cache-explainer: metrics, cache providers, cache glossary

export function extractCacheMetrics(html: string): TkMetric[] {
  const $ = load(html);
  const mon = $("#tcMonitoring");
  const targets = new Map<string, string[]>();
  mon.find(".te-section__card").each((_, c) => {
    const eyebrow = flatText($(c).find(".tc-rule-num").first());
    if (!/what good looks like/i.test(eyebrow)) return;
    const h = flatText($(c).find("h3").first());
    const [metric, target] = h.split(/:\s*/, 2);
    const key = slugify(metric ?? "");
    const list = targets.get(key) ?? [];
    list.push(
      `${target ?? h}. ${flatText($(c).find("p").not(".tc-rule-num").first())}`,
    );
    targets.set(key, list);
  });
  const buckets = ["cache read", "cache write", "uncached input"];
  const out: TkMetric[] = [];
  mon.find(".te-section__card").each((_, c) => {
    const $c = $(c);
    const formula = $c.find(".tc-formula").first();
    if (!formula.length) return;
    const name = flatText($c.find("h3").first());
    const lines = formulaLines($, formula);
    const slug = slugify(name);
    const defn = blockMd($, $c.children("p").not(".tc-rule-num"));
    out.push({
      slug,
      name: name[0]?.toUpperCase() + name.slice(1),
      formula: need(lines[0], `${name} formula`),
      formula_text: null,
      definition_md: defn,
      targets: targets.get(slug) ?? [],
      inputs:
        slug === "cache-hit-rate"
          ? buckets
          : ["actual prompt cost", "uncached equivalent cost"],
      provenance: prov("cache-explainer", "tcmonitoring"),
    });
    for (const where of lines.slice(1)) {
      const m = /^([a-z ]+?)\s*=\s*(.+)$/i.exec(where);
      if (!m) continue;
      const wname = (m[1] as string).trim();
      out.push({
        slug: slugify(wname),
        name: wname[0]?.toUpperCase() + wname.slice(1),
        formula: where,
        formula_text: null,
        definition_md: `Denominator of ${name}: what the same prompt tokens would have cost with no caching at all.`,
        targets: [],
        inputs: [...buckets, "base input price"],
        provenance: prov("cache-explainer", "tcmonitoring"),
      });
    }
  });
  return out;
}

export function extractCacheProviders(html: string): TkCacheProvider[] {
  const $ = load(html);
  const table = tableWithHeader($, $("#tcProviderSnapshot"), /^Provider/);
  const { header, rows } = tableRows($, table);
  const reviewed =
    /reviewed ([A-Z][a-z]{2,8} \d{4})/.exec(header[0] ?? "")?.[1] ?? "unknown";
  return rows.map((cells) => {
    const provider = flatText(need(cells[0], "provider"));
    const label = flatText(
      need(cells[0]?.find("strong").first(), "provider name"),
    );
    return {
      slug: slugify(label),
      provider,
      write_charge: inlineMd($, need(cells[1], "write charge").contents()),
      read_charge: inlineMd($, need(cells[2], "read charge").contents()),
      minimum_prefix: inlineMd($, need(cells[3], "minimum prefix").contents()),
      lifetime_notes: inlineMd($, need(cells[4], "lifetime").contents()),
      reviewed: `Provider documentation reviewed ${reviewed}`,
      provenance: prov("cache-explainer", "tcprovidersnapshot"),
    };
  });
}

export function extractCacheGlossary(html: string): TkGlossaryTerm[] {
  const $ = load(html);
  const out: TkGlossaryTerm[] = [];
  $("#tcTheOneThing h3").each((_, h) => {
    const term = flatText($(h));
    const def = flatText($(h).nextAll("p").first());
    if (!/cache$/i.test(term) || !def) return;
    out.push({
      slug: slugify(term),
      term,
      definition: def,
      provenance: prov("cache-explainer", "tctheonething"),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// what-is-tokenomics: glossary + cost per token

export function extractDefinitionGlossary(html: string): TkGlossaryTerm[] {
  const $ = load(html);
  const out: TkGlossaryTerm[] = [];
  const h2 = $("h2").filter((_, h) =>
    /terminology reference/i.test(flatText($(h))),
  );
  h2.nextUntil("h2", "p").each((_, p) => {
    const strong = $(p).children("strong").first();
    const t = flatText(strong);
    if (!t.endsWith(":")) return;
    const term = t.slice(0, -1).trim();
    const definition = flatText($(p)).slice(t.length).trim();
    out.push({
      slug: slugify(term),
      term,
      definition,
      provenance: prov("what-is-tokenomics", "terminology-reference"),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Prose-stated metrics: each is located by a pinned phrase and quoted
// verbatim; a missing phrase is an extraction failure, never a guess.

export function extractProseMetrics(pages: {
  definition: string;
  value: string;
  tca: string;
}): TkMetric[] {
  const out: TkMetric[] = [];
  {
    const $ = load(pages.definition);
    const p = $("p").filter((_, x) => /^Cost per token:/.test(flatText($(x))));
    const text = flatText(
      need(p.first().length ? p.first() : null, "cost per token term"),
    );
    const m = need(
      /(hardware cost divided by tokens produced)/.exec(text),
      "cost per token formula",
    );
    out.push({
      slug: "cost-per-token",
      name: "Cost per token",
      formula: null,
      formula_text: m[1] as string,
      definition_md: text.replace(/^Cost per token:\s*/, ""),
      targets: [],
      inputs: ["hardware cost", "tokens produced"],
      provenance: prov("what-is-tokenomics", "terminology-reference"),
    });
  }
  {
    const $ = load(pages.value);
    const net = flatText(
      need(
        $(".vf-net").first().length ? $(".vf-net").first() : null,
        "net formula",
      ),
    );
    const part = $(".vf-net").first().closest(".vf-part");
    out.push({
      slug: "net-benefit",
      name: "Net benefit",
      formula: net,
      formula_text: null,
      definition_md: blockMd($, part.find("p.vf-prose")),
      targets: [],
      inputs: [
        "gross delta",
        "volume",
        "outputs that missed the floor",
        "cost created",
        "harm from misses",
      ],
      provenance: prov("value-classification", "vfstep4"),
    });
    const risk = $(".vf-cat").filter((_, c) =>
      /^Risk reduction$/.test(flatText($(c).find("h4").first())),
    );
    const est = flatText(risk.find(".est").first()).replace(
      /^Estimate as:\s*/,
      "",
    );
    out.push({
      slug: "risk-expected-loss",
      name: "Risk reduction expected loss",
      formula: null,
      formula_text: need(est, "risk estimate"),
      definition_md: flatText(risk.find("p").first()),
      targets: [],
      inputs: ["incidents per period", "cost per incident"],
      provenance: prov("value-classification", "vfstep3"),
    });
  }
  {
    const $ = load(pages.tca);
    const text = flatText($("main"));
    const m = need(
      /(TCA is the numerator of AI unit economics\.[^.]*?denominator is realized value\.)/.exec(
        text,
      ),
      "TCA unit economics statement",
    );
    out.push({
      slug: "ai-unit-economics",
      name: "AI unit economics (TCA over realized value)",
      formula: null,
      formula_text: "TCA over value",
      definition_md: `${m[1]} (Total Cost of AI is a proposal on this page, not a ratified standard.)`,
      targets: [],
      inputs: ["total cost of AI (TCA)", "realized value"],
      provenance: prov("total-cost-of-ai", "episode-highlights"),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// value-classification: outcome categories + booking destinations

export function extractValue(html: string): {
  categories: TkValueCategory[];
  booking: TkBookingDestination[];
} {
  const $ = load(html);
  const categories: TkValueCategory[] = [];
  $("#vfStep3 .vf-cat").each((_, c) => {
    const $c = $(c);
    const name = flatText($c.find("h4").first());
    const group = flatText(
      $c
        .closest(".vf-cats")
        .prevAll(".vf-grouplab")
        .first()
        .find("span")
        .first(),
    );
    const est = flatText($c.find(".est").first()).replace(
      /^Estimate as:\s*/,
      "",
    );
    categories.push({
      slug: slugify(name),
      name,
      group: need(group, `${name} group`),
      description: flatText($c.find("p").first()),
      estimate_as: est || null,
      provenance: prov("value-classification", "vfstep3"),
    });
  });
  const booking: TkBookingDestination[] = [];
  $(".vf-dest").each((_, d) => {
    const $d = $(d);
    const name = flatText($d.find("h4").first());
    booking.push({
      slug: slugify(name),
      name,
      description: flatText($d.find("p").first()),
      provenance: prov("value-classification", "vfstep4"),
    });
  });
  return { categories, booking };
}

// ---------------------------------------------------------------------------
// focus-1-5-for-ai: tracker cards

export function extractFocusTracker(html: string): TkFocusTrackerItem[] {
  const $ = load(html);
  const bucketSection: Record<string, string> = {
    done: "in-the-working-draft",
    flight: "in-review",
    consider: "started-not-yet-certain",
    out: "not-in-1-5",
  };
  const out: TkFocusTrackerItem[] = [];
  const seen = new Set<string>();
  $("details.card[data-status]").each((_, c) => {
    const $c = $(c);
    const bucket = String($c.attr("data-status")) as TkFocusBucket;
    if (!(bucket in bucketSection)) return;
    const title = flatText($c.find(".card-title").first());
    const labels: string[] = [];
    $c.find(".tags .pill").each((__, p) => {
      labels.push(flatText($(p)));
    });
    const body = $c.find(".card-body").first().clone();
    body.find(".links").remove();
    const identifiers = new Set<string>();
    body.find("code").each((__, code) => {
      const t = flatText($(code));
      if (/^[A-Z][A-Za-z0-9]+$/.test(t)) identifiers.add(t);
    });
    const links: string[] = [];
    $c.find(".links a").each((__, a) => {
      const href = $(a).attr("href");
      if (href) links.push(href);
    });
    const ref = labels.find((l) => /^(FR|PR)\s*\d+/.test(l));
    let slug = slugify(ref ?? title.split(/\s+/).slice(0, 6).join(" "));
    if (seen.has(slug))
      slug = slugify(`${slug}-${title.split(/\s+/).slice(0, 4).join(" ")}`);
    seen.add(slug);
    out.push({
      slug,
      title,
      bucket,
      kind: $c.attr("data-kind") ?? "unspecified",
      labels,
      identifiers: [...identifiers].sort(),
      body_md: blockMd($, body.children()),
      links,
      provenance: prov("focus-1-5-for-ai", bucketSection[bucket] as string),
    });
  });
  return out;
}
