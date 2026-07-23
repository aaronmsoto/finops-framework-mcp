// Offline derive step (spec §3): rebuilds every content/derived JSON entity
// from the canonical markdown produced by compose.ts. Parses ONLY our closed
// dialect (front-matter, `#{1,6} ` headings, `- ` lists with 2-space
// nesting, fenced code) — never re-fetches or re-parses HTML.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type {
  Action,
  Capability,
  Domain,
  EntityCounts,
  ExampleKpi,
  FunctionalActivity,
  HeadlineGroup,
  Kpi,
  LICENSE,
  MaturityLevel,
  OfficialMaturityLevel,
  Persona,
  PersonaCategory,
  Phase,
  Principle,
  ScopeDoc,
  TechnologyCategory,
} from "../../../shared/index.js";
import { OFFICIAL_MATURITY_LEVELS } from "../../../shared/index.js";
import { resolveActivityPersona } from "../parse/capability.js";
import { parseFrontmatter, type FrontmatterValue } from "./frontmatter.js";

// --- generic dialect parsing -------------------------------------------------

interface HeadingSection {
  title: string;
  body: string;
}

/**
 * Split `text` on lines that are EXACTLY an `N`-level heading (`#{level} `):
 * a shallower/deeper heading count never false-matches, since markdown
 * heading runs are exact-length (`^#{2}\s` cannot match a `### ` line).
 * Fenced code blocks are tracked so a `#` inside one is never read as a
 * heading. Returns the text before the first such heading (`preamble`) and
 * the ordered sections that follow.
 */
function splitHeadingSections(
  text: string,
  level: number,
): { preamble: string; sections: HeadingSection[] } {
  const markerRe = new RegExp(`^${"#".repeat(level)}\\s+(.+)$`);
  const preambleLines: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    const m = !inFence ? line.match(markerRe) : null;
    if (m) {
      current = { title: (m[1] as string).trim(), lines: [] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : preambleLines).push(line);
  }
  return {
    preamble: preambleLines.join("\n").trim(),
    sections: sections.map((s) => ({
      title: s.title,
      body: s.lines.join("\n").trim(),
    })),
  };
}

/** Parses a heading's trailing `{key=value}` identity attribute (compose's
 * `{wp_id=N}`/`{slug=x}` convention) — the derive-time inverse of it. */
function parseHeadingAttr(
  title: string,
  key: string,
): { label: string; value: string } {
  const m = title.match(new RegExp(`^(.*) \\{${key}=([^}]+)\\}$`));
  if (!m) {
    throw new Error(`heading missing {${key}=...} attribute: "${title}"`);
  }
  return { label: (m[1] as string).trim(), value: m[2] as string };
}

function parseOrderedSlugHeading(title: string): {
  order: number;
  label: string;
  slug: string;
} {
  const attr = parseHeadingAttr(title, "slug");
  const m = attr.label.match(/^(\d+)\.\s+(.*)$/);
  if (!m) throw new Error(`expected "N. Title" heading, got "${title}"`);
  return { order: Number(m[1]), label: m[2] as string, slug: attr.value };
}

function parseSlugHeading(title: string): { label: string; slug: string } {
  const attr = parseHeadingAttr(title, "slug");
  return { label: attr.label, slug: attr.value };
}

function parseWpIdHeading(title: string): { label: string; wpId: number } {
  const attr = parseHeadingAttr(title, "wp_id");
  return { label: attr.label, wpId: Number(attr.value) };
}

/** Flat `- item` bullet list (no nesting — used for guarded plain-text fields). */
function parseFlatBulletList(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^- (.*)$/);
    if (m) items.push(m[1] as string);
  }
  return items;
}

/** The Examples nested-list dialect: a duplicate `- <objective>` line
 * (ignored) followed by 2-space `Objective:`/`KPI:` pairs. */
