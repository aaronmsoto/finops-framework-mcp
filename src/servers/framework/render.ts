import type {
  Artifact,
  Capability,
  Kpi,
  OfficialMaturityLevel,
  Persona,
} from "../../shared/index.js";
import { URI } from "./uris.js";

// One renderer per entity, shared by the resource handlers, the tools, and
// the prompts (critique M10) so the two surfaces can never drift.

export const UNOFFICIAL_ACTIONS_NOTE =
  "Note: these items are an unofficial parsing of the official maturity " +
  "prose into discrete assessment characteristics (rubric states an assessor " +
  "checks for) — they are NOT official to-do steps.";

export function footer(artifact: Artifact, sourceUrl: string): string {
  const m = artifact.manifest;
  return (
    `\n\n---\n` +
    `Source: ${sourceUrl} — © FinOps Foundation, licensed CC BY 4.0 ` +
    `(https://creativecommons.org/licenses/by/4.0/). Content restructured and ` +
    `adapted by finops-framework-mcp (data v${m.data_version}, crawled ` +
    `${m.crawled_at.slice(0, 10)}); unofficial extensions are always marked.`
  );
}

export function overviewMd(artifact: Artifact): string {
  const m = artifact.manifest;
  const domains = artifact.domains
    .map((d) => `- **${d.title}** (${d.capability_slugs.length} capabilities)`)
    .join("\n");
  return (
    `# FinOps Framework — agent orientation\n\n` +
    `This server exposes the FinOps Framework (finops.org/framework), the ` +
    `operating model for maximizing the business value of technology spend, ` +
    `as structured data: **${artifact.principles.length} Principles** (north ` +
    `stars), **${artifact.phases.length} Phases** (Inform/Optimize/Operate — ` +
    `an iterative lifecycle, not a partition of capabilities), ` +
    `**${artifact.domains.length} Domains** containing ` +
    `**${artifact.capabilities.length} Capabilities** (the unit of practice — ` +
    `each with a definition, Crawl/Walk/Run maturity assessments, per-persona ` +
    `activities, and KPIs), **${artifact.personas.length} Personas** (6 core ` +
    `+ 5 allied), **${artifact.technology_categories.length} Technology ` +
    `Categories**, the Scopes concept, and a **KPI library** ` +
    `(${artifact.kpis.length} entries).\n\n` +
    `## Domains\n\n${domains}\n\n` +
    `## How to navigate\n\n` +
    `- Look up anything by keyword: \`search_framework\`.\n` +
    `- Browse: \`list_capabilities\` (filter by domain or persona), then ` +
    `\`get_capability\` with an \`include\` list to control size.\n` +
    `- Maturity work: \`get_actions\` (assessment characteristics per level), ` +
    `\`assess_maturity_path\` (gap between levels).\n` +
    `- KPIs: \`get_kpis\` (full records incl. formulas where published).\n` +
    `- People: \`map_personas\` (capability↔persona matrix).\n` +
    `- Full documents are also resources under \`finops://framework/…\`.\n\n` +
    `Official content vs. unofficial extensions: the \`pre-crawl\` maturity ` +
    `level and parsed assessment items ("actions") are extensions carrying ` +
    `\`official: false\`, separate files, and explicit notes. Everything else ` +
    `is crawled verbatim from finops.org.\n` +
    `\nData version ${m.data_version}, crawled ${m.crawled_at.slice(0, 10)}.`
  );
}

