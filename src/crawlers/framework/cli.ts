import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import * as cheerio from "cheerio";
import {
  ARTIFACT_FILES,
  EXPECTED_COUNTS,
  LICENSE,
  type Action,
  type Capability,
  type EntityCounts,
  type Kpi,
  type MaturityExtension,
  type Persona,
} from "../../shared/index.js";
import { CachedFetcher } from "./http.js";
import { htmlToMd } from "./md.js";
import { emitArtifact, renderDiffReport } from "./emit.js";
import {
  buildCapability,
  domainTitleToSlug,
  parseCapabilityPage,
  type ParsedCapabilityPage,
} from "./parse/capability.js";
import {
  parseDomains,
  parseMaturityModel,
  parsePersonaPage,
  parsePhases,
  parsePrinciples,
  parseScopes,
  parseTechnologyCategories,
} from "./parse/sections.js";
import {
  composeCapabilityMd,
  composeDomainsMd,
  composeKpiMd,
  composeMaturityModelMd,
  composePersonaMd,
  composePhasesMd,
  composePrinciplesMd,
  composeScopesMd,
  composeTechnologyCategoriesMd,
  type CapabilityRef,
} from "./markdown/compose.js";
import { scanForInjection, type InjectionHit } from "./sanitize.js";
import { ORIGIN, URLS } from "./urls.js";

interface ApiListRecord {
  title: string;
  url: string;
  excerpt: string;
  id: number;
}

interface WpKpiRecord {
  id: number;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
}