function parseExampleKpis(text: string): ExampleKpi[] {
  const out: ExampleKpi[] = [];
  let pendingObjective: string | undefined;
  for (const line of text.split("\n")) {
    const obj = line.match(/^ {2}- Objective: (.*)$/);
    const kpi = line.match(/^ {2}- KPI: (.*)$/);
    if (obj) pendingObjective = obj[1] as string;
    else if (kpi && pendingObjective !== undefined) {
      out.push({ objective: pendingObjective, kpi: kpi[1] as string });
      pendingObjective = undefined;
    }
  }
  return out;
}

function extractFencedCode(text: string): string | undefined {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === "```");
  if (start < 0) return undefined;
  const end = lines.findIndex((l, i) => i > start && l.trim() === "```");
  if (end < 0) return undefined;
  const inner = lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
  return inner || undefined;
}

/**
 * Verbatim markdown fields (`maturity_raw`) preserve inline `**bold**`,
 * `*em*`, and `[text](url)` from `htmlToMd` — but the Action items derived
 * from the same list were originally extracted as PLAIN text (cheerio
 * `.text()`, see parse/capability.ts). This is the inverse of that inline
 * rendering, so re-derived action text matches the direct-parse output.
 */
function stripInlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reconstructs Action ordinals/parent_ordinal from a maturity level's raw
 * markdown: the first bullet list found (any surrounding prose is ignored,
 * mirroring the "first ul/ol" rule in parse/capability.ts) is flattened —
 * items at the list's own indent get a fresh ordinal, deeper-indented
 * items become children of the most recent such item.
 */
function deriveMaturityActions(
  capabilitySlug: string,
  level: OfficialMaturityLevel,
  raw: string,
): { actions: Action[]; warnings: string[] } {
  const bulletRe = /^(\s*)-\s+(.*)$/;
  const lines = raw.split("\n");
  const start = lines.findIndex((l) => bulletRe.test(l));
  if (start < 0) {
    if (!raw.trim()) return { actions: [], warnings: [] };
    return {
      actions: [
        {
          capability_slug: capabilitySlug,
          maturity: level,
          text: raw.trim(),
          ordinal: 1,
          official: false,
          parse_quality: "raw_fallback",
        },
      ],
      warnings: [`${capabilitySlug}/${level}: no list found — raw_fallback`],
    };
  }
  const topIndent = (lines[start] as string).match(bulletRe)?.[1]?.length ?? 0;
  const actions: Action[] = [];
  let ordinal = 0;
  let parentOrdinal = 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.trim() === "") continue;
    const m = line.match(bulletRe);
    if (!m) break;
    const indent = (m[1] as string).length;
    const text = stripInlineMd(m[2] as string);
    ordinal += 1;
    if (indent <= topIndent) {
      parentOrdinal = ordinal;
      actions.push({
        capability_slug: capabilitySlug,
        maturity: level,
        text,
        ordinal,
        official: false,
        parse_quality: "itemized",
      });
    } else {
      actions.push({
        capability_slug: capabilitySlug,
        maturity: level,
        text,
        ordinal,
        parent_ordinal: parentOrdinal,
        official: false,
        parse_quality: "itemized",
      });
    }
  }
  return { actions, warnings: [] };
}

function str(data: Record<string, FrontmatterValue>, key: string): string {
  const v = data[key];
  if (typeof v !== "string") {
    throw new Error(`front-matter field "${key}" is missing or not a string`);
  }
  return v;
}

function num(data: Record<string, FrontmatterValue>, key: string): number {
  const v = data[key];
  if (typeof v !== "number") {
    throw new Error(`front-matter field "${key}" is missing or not a number`);
  }
  return v;
}

// --- per-document derivers ----------------------------------------------------

export interface DerivedCapabilityDoc {
  capability: Capability;
  actions: Action[];
  warnings: string[];
}

