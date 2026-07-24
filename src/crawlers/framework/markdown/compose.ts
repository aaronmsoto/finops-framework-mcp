// Deterministic serializers: parser outputs → canonical markdown docs
// (spec §2). Every doc is a pure function of its input record(s) — no
// timestamps, no ordering nondeterminism — so a refresh against unchanged
// HTML produces byte-identical files (idempotence).
import type {
  Domain,
  MaturityLevel,
  OfficialMaturityLevel,
  Persona,
  Phase,
  Principle,
  ScopeDoc,
  TechnologyCategory,
  Kpi,
} from "../../../shared/index.js";
import { OFFICIAL_MATURITY_LEVELS } from "../../../shared/index.js";
import type {
  FeaturedKpiDetail,
  ParsedCapabilityPage,
} from "../parse/capability.js";
import { formatFrontmatter, type FrontmatterValue } from "./frontmatter.js";

/** Thrown when compose input would break the markdown dialect (spec §2). */
export class ComposeError extends Error {}

/**
 * Escaping guard: a plain-text item/label may not start with `-`/`#` (would
 * be misread as a list marker or heading) or contain a newline (would break
 * line-based list/heading detection). Verbatim already-markdown fields
 * (definition_md, maturity_raw, description_md, …) are NOT run through this
 * — they are inserted as-is.
 */