const PRE_CRAWL: MaturityExtension = {
  slug: "pre-crawl",
  title: "Pre-Crawl (unofficial extension)",
  description_md:
    "**Unofficial extension — not FinOps Foundation vocabulary.** The official " +
    "FinOps Maturity Model defines three levels: Crawl, Walk, and Run. This " +
    "server adds `pre-crawl` to describe the state *below* Crawl: the " +
    "capability's Crawl-level characteristics are not yet met consistently " +
    "(little or no process, tooling, or shared understanding). No official " +
    "assessment content exists below Crawl; use the Crawl characteristics as " +
    "the target when assessing a pre-crawl capability.",
  official: false,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function htmlFragmentToMd(html: string): string {
  const $ = cheerio.load(html);
  return htmlToMd($, $("body").children());
}

export interface RefreshOptions {
  artifactDir: string;
  cacheDir: string;
  reportDir: string;
  useCache: boolean;
  softCounts: boolean;
  log: (msg: string) => void;
}

export async function refresh(opts: RefreshOptions): Promise<number> {
  const { log } = opts;
  const fetcher = new CachedFetcher(opts.cacheDir, opts.useCache);
  const warnings: string[] = [];

  // --- fetch & cross-check enumeration sources -------------------------
  const capsApi = await fetcher.json<ApiListRecord[]>(URLS.capabilitiesApi);
  const personasApi = await fetcher.json<ApiListRecord[]>(URLS.personasApi);
  const kpiRecords = await fetcher.json<WpKpiRecord[]>(URLS.kpiCollection);
  const kpisApi = await fetcher.json<ApiListRecord[]>(URLS.kpisApi);
  const sitemapXml = await fetcher.text(URLS.capabilitiesSitemap);

  const sitemapUrls = new Set(
    [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      (m[1] as string).trim().replace(/\/?$/, "/"),
    ),
  );
  const apiUrls = new Set(capsApi.map((c) => c.url.replace(/\/?$/, "/")));
  const onlyApi = [...apiUrls].filter((u) => !sitemapUrls.has(u));
  const onlySitemap = [...sitemapUrls].filter((u) => !apiUrls.has(u));
  if (onlyApi.length || onlySitemap.length) {
    throw new Error(
      `capability sources disagree — only in capabilities-api: [${onlyApi.join(", ")}]; ` +
        `only in sitemap: [${onlySitemap.join(", ")}]`,
    );
  }
  if (kpisApi.length !== kpiRecords.length) {
    warnings.push(
      `kpis-api lists ${kpisApi.length} KPIs but /wp/v2/kpi returns ${kpiRecords.length}`,
    );
  }
  log(
    `enumeration ok: ${capsApi.length} capabilities, ${kpiRecords.length} KPIs`,
  );

  // --- section pages ----------------------------------------------------
  const principles = parsePrinciples(
    await fetcher.text(URLS.principles),
    URLS.principles,
  );
  const phases = parsePhases(await fetcher.text(URLS.phases), URLS.phases);
  const domains = parseDomains(await fetcher.text(URLS.domains), URLS.domains);
  const maturityLevels = parseMaturityModel(
    await fetcher.text(URLS.maturityModel),
    URLS.maturityModel,
  );
  const technologyCategories = parseTechnologyCategories(
    await fetcher.text(URLS.technologyCategories),
    URLS.technologyCategories,
  );
  const scopes = parseScopes(await fetcher.text(URLS.scopes), URLS.scopes);
  log("section pages parsed");

  // --- capability pages -------------------------------------------------
  const pages: ParsedCapabilityPage[] = [];
  const capabilities: Capability[] = [];
  const actions: Action[] = [];
  const domainByTitle = new Map(
    domains.map((d) => [domainTitleToSlug(d.title), d.slug]),
  );
  for (const rec of [...capsApi].sort((a, b) => a.url.localeCompare(b.url))) {
    const html = await fetcher.text(rec.url);
    const page = parseCapabilityPage(html, rec.url);
    warnings.push(...page.warnings);
    const domainSlug = page.domain_title
      ? (domainByTitle.get(domainTitleToSlug(page.domain_title)) ?? "")
      : "";
    // Cross-check breadcrumb against the domains-index card lists (m15).
    const fromIndex =
      domains.find((d) => d.capability_slugs.includes(page.slug))?.slug ?? "";
    let resolved = domainSlug || fromIndex;
    if (domainSlug && fromIndex && domainSlug !== fromIndex) {
      throw new Error(
        `domain mapping disagreement for ${page.slug}: breadcrumb says "${domainSlug}", domains index says "${fromIndex}"`,
      );
    }
    if (!resolved) {
      warnings.push(
        `${page.slug}: no domain mapping found from breadcrumb or index`,
      );
      resolved = "unknown";
    }
    pages.push(page);
    const cap = buildCapability(page, rec.id, resolved, rec.url);
    if (!cap.summary) cap.summary = rec.excerpt; // API excerpt fallback
    capabilities.push(cap);
    actions.push(...page.actions);
  }
  log(
    `capability pages parsed: ${capabilities.length}, actions: ${actions.length}`,
  );

  // --- personas ----------------------------------------------------------
  const personas: Persona[] = [];
  for (const rec of [...personasApi].sort((a, b) =>
    a.url.localeCompare(b.url),
  )) {
    const path = new URL(rec.url).pathname.replace(/\/+$/, "");
    const parts = path.split("/").filter(Boolean);
    // /framework/persona/{slug} = core; /framework/persona/allied-personas/{slug} = allied;
    // the bare allied-personas grouping page is not a persona (critique m13).
    if (parts.length === 3 && parts[2] === "allied-personas") continue;
    const category = parts[2] === "allied-personas" ? "allied" : "core";
    const html = await fetcher.text(rec.url);
    personas.push(parsePersonaPage(html, rec.url, category));
  }
  log(`personas parsed: ${personas.length}`);

  // --- KPIs ---------------------------------------------------------------
  const featuredDetail = new Map<
    number,
    {
      formula?: string;
      data_sources: string[];
      related: string[];
      featuredOn: string[];
    }
  >();
  for (const page of pages) {
    for (const fk of page.featured_kpis) {
      const entry = featuredDetail.get(fk.wp_id) ?? {
        formula: undefined,
        data_sources: [],
        related: [],
        featuredOn: [],
      };
      entry.formula = entry.formula ?? fk.formula;
      for (const s of fk.data_sources)
        if (!entry.data_sources.includes(s)) entry.data_sources.push(s);
      for (const s of fk.related_capability_slugs)
        if (!entry.related.includes(s)) entry.related.push(s);
      if (!entry.featuredOn.includes(page.slug))
        entry.featuredOn.push(page.slug);
      featuredDetail.set(fk.wp_id, entry);
    }
  }
  const capSlugSet = new Set(capabilities.map((c) => c.slug));
  const kpis: Kpi[] = [...kpiRecords]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((rec) => {
      const extra = featuredDetail.get(rec.id);
      const related = (extra?.related ?? [])
        .filter((s) => capSlugSet.has(s))
        .sort();
      return {
        slug: rec.slug,
        title: decodeEntities(rec.title.rendered),
        wp_id: rec.id,
        description_md: htmlFragmentToMd(rec.content.rendered),
        ...(extra?.formula ? { formula: extra.formula } : {}),
        data_sources: extra?.data_sources ?? [],
        related_capability_slugs: related,
        featured_on: (extra?.featuredOn ?? []).sort(),
        source_url: rec.link,
        license: LICENSE,
      };
    });
  const unmatchedModals = [...featuredDetail.keys()].filter(
    (id) => !kpiRecords.some((r) => r.id === id),
  );
  if (unmatchedModals.length) {
    warnings.push(
      `featured KPI modals not in KPI library: ${unmatchedModals.join(", ")}`,
    );
  }
  log(`KPIs assembled: ${kpis.length} (${featuredDetail.size} featured)`);

  // --- completeness + parse-quality budget --------------------------------
  const errors: string[] = [];
  for (const c of capabilities) {
    if (!c.definition_md) errors.push(`${c.slug}: empty definition`);
    for (const level of ["crawl", "walk", "run"] as const) {
      if (!c.maturity_raw[level])
        errors.push(`${c.slug}: missing maturity ${level}`);
    }
    if (c.functional_activities.length === 0)
      errors.push(`${c.slug}: no functional activities`);
  }
  for (const k of kpis) {
    if (
      k.formula &&
      (/:\s*$/.test(k.formula) || /data sources?:/i.test(k.formula))
    ) {
      errors.push(
        `${k.slug}: formula looks mis-segmented ("${k.formula.slice(0, 60)}…")`,
      );
    }
  }
  const rawFallback = actions.filter(
    (a) => a.parse_quality === "raw_fallback",
  ).length;
  if (actions.length === 0 || rawFallback / actions.length > 0.3) {
    errors.push(
      `parse-quality budget exceeded: ${rawFallback}/${actions.length} raw_fallback`,
    );
  }

  // --- injection scan -------------------------------------------------------
  const hits: InjectionHit[] = [];
  const scan = (where: string, value: unknown) =>
    hits.push(...scanForInjection(where, JSON.stringify(value)));
  scan("capabilities", capabilities);
  scan("principles", principles);
  scan("phases", phases);
  scan("domains", domains);
  scan("personas", personas);
  scan("scopes", scopes);
  scan("technology-categories", technologyCategories);
  scan("maturity-levels", maturityLevels);
  scan("kpis", kpis);
  scan("actions", actions);
  for (const h of hits) {
    errors.push(
      `possible injection (${h.pattern}) in ${h.where}: …${h.excerpt}…`,
    );
  }

  // --- counts ---------------------------------------------------------------
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
  const mismatch: Record<string, { expected: number; actual: number }> = {};
  for (const [k, expected] of Object.entries(EXPECTED_COUNTS) as [
    keyof EntityCounts,
    number,
  ][]) {
    if (counts[k] !== expected) mismatch[k] = { expected, actual: counts[k] };
  }
  if (Object.keys(mismatch).length > 0) {
    const desc = Object.entries(mismatch)
      .map(([k, v]) => `${k}: expected ${v.expected}, got ${v.actual}`)
      .join("; ");
    if (opts.softCounts) warnings.push(`count mismatch (soft): ${desc}`);
    else
      errors.push(`count mismatch: ${desc} (use --soft-counts to emit anyway)`);
  }

  if (errors.length > 0) {
    for (const e of errors) opts.log(`ERROR ${e}`);
    return 1;
  }

  // --- validate against schemas ---------------------------------------------
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
    ["derived/maturity-extension.json", PRE_CRAWL],
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  for (const [rel, data] of files) {
    const validate = ajv.compile(
      ARTIFACT_FILES[rel] as Record<string, unknown>,
    );
    if (!validate(data)) {
      const first = validate.errors?.[0];
      throw new Error(
        `pre-emit validation failed for ${rel} at "${first?.instancePath}": ${first?.message}`,
      );
    }
  }

  // --- compose canonical markdown (spec §2) -----------------------------------
  const capabilityRefs = new Map<string, CapabilityRef>(
    capabilities.map((c) => [c.slug, { title: c.title, url: c.source_url }]),
  );
  const capabilityBySlug = new Map(capabilities.map((c) => [c.slug, c]));
  for (const page of [...pages].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const cap = capabilityBySlug.get(page.slug);
    if (!cap) continue;
    files.set(
      `content/markdown/capabilities/${page.slug}.md`,
      composeCapabilityMd(
        page,
        {
          wpId: cap.wp_id,
          domainSlug: cap.domain_slug,
          sourceUrl: cap.source_url,
          license: LICENSE,
        },
        capabilityRefs,
      ),
    );
  }
  for (const persona of [...personas].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )) {
    files.set(
      `content/markdown/personas/${persona.slug}.md`,
      composePersonaMd(persona),
    );
  }
  for (const kpi of [...kpis].sort((a, b) => a.slug.localeCompare(b.slug))) {
    files.set(`content/markdown/kpis/${kpi.slug}.md`, composeKpiMd(kpi));
  }
  files.set("content/markdown/principles.md", composePrinciplesMd(principles));
  files.set("content/markdown/phases.md", composePhasesMd(phases));
  files.set("content/markdown/domains.md", composeDomainsMd(domains));
  files.set(
    "content/markdown/maturity-model.md",
    composeMaturityModelMd(maturityLevels),
  );
  files.set(
    "content/markdown/technology-categories.md",
    composeTechnologyCategoriesMd(technologyCategories),
  );
  files.set("content/markdown/scopes.md", composeScopesMd(scopes));
  const markdownDocCount =
    capabilities.length + personas.length + kpis.length + 6;
  log(`markdown composed: ${markdownDocCount} docs`);

  // --- emit -------------------------------------------------------------------
  const sortedWarnings = [...warnings].sort();
  const result = emitArtifact(
    opts.artifactDir,
    files,
    counts,
    opts.softCounts ? mismatch : undefined,
    sortedWarnings,
    [ORIGIN + "/framework/", ORIGIN + "/kpi/"],
  );
  mkdirSync(opts.reportDir, { recursive: true });
  const report = renderDiffReport(result, sortedWarnings);
  writeFileSync(join(opts.reportDir, "diff-report.md"), report);
  log(report.split("\n").slice(0, 8).join("\n"));
  log(
    `fetch: ${fetcher.report.fetched.length} network, ${fetcher.report.fromCache.length} cached, ` +
      `${fetcher.report.skippedByRobots.length} robots-skipped`,
  );
  return 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] !== "refresh") {
    console.error(
      "usage: cli.js refresh [--no-cache] [--soft-counts] [--artifact-dir DIR]",
    );
    process.exit(2);
  }
  const flag = (name: string) => args.includes(name);
  const value = (name: string, def: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? (args[i + 1] as string) : def;
  };
  const code = await refresh({
    artifactDir: value("--artifact-dir", "data/framework"),
    cacheDir: value("--cache-dir", ".cache/crawl"),
    reportDir: value("--report-dir", ".cache/crawl-report"),
    useCache: !flag("--no-cache"),
    softCounts: flag("--soft-counts"),
    log: (m) => console.error(m),
  });
  process.exit(code);
}

const isDirectRun = process.argv[1]?.endsWith("cli.js");
if (isDirectRun) {
  main().catch((err) => {
    console.error(String(err instanceof Error ? err.stack : err));
    process.exit(1);
  });
}