export function deriveCapabilityDoc(md: string): DerivedCapabilityDoc {
  const { data, body } = parseFrontmatter(md);
  const slug = str(data, "slug");
  const warnings: string[] = [];
  const { sections } = splitHeadingSections(body, 2);
  const byTitle = new Map(sections.map((s) => [s.title, s.body]));

  const summary = (byTitle.get("Summary") ?? "").trim();

  const headline_groups: HeadlineGroup[] = [];
  const headlineBody = byTitle.get("Headline Groups");
  if (headlineBody !== undefined) {
    for (const g of splitHeadingSections(headlineBody, 3).sections) {
      headline_groups.push({
        label: g.title,
        items: parseFlatBulletList(g.body),
      });
    }
  }

  const definition_md = (byTitle.get("Definition") ?? "").trim();

  const maturity_raw: Record<OfficialMaturityLevel, string> = {
    crawl: "",
    walk: "",
    run: "",
  };
  const actions: Action[] = [];
  const maturityBody = byTitle.get("Maturity Assessment");
  if (maturityBody !== undefined) {
    for (const lvl of splitHeadingSections(maturityBody, 3).sections) {
      const level = lvl.title.toLowerCase() as OfficialMaturityLevel;
      if (!OFFICIAL_MATURITY_LEVELS.includes(level)) continue;
      maturity_raw[level] = lvl.body;
      const derived = deriveMaturityActions(slug, level, lvl.body);
      actions.push(...derived.actions);
      warnings.push(...derived.warnings);
    }
  }

  const functional_activities: FunctionalActivity[] = [];
  const activitiesBody = byTitle.get("Functional Activities");
  if (activitiesBody !== undefined) {
    for (const block of splitHeadingSections(activitiesBody, 3).sections) {
      const resolved = resolveActivityPersona(block.title);
      functional_activities.push({
        persona:
          resolved.kind === "unknown" ? { kind: "allied-group" } : resolved,
        heading: block.title,
        items: parseFlatBulletList(block.body),
      });
    }
  }

  let kpi_bullets: string[] = [];
  let example_kpis: ExampleKpi[] = [];
  const kpiBody = byTitle.get("Measures of Success & KPIs");
  if (kpiBody !== undefined) {
    const split = splitHeadingSections(kpiBody, 3);
    kpi_bullets = parseFlatBulletList(split.preamble);
    const examples = split.sections.find((s) => s.title === "Examples");
    if (examples) example_kpis = parseExampleKpis(examples.body);
  }

  const inputs_outputs_md = (byTitle.get("Inputs & Outputs") ?? "").trim();

  const featured_kpi_ids: number[] = [];
  const featuredBody = byTitle.get("Featured KPIs");
  if (featuredBody !== undefined) {
    for (const block of splitHeadingSections(featuredBody, 3).sections) {
      featured_kpi_ids.push(parseWpIdHeading(block.title).wpId);
    }
  }

  const capability: Capability = {
    slug,
    title: str(data, "title"),
    wp_id: num(data, "wp_id"),
    domain_slug: str(data, "domain"),
    summary,
    definition_md,
    headline_groups,
    maturity_raw,
    functional_activities,
    kpi_bullets,
    example_kpis,
    inputs_outputs_md,
    featured_kpi_ids,
    source_url: str(data, "source_url"),
    license: str(data, "license") as typeof LICENSE,
  };

  return { capability, actions, warnings };
}

export function derivePersonaDoc(md: string): Persona {
  const { data, body } = parseFrontmatter(md);
  const { sections } = splitHeadingSections(body, 2);
  const description = sections.find((s) => s.title === "Description");
  return {
    slug: str(data, "slug"),
    title: str(data, "title"),
    category: str(data, "category") as PersonaCategory,
    description_md: description?.body ?? "",
    source_url: str(data, "source_url"),
    license: str(data, "license") as typeof LICENSE,
  };
}

export function deriveKpiDoc(md: string): Kpi {
  const { data, body } = parseFrontmatter(md);
  const { sections } = splitHeadingSections(body, 2);
  const byTitle = new Map(sections.map((s) => [s.title, s.body]));
  const description_md = byTitle.get("Description") ?? "";
  const formulaBody = byTitle.get("Formula");
  const formula = formulaBody ? extractFencedCode(formulaBody) : undefined;
  return {
    slug: str(data, "slug"),
    title: str(data, "title"),
    wp_id: num(data, "wp_id"),
    description_md,
    ...(formula ? { formula } : {}),
    data_sources: parseFlatBulletList(
      byTitle.get("Candidate Data Sources") ?? "",
    ),
    related_capability_slugs: parseFlatBulletList(
      byTitle.get("Related Capabilities") ?? "",
    ),
    featured_on: parseFlatBulletList(byTitle.get("Featured On") ?? ""),
    source_url: str(data, "source_url"),
    license: str(data, "license") as typeof LICENSE,
  };
}