export function capabilityMd(
  artifact: Artifact,
  c: Capability,
  include: string[] = [
    "summary",
    "definition",
    "maturity",
    "activities",
    "kpis",
    "inputs_outputs",
  ],
): string {
  const parts: string[] = [`# ${c.title}`];
  const domain = artifact.domains.find((d) => d.slug === c.domain_slug);
  parts.push(
    `Domain: **${domain?.title ?? c.domain_slug}** · slug: \`${c.slug}\``,
  );
  if (include.includes("summary") && c.summary) {
    parts.push(`**${c.summary}**`);
  }
  if (include.includes("headline_groups") && c.headline_groups.length > 0) {
    parts.push(
      `## Headline activity groups\n\n` +
        c.headline_groups
          .map(
            (g) => `**${g.label}**\n${g.items.map((i) => `- ${i}`).join("\n")}`,
          )
          .join("\n\n"),
    );
  }
  if (include.includes("definition")) {
    parts.push(`## Definition\n\n${c.definition_md}`);
  }
  if (include.includes("maturity")) {
    for (const level of ["crawl", "walk", "run"] as const) {
      parts.push(`## Maturity: ${level}\n\n${c.maturity_raw[level]}`);
    }
  }
  if (include.includes("activities")) {
    parts.push(
      `## Functional activities\n\n` +
        c.functional_activities
          .map(
            (f) =>
              `### ${f.heading}\n${f.items.map((i) => `- ${i}`).join("\n")}`,
          )
          .join("\n\n"),
    );
  }
  if (include.includes("kpis")) {
    const featured = artifact.kpis.filter((k) =>
      c.featured_kpi_ids.includes(k.wp_id),
    );
    parts.push(
      `## Measures of success & KPIs\n\n` +
        (c.kpi_bullets.length
          ? c.kpi_bullets.map((b) => `- ${b}`).join("\n")
          : "_No KPI bullets published for this capability._") +
        (c.example_kpis.length
          ? `\n\n### Examples\n${c.example_kpis
              .map((e) => `- Objective: ${e.objective} — KPI: ${e.kpi}`)
              .join("\n")}`
          : "") +
        (featured.length
          ? `\n\n### Featured KPIs\n${featured
              .map(
                (k) =>
                  `- **${k.title}** (\`${k.slug}\`)${k.formula ? ` — formula available` : ""}`,
              )
              .join("\n")}`
          : ""),
    );
  }
  if (include.includes("inputs_outputs") && c.inputs_outputs_md) {
    parts.push(`## Inputs & outputs\n\n${c.inputs_outputs_md}`);
  }
  return parts.join("\n\n") + footer(artifact, c.source_url);
}

export function maturityLevelMd(
  artifact: Artifact,
  c: Capability,
  level: OfficialMaturityLevel | "pre-crawl",
): string {
  if (level === "pre-crawl") {
    return (
      `# ${c.title} — Pre-Crawl (unofficial extension)\n\n` +
      `${artifact.maturity_extension.description_md}\n\n` +
      `No official assessment content exists below Crawl. Assess against the ` +
      `Crawl characteristics: see ${URI.capabilityMaturity(c.slug, "crawl")}.` +
      footer(artifact, c.source_url)
    );
  }
  const items = artifact.actions.filter(
    (a) => a.capability_slug === c.slug && a.maturity === level,
  );
  return (
    `# ${c.title} — Maturity: ${level}\n\n${c.maturity_raw[level]}\n\n` +
    `## Parsed assessment characteristics\n\n${UNOFFICIAL_ACTIONS_NOTE}\n\n` +
    items
      .map((a) => `${a.parent_ordinal ? "  " : ""}- [${a.ordinal}] ${a.text}`)
      .join("\n") +
    footer(artifact, c.source_url)
  );
}

export function personaMd(artifact: Artifact, p: Persona): string {
  const involved = artifact.capabilities.filter((c) =>
    c.functional_activities.some(
      (f) =>
        (f.persona.kind !== "allied-group" &&
          f.persona.persona_slug === p.slug) ||
        (p.category === "allied" && f.persona.kind === "allied-group"),
    ),
  );
  const note =
    p.category === "allied"
      ? `\n\n_The framework maps capability activities to Allied Personas ` +
        `collectively (plus a few named callouts), not to ${p.title} ` +
        `specifically — the list below includes group-level mappings._`
      : "";
  return (
    `# ${p.title} (${p.category} persona)\n\n${p.description_md}\n\n` +
    `## Involved in capabilities${note}\n\n` +
    involved.map((c) => `- ${c.title} (\`${c.slug}\`)`).join("\n") +
    footer(artifact, p.source_url)
  );
}

export function kpiMd(artifact: Artifact, k: Kpi): string {
  return (
    `# ${k.title}\n\nslug: \`${k.slug}\`` +
    (k.featured_on.length
      ? ` · featured on: ${k.featured_on.map((s) => `\`${s}\``).join(", ")}`
      : ` · library entry (not featured on a capability page)`) +
    `\n\n${k.description_md}` +
    (k.formula ? `\n\n## Formula\n\n\`\`\`\n${k.formula}\n\`\`\`` : "") +
    (k.data_sources.length
      ? `\n\n## Candidate data sources\n\n${k.data_sources.map((d) => `- ${d}`).join("\n")}`
      : "") +
    (k.related_capability_slugs.length
      ? `\n\n## Related capabilities (official)\n\n${k.related_capability_slugs
          .map((s) => `- \`${s}\``)
          .join("\n")}`
      : "") +
    footer(artifact, k.source_url)
  );
}

export function collectionMd(
  artifact: Artifact,
  which:
    | "principles"
    | "phases"
    | "domains"
    | "technology-categories"
    | "maturity-model"
    | "personas-index"
    | "capabilities-index"
    | "scopes",
): string {
  switch (which) {
    case "principles":
      return (
        `# FinOps Principles\n\n` +
        artifact.principles
          .map((p) => `## ${p.order}. ${p.title}\n\n${p.description_md}`)
          .join("\n\n") +
        footer(artifact, artifact.principles[0]?.source_url ?? "")
      );
    case "phases":
      return (
        `# FinOps Phases\n\nAn iterative lifecycle every capability cycles ` +
        `through — the framework does NOT assign capabilities to phases.\n\n` +
        artifact.phases
          .map((p) => `## ${p.order}. ${p.title}\n\n${p.description_md}`)
          .join("\n\n") +
        footer(artifact, artifact.phases[0]?.source_url ?? "")
      );
    case "domains":
      return (
        `# FinOps Domains\n\n` +
        artifact.domains
          .map(
            (d) =>
              `## ${d.title}\n\n${d.description_md}\n\nCapabilities: ` +
              d.capability_slugs.map((s) => `\`${s}\``).join(", "),
          )
          .join("\n\n") +
        footer(artifact, artifact.domains[0]?.source_url ?? "")
      );
    case "technology-categories":
      return (
        `# Technology Categories\n\n` +
        artifact.technology_categories
          .map((t) => `## ${t.title}\n\n${t.description_md}`)
          .join("\n\n") +
        footer(artifact, artifact.technology_categories[0]?.source_url ?? "")
      );
    case "maturity-model":
      return (
        `# FinOps Maturity Model\n\n## Official levels (3)\n\n` +
        artifact.maturity_levels
          .map(
            (l) =>
              `### ${l.title}\n\n**Characteristics**\n\n${l.characteristics_md}\n\n` +
              `**Sample goals/KPIs from the FinOps community**\n\n${l.sample_goals_md}`,
          )
          .join("\n\n") +
        `\n\n## Unofficial extension: Pre-Crawl\n\n${artifact.maturity_extension.description_md}` +
        footer(artifact, artifact.maturity_levels[0]?.source_url ?? "")
      );
    case "personas-index":
      return (
        `# FinOps Personas\n\n## Core\n\n` +
        artifact.personas
          .filter((p) => p.category === "core")
          .map((p) => `- **${p.title}** (\`${p.slug}\`)`)
          .join("\n") +
        `\n\n## Allied\n\n` +
        artifact.personas
          .filter((p) => p.category === "allied")
          .map((p) => `- **${p.title}** (\`${p.slug}\`)`)
          .join("\n") +
        footer(artifact, artifact.personas[0]?.source_url ?? "")
      );
    case "capabilities-index":
      return (
        `# FinOps Capabilities (${artifact.capabilities.length})\n\n` +
        artifact.domains
          .map(
            (d) =>
              `## ${d.title}\n\n` +
              d.capability_slugs
                .map((s) => {
                  const c = artifact.capabilities.find((x) => x.slug === s);
                  return `- **${c?.title}** (\`${s}\`): ${c?.summary.slice(0, 140)}`;
                })
                .join("\n"),
          )
          .join("\n\n") +
        footer(artifact, artifact.capabilities[0]?.source_url ?? "")
      );
    case "scopes":
      return (
        `# ${artifact.scopes.title}\n\n` +
        `_Scopes are practice-defined segments of technology spend — the ` +
        `framework provides guidance, not a fixed list._\n\n` +
        artifact.scopes.sections
          .map((s) =>
            s.heading === "Overview"
              ? s.body_md
              : `## ${s.heading}\n\n${s.body_md}`,
          )
          .join("\n\n") +
        footer(artifact, artifact.scopes.source_url)
      );
  }
}
