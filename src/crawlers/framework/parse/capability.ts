import {
  LICENSE,
  OFFICIAL_MATURITY_LEVELS,
  type Action,
  type ActivityPersona,
  type Capability,
  type FunctionalActivity,
  type HeadlineGroup,
  type OfficialMaturityLevel,
} from "../../../shared/index.js";
import { slugify, slugFromUrl } from "../../../shared/index.js";
import { htmlToMd, normalizeHeading, parseList, textOf } from "../md.js";
import {
  findHeading,
  findHeadings,
  h4Blocks,
  load,
  sectionContent,
  slugFromHref,
} from "./helpers.js";

export interface FeaturedKpiDetail {
  wp_id: number;
  title: string;
  description_md: string;
  formula?: string;
  data_sources: string[];
  related_capability_slugs: string[];
}

export interface ParsedCapabilityPage {
  slug: string;
  title: string;
  domain_title: string | null;
  summary: string;
  definition_md: string;
  headline_groups: HeadlineGroup[];
  maturity_raw: Record<OfficialMaturityLevel, string>;
  actions: Action[];
  functional_activities: FunctionalActivity[];
  kpi_bullets: string[];
  example_kpis: { objective: string; kpi: string }[];
  inputs_outputs_md: string;
  featured_kpis: FeaturedKpiDetail[];
  warnings: string[];
}

const CORE_PERSONA_TITLES: Record<string, string> = {
  "finops practitioner": "finops-practitioner",
  engineering: "engineering",
  finance: "finance",
  leadership: "leadership",
  // Some pages address Leadership as "Executive".
  executive: "leadership",
  procurement: "procurement",
  product: "product",
};

const ALLIED_PERSONA_TITLES: Record<string, string> = {
  itam: "itam",
  itfm: "itfm",
  "itsm itil": "itsm-itil",
  itsm: "itsm-itil",
  security: "security",
  sustainability: "sustainability",
};

/**
 * Resolve a Functional Activities heading to a persona. Handles plain
 * persona names, "As someone in a/an <X> role, I will…" phrasing, and
 * individually named allied personas.
 */
export function resolveActivityPersona(
  heading: string,
): ActivityPersona | { kind: "unknown" } {
  let norm = normalizeHeading(heading);
  const asSomeone = norm.match(/^as someone in an? (.+?) (?:team )?role/);
  if (asSomeone) norm = asSomeone[1] as string;
  const core = CORE_PERSONA_TITLES[norm];
  if (core) return { kind: "core", persona_slug: core };
  const allied = ALLIED_PERSONA_TITLES[norm];
  if (allied) return { kind: "allied", persona_slug: allied };
  if (norm === "allied personas") return { kind: "allied-group" };
  return { kind: "unknown" };
}

