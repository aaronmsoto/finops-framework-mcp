import { ccByFooter } from "../../shared/footer.js";
import type { TokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import type {
  TkBigTClass,
  TkCrossLink,
  TkCrosswalkEntry,
  TkDocument,
  TkLayer,
  TkLever,
  TkMetric,
  TkPersona,
  TkProvenance,
} from "../../shared/tokenomics/types.js";
import { URI } from "./uris.js";

// One renderer per entity, shared by tools, resources, and prompts so the
// surfaces cannot drift. Every content-bearing output carries the source
// document's status line (Working Draft / Release Candidate …) and the
// CC BY 4.0 attribution footer.

export const PACKAGE_NAME = "tokenomics-overview-mcp";
export const LICENSE_HOLDER =
  "Tokenomics Foundation (a Series of LF Projects, LLC)";

export const CROSSWALK_BANNER =
  "UNOFFICIAL: curated crosswalk entries are this server's own mappings; no Tokenomics Foundation page states them.";
export const CURRICULUM_BANNER =
  "UNOFFICIAL: cert-prep curriculum (the maintainer's own training material, loaded from a local overlay). Not Tokenomics Foundation content.";

export function footer(a: TokenomicsArtifact, sourceUrl: string): string {
  return ccByFooter({
    sourceUrl,
    licenseHolder: LICENSE_HOLDER,
    packageName: PACKAGE_NAME,
    dataVersion: a.manifest.data_version,
    crawledAt: a.manifest.crawled_at,
  });
}

export function docBySlug(a: TokenomicsArtifact, slug: string): TkDocument {
  const d = a.documents.find((x) => x.slug === slug);
  if (!d) throw new Error(`unknown document ${slug}`);
  return d;
}

export function statusLine(d: TkDocument): string {
  const date = d.status_date ? ` (${d.status_date})` : "";
  const src =
    d.status_source === "registry" ? " — no label on the page itself" : "";
  return `Source status: **${d.status}**${date}${src} · “${d.title}”`;
}

export function provenanceLine(a: TokenomicsArtifact, p: TkProvenance): string {
  const d = docBySlug(a, p.document);
  const anchor = p.section ? `#${p.section}` : "";
  return `${statusLine(d)} · section \`${p.document}${anchor}\``;
}

function withFooter(a: TokenomicsArtifact, body: string, p: TkProvenance) {
  return `${body}\n\n_${provenanceLine(a, p)}_${footer(a, p.source_url)}`;
}

export function documentMd(
  a: TokenomicsArtifact,
  d: TkDocument,
  section?: string,
): string {
  const body = a.documentBodies.get(d.slug) ?? "";
  let text = body;
  if (section) {
    const parts = body.split(/\n(?=## )/);
    const hit = parts.find((p) => p.includes(`{section=${section}}`));
    text = hit ?? "";
  }
  return `_${statusLine(d)}_\n\n${text.trim()}${footer(a, d.url)}`;
}

export function layerMd(
  a: TokenomicsArtifact,
  l: TkLayer,
  levers: TkLever[],
): string {
  const parts = [
    `# L${l.number} ${l.name}`,
    `**Moves the multiplier?** ${l.multiplier_effect}  \n**Key metric:** ${l.key_metric}  \n**Primary levers:** ${l.primary_levers.join("; ")}`,
    l.description_md,
  ];
  if (l.components.length) {
    parts.push(
      `## Components\n\n` +
        l.components
          .map((c) => `- **${c.name}**: ${c.items.join(", ")}`)
          .join("\n"),
    );
  }
  if (l.tooling_md) parts.push(`## Tooling (as published)\n\n${l.tooling_md}`);
  if (levers.length) {
    parts.push(
      `## Levers at this layer\n\n` +
        levers.map((x) => `- ${x.name} (\`${x.slug}\`)`).join("\n"),
    );
  }
  return withFooter(a, parts.join("\n\n"), l.provenance);
}

export function bigtClassMd(
  a: TokenomicsArtifact,
  c: TkBigTClass,
  levers: TkLever[],
  layers: TkLayer[],
): string {
  const parts = [
    `# ${c.notation} — ${c.name}`,
    c.description,
    `**Fix:** ${c.fix}`,
  ];
  if (layers.length) {
    parts.push(
      `**Layers that move this class (Five-Layer Stack summary table):** ` +
        layers
          .map((l) => `L${l.number} ${l.name} (${l.multiplier_effect})`)
          .join("; "),
    );
  }
  if (levers.length) {
    parts.push(
      `## Levers tagged with this class\n\n` +
        levers
          .map((x) => `- ${x.name}${x.effect ? ` — ${x.effect}` : ""}`)
          .join("\n"),
    );
  }
  return withFooter(a, parts.join("\n\n"), c.provenance);
}

export function bigtLadderMd(a: TokenomicsArtifact): string {
  const b = a.bigt;
  const parts = [
    `# Big-T notation: ${b.notation}`,
    `${b.notation} = ${b.expansion}`,
    `## Variables\n\n` +
      b.variables
        .map((v) => `- **${v.symbol}** — ${v.name}: ${v.description}`)
        .join("\n"),
    `## The complexity ladder\n\n| Class | Name | Fix |\n| --- | --- | --- |\n` +
      b.classes
        .map((c) => `| \`${c.notation}\` | ${c.name} | ${c.fix} |`)
        .join("\n"),
  ];
  const first = b.classes[0];
  return first
    ? withFooter(a, parts.join("\n\n"), first.provenance)
    : parts.join("\n\n");
}

export function leverMd(a: TokenomicsArtifact, l: TkLever): string {
  const meta = [
    `kind: ${l.kind}`,
    l.layer !== null ? `layer: L${l.layer}` : null,
    l.bigt_classes.length ? `Big-T: ${l.bigt_classes.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const parts = [`# ${l.name}`, meta, l.description_md];
  if (l.effect) parts.push(`**Effect (as published):** ${l.effect}`);
  return withFooter(a, parts.join("\n\n"), l.provenance);
}

/** A ratified FOCUS column cited from the 1.5 status page: the page is
 * describing work that extends the column, not what 1.2 already carries. */
function targetNote(l: TkCrossLink): string {
  if (l.target.uri === null) {
    return " (FOCUS working draft, not in any ratified release yet)";
  }
  const note =
    l.target.server === "focus" && l.document === "focus-1-5-for-ai"
      ? " — ratified 1.2 column; the FOCUS 1.5 work quoted here is not in it yet"
      : "";
  return ` (\`${l.target.uri}\`)${note}`;
}

export function linksMd(
  links: TkCrossLink[],
  crosswalk: TkCrosswalkEntry[],
  opts: { showSource?: boolean } = {},
): string {
  const parts: string[] = [];
  if (links.length) {
    parts.push(
      `## Stated cross-links\n\n` +
        links
          .map(
            (l) =>
              `- ${opts.showSource ? `${l.from.type} \`${l.from.slug}\` ` : ""}→ ${l.target.server} ${l.target.kind} **${l.target.id}**${targetNote(l)} — evidence: “${l.evidence}” (${l.document})`,
          )
          .join("\n"),
    );
  }
  if (crosswalk.length) {
    parts.push(
      `## Curated crosswalk (unofficial)\n\n_${CROSSWALK_BANNER}_\n\n` +
        crosswalk
          .map(
            (c) =>
              `- → ${c.target.server} ${c.target.kind} **${c.target.id}**${c.target.uri ? ` (\`${c.target.uri}\`)` : ""} — ${c.rationale}`,
          )
          .join("\n"),
    );
  }
  return parts.join("\n\n");
}

export function metricMd(
  a: TokenomicsArtifact,
  m: TkMetric,
  links: TkCrossLink[],
  crosswalk: TkCrosswalkEntry[],
): string {
  const parts = [`# ${m.name}`];
  if (m.formula) parts.push("```\n" + m.formula + "\n```");
  if (m.formula_text) parts.push(`Stated as: “${m.formula_text}”`);
  parts.push(m.definition_md);
  if (m.inputs.length) parts.push(`**Inputs:** ${m.inputs.join(", ")}`);
  if (m.targets.length) {
    parts.push(
      `## What good looks like\n\n` + m.targets.map((t) => `- ${t}`).join("\n"),
    );
  }
  const lm = linksMd(links, crosswalk);
  if (lm) parts.push(lm);
  return withFooter(a, parts.join("\n\n"), m.provenance);
}

export function personaMd(
  a: TokenomicsArtifact,
  p: TkPersona,
  links: TkCrossLink[],
  crosswalk: TkCrosswalkEntry[],
): string {
  const parts = [
    `# ${p.name}${p.core ? "" : " (allied persona)"}`,
    p.stages.length ? `Stages: ${p.stages.join(", ")}` : "",
    `**Core responsibility:** ${p.responsibility}`,
    p.description_md,
  ];
  if (p.signals.length) {
    parts.push(
      `## Signals and metrics\n\n` + p.signals.map((s) => `- ${s}`).join("\n"),
    );
  }
  const lm = linksMd(links, crosswalk);
  if (lm) parts.push(lm);
  return withFooter(a, parts.filter(Boolean).join("\n\n"), p.provenance);
}

export function glossaryMd(a: TokenomicsArtifact): string {
  const byDoc = new Map<string, string[]>();
  for (const g of a.glossary) {
    const list = byDoc.get(g.provenance.document) ?? [];
    list.push(`- **${g.term}**: ${g.definition}`);
    byDoc.set(g.provenance.document, list);
  }
  const parts = ["# Tokenomics glossary"];
  for (const [slug, lines] of byDoc) {
    parts.push(
      `## From ${docBySlug(a, slug).title}\n\n_${statusLine(docBySlug(a, slug))}_\n\n${lines.join("\n")}`,
    );
  }
  return parts.join("\n\n") + footer(a, docBySlug(a, "what-is-tokenomics").url);
}

export function focusTrackerMd(a: TokenomicsArtifact): string {
  const d = docBySlug(a, "focus-1-5-for-ai");
  const labels: Record<string, string> = {
    done: "In the working draft (merged)",
    flight: "In review",
    consider: "Started, not yet certain",
    out: "Not in 1.5",
  };
  const parts = [`# ${d.title}`, `_${statusLine(d)}_`];
  for (const bucket of ["done", "flight", "consider", "out"]) {
    const items = a.focusTracker.filter((f) => f.bucket === bucket);
    if (!items.length) continue;
    parts.push(
      `## ${labels[bucket]}\n\n` +
        items
          .map(
            (f) =>
              `- **${f.title}** [${f.labels.join(", ")}]${f.identifiers.length ? ` — ${f.identifiers.map((i) => `\`${i}\``).join(", ")}` : ""}`,
          )
          .join("\n"),
    );
  }
  return parts.join("\n\n") + footer(a, d.url);
}

export function startMd(
  a: TokenomicsArtifact,
  opts: { experimental: boolean; curriculum: boolean },
): string {
  const lines = [
    "# Tokenomics Overview MCP",
    "Grounded AI tokenomics guidance from the Tokenomics Foundation (tokeneconomics.com): the Five-Layer Stack, Big-T notation, prompt-caching mechanics and metrics, consumption levers, personas, value classification, and the FOCUS 1.5 AI tracker.",
    "Most sources are Working Drafts or Release Candidates. Every answer states the status; do not present them as ratified standards.",
    "## Documents",
    a.documents
      .map(
        (d) =>
          `- [${d.title}](${URI.document(d.slug)}) — ${d.status}${d.status_date ? ` (${d.status_date})` : ""}`,
      )
      .join("\n"),
    "## Start here",
    "- `get_bigt_notation` → classify a workload; `get_bigt_class` for the fix.",
    "- `list_layers` / `get_layer` → where each lever sits in the stack.",
    "- `get_metric cache-hit-rate` and `calculate_cache_metrics` → measure prompt caching.",
    "- `get_crosslinks` → hop to the FinOps Framework (finops://) and FOCUS (focus://) servers.",
  ];
  if (opts.experimental) {
    lines.push(
      `Experimental mode is on: \`get_crosswalk\` serves curated, unofficial mappings.` +
        (opts.curriculum
          ? " A local cert-prep curriculum overlay is loaded (unofficial)."
          : ""),
    );
  }
  return lines.join("\n\n") + footer(a, "https://www.tokeneconomics.com/");
}