export function derivePrinciplesDoc(md: string): Principle[] {
  const { data, body } = parseFrontmatter(md);
  const source_url = str(data, "source_url");
  const license = str(data, "license") as typeof LICENSE;
  return splitHeadingSections(body, 2).sections.map((s) => {
    const { order, label, slug } = parseOrderedSlugHeading(s.title);
    return {
      slug,
      title: label,
      description_md: s.body,
      order,
      source_url,
      license,
    };
  });
}

export function derivePhasesDoc(md: string): Phase[] {
  const { data, body } = parseFrontmatter(md);
  const source_url = str(data, "source_url");
  const license = str(data, "license") as typeof LICENSE;
  return splitHeadingSections(body, 2).sections.map((s) => {
    const { order, label, slug } = parseOrderedSlugHeading(s.title);
    return {
      slug,
      title: label,
      description_md: s.body,
      order,
      source_url,
      license,
    };
  });
}

export function deriveDomainsDoc(md: string): Domain[] {
  const { data, body } = parseFrontmatter(md);
  const source_url = str(data, "source_url");
  const license = str(data, "license") as typeof LICENSE;
  return splitHeadingSections(body, 2).sections.map((s) => {
    const { label, slug } = parseSlugHeading(s.title);
    const split = splitHeadingSections(s.body, 3);
    const capsSection = split.sections.find((x) => x.title === "Capabilities");
    return {
      slug,
      title: label,
      description_md: split.preamble,
      capability_slugs: parseFlatBulletList(capsSection?.body ?? ""),
      source_url,
      license,
    };
  });
}

export function deriveMaturityModelDoc(md: string): MaturityLevel[] {
  const { data, body } = parseFrontmatter(md);
  const source_url = str(data, "source_url");
  const license = str(data, "license") as typeof LICENSE;
  return splitHeadingSections(body, 2).sections.map((s) => {
    const { label, slug } = parseSlugHeading(s.title);
    const { sections: subs } = splitHeadingSections(s.body, 3);
    const characteristics = subs.find((x) => x.title === "Characteristics");
    const sampleGoals = subs.find((x) => x.title === "Sample Goals");
    return {
      slug: slug as OfficialMaturityLevel,
      title: label,
      characteristics_md: characteristics?.body ?? "",
      sample_goals_md: sampleGoals?.body ?? "",
      official: true,
      source_url,
      license,
    };
  });
}

export function deriveTechnologyCategoriesDoc(
  md: string,
): TechnologyCategory[] {
  const { data, body } = parseFrontmatter(md);
  const source_url = str(data, "source_url");
  const license = str(data, "license") as typeof LICENSE;
  return splitHeadingSections(body, 2).sections.map((s) => {
    const { label, slug } = parseSlugHeading(s.title);
    return { slug, title: label, description_md: s.body, source_url, license };
  });
}

export function deriveScopesDoc(md: string): ScopeDoc {
  const { data, body } = parseFrontmatter(md);
  return {
    title: str(data, "title"),
    sections: splitHeadingSections(body, 2).sections.map((s) => ({
      heading: s.title,
      body_md: s.body,
    })),
    source_url: str(data, "source_url"),
    license: str(data, "license") as typeof LICENSE,
  };
}

// --- directory-level derive ---------------------------------------------------

export interface DerivedEntities {
  principles: Principle[];
  phases: Phase[];
  domains: Domain[];
  capabilities: Capability[];
  personas: Persona[];
  scopes: ScopeDoc;
  technologyCategories: TechnologyCategory[];
  maturityLevels: MaturityLevel[];
  kpis: Kpi[];
  actions: Action[];
}