export function parseCapabilityPage(
  html: string,
  url: string,
): ParsedCapabilityPage {
  const $ = load(html);
  const warnings: string[] = [];
  const slug = slugFromUrl(url);
  const title = textOf($("h1").first());

  // Breadcrumb: Framework / Domains / <Domain> / <Capability>
  let domain_title: string | null = null;
  const crumb = $("p.breadcrumb").first();
  if (crumb.length) {
    const parts = textOf(crumb)
      .split("/")
      .map((s) => s.trim());
    const di = parts.findIndex((p) => normalizeHeading(p) === "domains");
    if (di >= 0 && parts.length > di + 1) domain_title = parts[di + 1] ?? null;
  }
  if (!domain_title) warnings.push(`${slug}: no domain breadcrumb found`);

  // Summary: first bolded paragraph after the h1 (before Definition).
  let summary = "";
  const firstStrongP = $("p")
    .filter(
      (_, el) =>
        $(el).find("strong, b").length > 0 && textOf($(el)).length > 40,
    )
    .first();
  if (firstStrongP.length) summary = textOf(firstStrongP);
  if (!summary) warnings.push(`${slug}: no summary paragraph found`);

  // Headline groups: the PAGE-TOP callout block(s) only — collected in
  // document order and stopped at the first content section, so persona
  // activity callouts and maturity callouts never pollute them (critique-2).
  // Group labels come as <p><b>…</b></p> on some pages and <h3> on others.
  const headline_groups: HeadlineGroup[] = [];
  let sawContentSection = false;
  let sawTopCallout = false;
  $("h2, div.callout-block").each((_, el) => {
    if (sawContentSection) return;
    const $el = $(el);
    const tag = "tagName" in el ? el.tagName.toLowerCase() : "";
    if (tag === "h2") {
      const t = normalizeHeading(textOf($el));
      if (t === "definition" || t === "maturity assessment") {
        sawContentSection = true;
      }
      return;
    }
    sawTopCallout = true;
    let current: HeadlineGroup | null = null;
    $el.children().each((_, child) => {
      const $c = $(child);
      const childTag = "tagName" in child ? child.tagName.toLowerCase() : "";
      const isLabel =
        childTag === "h3" ||
        (childTag === "p" && $c.find("b, strong").length > 0);
      if (isLabel) {
        const label = textOf($c);
        if (/^as someone in/i.test(label)) {
          current = null; // persona role-play block, not headline guidance
          return;
        }
        current = { label, items: [] };
        headline_groups.push(current);
      } else if ((childTag === "ul" || childTag === "ol") && current) {
        for (const item of parseList($, $c)) {
          current.items.push(item.text);
          for (const c of item.children) current.items.push(c);
        }
      }
    });
  });
  if (sawTopCallout && headline_groups.length === 0) {
    warnings.push(`${slug}: page-top callout yielded zero headline groups`);
  }

  // Definition — heading-anchored, with a wrapper-id fallback for pages
  // that render the section without its h2 (e.g. governance-policy-risk).
  let definition_md = "";
  const defHeading = findHeading($, "h2", ["definition"]);
  const defContent = defHeading
    ? sectionContent($, defHeading)
    : $("[id=definition]").first().children().not("h1, h2");
  if (defContent.length) {
    definition_md = htmlToMd($, defContent);
    if (!defHeading)
      warnings.push(`${slug}: Definition parsed via id fallback`);
  } else {
    warnings.push(`${slug}: Definition section not found`);
  }

  // Maturity Assessment: h4 per level + flat/nested <ul> (critique B1).
  const maturity_raw = { crawl: "", walk: "", run: "" } as Record<
    OfficialMaturityLevel,
    string
  >;
  const actions: Action[] = [];
  // Some pages repeat the Maturity Assessment h2 (intro prose in one, the
  // per-level callouts in another) — scan every matching section.
  const matBlocks = findHeadings($, "h2", ["maturity assessment"]).flatMap(
    (heading) => h4Blocks($, sectionContent($, heading)),
  );
  {
    for (const block of matBlocks) {
      const level = normalizeHeading(block.title) as OfficialMaturityLevel;
      if (!OFFICIAL_MATURITY_LEVELS.includes(level)) continue;
      maturity_raw[level] = htmlToMd($, block.nodes);
      const lists = block.nodes
        .filter("ul, ol")
        .add(block.nodes.find("ul, ol").first());
      const topList = lists.first();
      if (topList.length) {
        let ordinal = 0;
        for (const item of parseList($, topList)) {
          ordinal += 1;
          const parentOrdinal = ordinal;
          actions.push({
            capability_slug: slug,
            maturity: level,
            text: item.text,
            ordinal,
            official: false,
            parse_quality: "itemized",
          });
          for (const child of item.children) {
            ordinal += 1;
            actions.push({
              capability_slug: slug,
              maturity: level,
              text: child,
              ordinal,
              parent_ordinal: parentOrdinal,
              official: false,
              parse_quality: "itemized",
            });
          }
        }
      } else if (maturity_raw[level]) {
        actions.push({
          capability_slug: slug,
          maturity: level,
          text: maturity_raw[level],
          ordinal: 1,
          official: false,
          parse_quality: "raw_fallback",
        });
        warnings.push(`${slug}/${level}: no list found — raw_fallback`);
      }
    }
  }
  for (const level of OFFICIAL_MATURITY_LEVELS) {
    if (!maturity_raw[level]) {
      warnings.push(`${slug}: maturity level "${level}" missing`);
    }
  }

  // Functional Activities: h4 per core persona + "Allied Personas" bucket.
  const functional_activities: FunctionalActivity[] = [];
  const actHeading = findHeading($, "h2", [
    "functional activities",
    "functional activity",
  ]);
  if (actHeading) {
    for (const block of h4Blocks($, sectionContent($, actHeading))) {
      const items = parseList(
        $,
        block.nodes.filter("ul, ol").add(block.nodes.find("ul, ol")).first(),
      ).map((i) => i.text);
      if (items.length === 0) continue;
      const resolved = resolveActivityPersona(block.title);
      if (resolved.kind === "unknown") {
        warnings.push(
          `${slug}: unknown activity persona heading "${block.title}" bucketed as allied-group`,
        );
      }
      functional_activities.push({
        persona:
          resolved.kind === "unknown" ? { kind: "allied-group" } : resolved,
        heading: block.title,
        items,
      });
    }
  }
  if (functional_activities.length === 0) {
    warnings.push(`${slug}: no functional activities parsed`);
  }

  // Measures of Success & KPIs: bullets + optional Examples.
  const kpi_bullets: string[] = [];
  const example_kpis: { objective: string; kpi: string }[] = [];
  const kpiHeading = findHeading($, "h2", [
    "measures of success and kpis",
    "measures of success",
  ]);
  if (kpiHeading) {
    const section = sectionContent($, kpiHeading);
    // Some pages split bullets across several sub-headed lists — walk every
    // top-level list in the section (skipping the Examples block, parsed
    // separately below), keeping nested children too (critique-2).
    let underExamples = false;
    section.each((_, node) => {
      const $n = $(node);
      const tag = "tagName" in node ? node.tagName.toLowerCase() : "";
      const headings =
        tag === "h3" || tag === "h4" || tag === "h5"
          ? [$n]
          : $n
              .find("h3, h4, h5")
              .toArray()
              .map((h) => $(h));
      for (const h of headings) {
        underExamples = normalizeHeading(textOf(h)) === "examples";
      }
      const lists =
        tag === "ul" || tag === "ol"
          ? [$n]
          : $n
              .find("ul, ol")
              .toArray()
              .filter((l) => $(l).parents("ul, ol").length === 0)
              .map((l) => $(l));
      if (underExamples) return;
      for (const list of lists) {
        for (const item of parseList($, list)) {
          kpi_bullets.push(item.text);
          kpi_bullets.push(...item.children);
        }
      }
    });
    const examplesHeading = findHeading($, "h3", ["examples"]);
    if (examplesHeading) {
      const exList = examplesHeading
        .nextUntil("h2, h3")
        .filter("ul")
        .add(examplesHeading.nextUntil("h2, h3").find("ul"))
        .first();
      if (exList.length) {
        for (const item of parseList($, exList)) {
          const objective = item.children.find((c) =>
            /^objective\s*:/i.test(c),
          );
          const kpi = item.children.find((c) => /^kpi\s*:/i.test(c));
          if (objective && kpi) {
            example_kpis.push({
              objective: objective.replace(/^objective\s*:\s*/i, ""),
              kpi: kpi.replace(/^kpi\s*:\s*/i, ""),
            });
          }
        }
      }
    }
  } else {
    warnings.push(`${slug}: Measures of Success section not found`);
  }

  // Inputs & Outputs ("&" or "and" — critique B2).
  let inputs_outputs_md = "";
  const ioHeading = findHeading($, "h2", ["inputs and outputs"]);
  if (ioHeading) {
    const content = sectionContent($, ioHeading);
    inputs_outputs_md = htmlToMd($, content);
  } else {
    warnings.push(`${slug}: Inputs & Outputs section not found`);
  }

  // Featured KPI modals: parsed PAGE-WIDE, never section-scoped (critique B2).
  const featured_kpis: FeaturedKpiDetail[] = [];
  $("div.c-modal").each((_, el) => {
    const $el = $(el);
    const idAttr = $el.attr("id") ?? "";
    if (!/^\d+$/.test(idAttr)) return;
    const wp_id = Number(idAttr);
    const kpiTitle = textOf($el.find("h3").first());
    const description_md = htmlToMd(
      $,
      $el.find(".c-modal_content").first().children("p"),
    );
    // The fixed-code-block mixes labeled segments; formulas appear as <p>
    // text on some KPIs and as <li> items under a label on others, so we
    // walk children in order and assign lists to the PRECEDING label
    // (critique-2 BLOCKER: never misfile formulas as data sources).
    let formula: string | undefined;
    const data_sources: string[] = [];
    const codeBlock = $el.find(".fixed-code-block").first();
    if (codeBlock.length) {
      const inner = codeBlock.find(".inner").first();
      const scope = inner.length ? inner : codeBlock;
      const formulaLines: string[] = [];
      let segment: "formula" | "data_sources" = "formula";
      scope.children().each((_, child) => {
        const $c = $(child);
        const tag = "tagName" in child ? child.tagName.toLowerCase() : "";
        const t = textOf($c);
        if (tag === "p" || /^h\d$/.test(tag)) {
          if (/^(candidate )?data sources?\b/i.test(t)) {
            segment = "data_sources";
          } else if (/^formula\s*:?$/i.test(t)) {
            segment = "formula";
          } else if (t) {
            segment = "formula";
            formulaLines.push(t);
          }
        } else if (tag === "ul" || tag === "ol") {
          for (const item of parseList($, $c)) {
            const texts = [item.text, ...item.children];
            if (segment === "data_sources") data_sources.push(...texts);
            else formulaLines.push(...texts);
          }
        }
      });
      formula = formulaLines.join("\n").trim() || undefined;
      if (
        formula &&
        (/:\s*$/.test(formula) || /data sources?:/i.test(formula))
      ) {
        warnings.push(
          `${slug}: KPI modal ${idAttr} formula looks mis-segmented`,
        );
      }
    }
    const related_capability_slugs: string[] = [];
    $el.find("a").each((_, a) => {
      const s = slugFromHref($(a).attr("href"), "/framework/capabilities");
      if (s && !related_capability_slugs.includes(s))
        related_capability_slugs.push(s);
    });
    featured_kpis.push({
      wp_id,
      title: kpiTitle,
      description_md,
      formula,
      data_sources,
      related_capability_slugs,
    });
  });

  return {
    slug,
    title,
    domain_title,
    summary,
    definition_md,
    headline_groups,
    maturity_raw,
    actions,
    functional_activities,
    kpi_bullets,
    example_kpis,
    inputs_outputs_md,
    featured_kpis,
    warnings,
  };
}

export function domainTitleToSlug(title: string): string {
  return slugify(title);
}

export function buildCapability(
  page: ParsedCapabilityPage,
  wp_id: number,
  domain_slug: string,
  source_url: string,
): Capability {
  return {
    slug: page.slug,
    title: page.title,
    wp_id,
    domain_slug,
    summary: page.summary,
    definition_md: page.definition_md,
    headline_groups: page.headline_groups,
    maturity_raw: page.maturity_raw,
    functional_activities: page.functional_activities,
    kpi_bullets: page.kpi_bullets,
    example_kpis: page.example_kpis,
    inputs_outputs_md: page.inputs_outputs_md,
    featured_kpi_ids: page.featured_kpis.map((k) => k.wp_id),
    source_url,
    license: LICENSE,
  };
}