function guard(text: string, where: string): string {
  if (text.includes("\n")) {
    throw new ComposeError(`${where}: plain-text item contains a newline`);
  }
  if (/^[-#]/.test(text)) {
    throw new ComposeError(
      `${where}: plain-text item starts with "${text[0]}" — would break the markdown dialect`,
    );
  }
  return text;
}

function bulletLines(items: string[], where: string, indent = ""): string {
  return items.map((item) => `${indent}- ${guard(item, where)}`).join("\n");
}

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

/** Joins top-level blocks with a single blank line; trims outer whitespace. */
function assembleBody(blocks: string[]): string {
  return blocks
    .filter((b) => b.length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function doc(
  frontmatter: Record<string, FrontmatterValue | undefined>,
  blocks: string[],
): string {
  return `${formatFrontmatter(frontmatter)}\n\n${assembleBody(blocks)}\n`;
}

const LEVEL_TITLE: Record<OfficialMaturityLevel, string> = {
  crawl: "Crawl",
  walk: "Walk",
  run: "Run",
};

export interface CapabilityRef {
  title: string;
  url: string;
}

export interface CapabilityMdMeta {
  wpId: number;
  domainSlug: string;
  sourceUrl: string;
  license: string;
}

/** Capability doc: section order and headings are fixed by spec §2. */
export function composeCapabilityMd(
  page: ParsedCapabilityPage,
  meta: CapabilityMdMeta,
  capabilityRefs: Map<string, CapabilityRef>,
): string {
  const where = `capability/${page.slug}`;
  const blocks: string[] = [];

  if (page.summary) {
    blocks.push(heading(2, "Summary"));
    blocks.push(guard(page.summary, `${where} summary`));
  }

  if (page.headline_groups.length > 0) {
    blocks.push(heading(2, "Headline Groups"));
    for (const group of page.headline_groups) {
      blocks.push(
        heading(3, guard(group.label, `${where} headline group label`)),
      );
      blocks.push(
        bulletLines(group.items, `${where} headline group "${group.label}"`),
      );
    }
  }

  if (page.definition_md) {
    blocks.push(heading(2, "Definition"));
    blocks.push(page.definition_md);
  }

  if (OFFICIAL_MATURITY_LEVELS.some((level) => page.maturity_raw[level])) {
    blocks.push(heading(2, "Maturity Assessment"));
    for (const level of OFFICIAL_MATURITY_LEVELS) {
      if (!page.maturity_raw[level]) continue;
      blocks.push(heading(3, LEVEL_TITLE[level]));
      blocks.push(page.maturity_raw[level]);
    }
  }

  if (page.functional_activities.length > 0) {
    blocks.push(heading(2, "Functional Activities"));
    for (const activity of page.functional_activities) {
      blocks.push(
        heading(
          3,
          guard(activity.heading, `${where} functional activity heading`),
        ),
      );
      blocks.push(
        bulletLines(
          activity.items,
          `${where} functional activity "${activity.heading}"`,
        ),
      );
    }
  }

  if (page.kpi_bullets.length > 0 || page.example_kpis.length > 0) {
    blocks.push(heading(2, "Measures of Success & KPIs"));
    if (page.kpi_bullets.length > 0) {
      blocks.push(
        bulletLines(page.kpi_bullets, `${where} measures of success bullets`),
      );
    }
    if (page.example_kpis.length > 0) {
      blocks.push(heading(3, "Examples"));
      const exampleWhere = `${where} example kpis`;
      const lines = page.example_kpis.flatMap((ex) => [
        `- ${guard(ex.objective, exampleWhere)}`,
        `  - Objective: ${guard(ex.objective, exampleWhere)}`,
        `  - KPI: ${guard(ex.kpi, exampleWhere)}`,
      ]);
      blocks.push(lines.join("\n"));
    }
  }

  if (page.inputs_outputs_md) {
    blocks.push(heading(2, "Inputs & Outputs"));
    blocks.push(page.inputs_outputs_md);
  }

  if (page.featured_kpis.length > 0) {
    blocks.push(heading(2, "Featured KPIs"));
    for (const fk of page.featured_kpis) {
      blocks.push(...composeFeaturedKpiBlocks(fk, where, capabilityRefs));
    }
  }

  return doc(
    {
      kind: "capability",
      slug: page.slug,
      title: page.title,
      wp_id: meta.wpId,
      domain: meta.domainSlug,
      source_url: meta.sourceUrl,
      license: meta.license,
      warnings:
        page.warnings.length > 0 ? [...page.warnings].sort() : undefined,
    },
    blocks,
  );
}

function composeFeaturedKpiBlocks(
  fk: FeaturedKpiDetail,
  where: string,
  capabilityRefs: Map<string, CapabilityRef>,
): string[] {
  const kpiWhere = `${where} featured kpi ${fk.wp_id}`;
  const blocks: string[] = [
    heading(3, `${guard(fk.title, kpiWhere)} {wp_id=${fk.wp_id}}`),
  ];
  if (fk.description_md) blocks.push(fk.description_md);
  if (fk.formula) {
    blocks.push(heading(4, "Formula"));
    blocks.push(`\`\`\`\n${fk.formula}\n\`\`\``);
  }
  if (fk.data_sources.length > 0) {
    blocks.push(heading(4, "Candidate Data Sources"));
    blocks.push(bulletLines(fk.data_sources, `${kpiWhere} data sources`));
  }
  if (fk.related_capability_slugs.length > 0) {
    blocks.push(heading(4, "Related Capabilities"));
    const links = fk.related_capability_slugs.map((slug) => {
      const ref = capabilityRefs.get(slug);
      const text = ref ? `[${ref.title}](${ref.url})` : `[${slug}](${slug})`;
      return `- ${guard(text, `${kpiWhere} related capabilities`)}`;
    });
    blocks.push(links.join("\n"));
  }
  return blocks;
}

export interface PersonaMdMeta {
  license: string;
}

/** Persona doc: single prose section, no per-spec heading rules given. */
export function composePersonaMd(persona: Persona): string {
  const blocks: string[] = [];
  if (persona.description_md) {
    blocks.push(heading(2, "Description"));
    blocks.push(persona.description_md);
  }
  return doc(
    {
      kind: "persona",
      slug: persona.slug,
      title: persona.title,
      category: persona.category,
      source_url: persona.source_url,
      license: persona.license,
    },
    blocks,
  );
}

/** KPI library doc: description + optional formula/data-sources/cross-links. */
export function composeKpiMd(kpi: Kpi): string {
  const where = `kpi/${kpi.slug}`;
  const blocks: string[] = [];
  if (kpi.description_md) {
    blocks.push(heading(2, "Description"));
    blocks.push(kpi.description_md);
  }
  if (kpi.formula) {
    blocks.push(heading(2, "Formula"));
    blocks.push(`\`\`\`\n${kpi.formula}\n\`\`\``);
  }
  if (kpi.data_sources.length > 0) {
    blocks.push(heading(2, "Candidate Data Sources"));
    blocks.push(bulletLines(kpi.data_sources, `${where} data sources`));
  }
  if (kpi.related_capability_slugs.length > 0) {
    blocks.push(heading(2, "Related Capabilities"));
    blocks.push(
      bulletLines(
        kpi.related_capability_slugs,
        `${where} related capabilities`,
      ),
    );
  }
  if (kpi.featured_on.length > 0) {
    blocks.push(heading(2, "Featured On"));
    blocks.push(bulletLines(kpi.featured_on, `${where} featured on`));
  }
  return doc(
    {
      kind: "kpi",
      slug: kpi.slug,
      title: kpi.title,
      wp_id: kpi.wp_id,
      source_url: kpi.source_url,
      license: kpi.license,
    },
    blocks,
  );
}

export function composePrinciplesMd(principles: Principle[]): string {
  const blocks = principles.map((p) => {
    const where = `principle/${p.slug}`;
    return assembleBody([
      heading(2, `${p.order}. ${guard(p.title, where)} {slug=${p.slug}}`),
      p.description_md,
    ]);
  });
  return doc(
    {
      kind: "principles",
      source_url: principles[0]?.source_url,
      license: principles[0]?.license,
    },
    blocks,
  );
}

export function composePhasesMd(phases: Phase[]): string {
  const blocks = phases.map((p) => {
    const where = `phase/${p.slug}`;
    return assembleBody([
      heading(2, `${p.order}. ${guard(p.title, where)} {slug=${p.slug}}`),
      p.description_md,
    ]);
  });
  return doc(
    {
      kind: "phases",
      source_url: phases[0]?.source_url,
      license: phases[0]?.license,
    },
    blocks,
  );
}

export function composeDomainsMd(domains: Domain[]): string {
  const blocks = domains.map((d) => {
    const where = `domain/${d.slug}`;
    return assembleBody([
      heading(2, `${guard(d.title, where)} {slug=${d.slug}}`),
      d.description_md,
      heading(3, "Capabilities"),
      bulletLines(d.capability_slugs, `${where} capabilities`),
    ]);
  });
  return doc(
    {
      kind: "domains",
      source_url: domains[0]?.source_url,
      license: domains[0]?.license,
    },
    blocks,
  );
}

export function composeMaturityModelMd(levels: MaturityLevel[]): string {
  const blocks = levels.map((l) => {
    const where = `maturity-level/${l.slug}`;
    return assembleBody([
      heading(2, `${guard(l.title, where)} {slug=${l.slug}}`),
      heading(3, "Characteristics"),
      l.characteristics_md,
      ...(l.sample_goals_md
        ? [heading(3, "Sample Goals"), l.sample_goals_md]
        : []),
    ]);
  });
  return doc(
    {
      kind: "maturity-model",
      source_url: levels[0]?.source_url,
      license: levels[0]?.license,
    },
    blocks,
  );
}

export function composeTechnologyCategoriesMd(
  cats: TechnologyCategory[],
): string {
  const blocks = cats.map((c) => {
    const where = `technology-category/${c.slug}`;
    return assembleBody([
      heading(2, `${guard(c.title, where)} {slug=${c.slug}}`),
      c.description_md,
    ]);
  });
  return doc(
    {
      kind: "technology-categories",
      source_url: cats[0]?.source_url,
      license: cats[0]?.license,
    },
    blocks,
  );
}

export function composeScopesMd(scopes: ScopeDoc): string {
  const blocks = scopes.sections.map((s) =>
    assembleBody([
      heading(2, guard(s.heading, "scopes section heading")),
      s.body_md,
    ]),
  );
  return doc(
    {
      kind: "scopes",
      title: scopes.title,
      source_url: scopes.source_url,
      license: scopes.license,
    },
    blocks,
  );
}