export interface DeriveResult {
  files: Map<string, unknown>;
  counts: EntityCounts;
  warnings: string[];
  entities: DerivedEntities;
}

function need(docs: Map<string, string>, key: string): string {
  const v = docs.get(key);
  if (v === undefined) throw new Error(`derive: missing markdown doc "${key}"`);
  return v;
}

/** Pure core: derives every entity from an in-memory markdown doc map, keyed
 * the same way `content/markdown/` is laid out (e.g. `capabilities/allocation.md`,
 * `principles.md`) — used directly by `refresh` (docs still only in memory)
 * and, via `deriveArtifactPayload`, by the offline `derive` CLI command. */
export function deriveFromDocs(docs: Map<string, string>): DeriveResult {
  const warnings: string[] = [];

  const principles = derivePrinciplesDoc(need(docs, "principles.md"));
  const phases = derivePhasesDoc(need(docs, "phases.md"));
  const domains = deriveDomainsDoc(need(docs, "domains.md"));
  const technologyCategories = deriveTechnologyCategoriesDoc(
    need(docs, "technology-categories.md"),
  );
  const maturityLevels = deriveMaturityModelDoc(
    need(docs, "maturity-model.md"),
  );
  const scopes = deriveScopesDoc(need(docs, "scopes.md"));

  // Sorted by the entity's own slug, NOT the markdown filename — a filename
  // sort would misorder whenever one slug is a prefix of another (the ".md"
  // suffix breaks the tie the wrong way, e.g. "foo" vs "foo-bar").
  const capabilityDocs = [...docs.keys()]
    .filter((k) => k.startsWith("capabilities/"))
    .map((key) => deriveCapabilityDoc(docs.get(key) as string))
    .sort((a, b) => a.capability.slug.localeCompare(b.capability.slug));
  const capabilities = capabilityDocs.map((d) => d.capability);
  const actions = capabilityDocs.flatMap((d) => d.actions);
  for (const d of capabilityDocs) warnings.push(...d.warnings);

  const personas = [...docs.keys()]
    .filter((k) => k.startsWith("personas/"))
    .map((key) => derivePersonaDoc(docs.get(key) as string))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const kpis = [...docs.keys()]
    .filter((k) => k.startsWith("kpis/"))
    .map((key) => deriveKpiDoc(docs.get(key) as string))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const counts: EntityCounts = {
    principles: principles.length,
    phases: phases.length,
    domains: domains.length,
    capabilities: capabilities.length,
    personas: personas.length,
    technology_categories: technologyCategories.length,
    maturity_levels: maturityLevels.length,
    kpis: kpis.length,
  };

  const files = new Map<string, unknown>([
    ["content/principles.json", principles],
    ["content/phases.json", phases],
    ["content/domains.json", domains],
    ["content/capabilities.json", capabilities],
    ["content/personas.json", personas],
    ["content/scopes.json", scopes],
    ["content/technology-categories.json", technologyCategories],
    ["content/maturity-levels.json", maturityLevels],
    ["content/kpis.json", kpis],
    ["derived/actions.json", actions],
  ]);

  return {
    files,
    counts,
    warnings,
    entities: {
      principles,
      phases,
      domains,
      capabilities,
      personas,
      scopes,
      technologyCategories,
      maturityLevels,
      kpis,
      actions,
    },
  };
}

/** Recursively reads every `.md` file under `dir` into a map keyed by its
 * path relative to `dir`, using forward slashes regardless of platform. */
function walkMarkdownFiles(
  dir: string,
  base: string = dir,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      for (const [k, v] of walkMarkdownFiles(full, base)) out.set(k, v);
    } else if (entry.endsWith(".md")) {
      const rel = relative(base, full).split(sep).join("/");
      out.set(rel, readFileSync(full, "utf8"));
    }
  }
  return out;
}

/** Offline entry point (spec §3): rebuilds every content/derived JSON payload
 * from `markdownDir` with zero network or cache access. */
export function deriveArtifactPayload(markdownDir: string): DeriveResult {
  return deriveFromDocs(walkMarkdownFiles(markdownDir));
}
