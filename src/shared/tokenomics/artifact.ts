// Loads the Tokenomics Foundation artifact (data/tokenomics/) through the
// generic artifact seam: ajv validation of every JSON file, manifest sha256
// integrity over every file (JSON and canonical markdown), then the
// referential checks JSON Schema cannot express.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ArtifactValidationError,
  loadArtifactGeneric,
} from "../artifact-loader.js";
import { TOKENOMICS_ARTIFACT_FILES } from "./schemas.js";
import type {
  TkBigT,
  TkCacheProvider,
  TkChangelogEntry,
  TkCrossLink,
  TkCrosswalkEntry,
  TkDocument,
  TkFocusTrackerItem,
  TkGlossaryTerm,
  TkLayer,
  TkLever,
  TkManifest,
  TkMetric,
  TkPersona,
  TkStage,
  TkValue,
} from "./types.js";

export { ArtifactValidationError };

export interface TokenomicsArtifact {
  manifest: TkManifest;
  documents: TkDocument[];
  /** Canonical markdown body per document slug (front-matter stripped). */
  documentBodies: Map<string, string>;
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
  crosslinks: TkCrossLink[];
  crosswalk: TkCrosswalkEntry[];
  changelog: TkChangelogEntry[];
}

const REMEDIATION =
  'Re-run "node dist/crawlers/tokenomics/cli.js derive" (offline) or restore ' +
  "data/tokenomics/ from git; the server refuses to start on an invalid artifact.";

export function documentMarkdownPath(slug: string): string {
  return `content/markdown/documents/${slug}.md`;
}

function stripFrontmatter(text: string): string {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 4);
  return end < 0 ? text : text.slice(end + 5).replace(/^\n+/, "");
}

function fail(file: string, detail: string): never {
  throw new ArtifactValidationError(file, detail, REMEDIATION);
}

function crossValidate(a: TokenomicsArtifact): void {
  const docSlugs = new Set(a.documents.map((d) => d.slug));
  const sectionIds = new Map(
    a.documents.map((d) => [d.slug, new Set(d.sections.map((s) => s.id))]),
  );
  const checkProv = (
    file: string,
    slug: string,
    p: { document: string; section: string | null },
  ) => {
    if (!docSlugs.has(p.document)) {
      fail(file, `${slug} cites unknown document "${p.document}"`);
    }
    if (p.section !== null && !sectionIds.get(p.document)?.has(p.section)) {
      fail(file, `${slug} cites unknown section "${p.document}#${p.section}"`);
    }
  };
  for (const d of a.documents) {
    if (!a.documentBodies.has(d.slug)) {
      fail(documentMarkdownPath(d.slug), "document markdown missing");
    }
  }
  const groups: [
    string,
    { slug: string; provenance: TkLever["provenance"] }[],
  ][] = [
    ["content/stages.json", a.stages],
    ["content/layers.json", a.layers],
    ["content/bigt.json", a.bigt.classes],
    ["content/levers.json", a.levers],
    ["content/metrics.json", a.metrics],
    ["content/personas.json", a.personas],
    ["content/value.json", a.value.categories],
    ["content/value.json", a.value.booking_destinations],
    ["content/glossary.json", a.glossary],
    ["content/focus-tracker.json", a.focusTracker],
    ["content/cache-providers.json", a.cacheProviders],
  ];
  for (const [file, records] of groups) {
    const seen = new Set<string>();
    for (const r of records) {
      if (seen.has(r.slug)) fail(file, `duplicate slug "${r.slug}"`);
      seen.add(r.slug);
      checkProv(file, r.slug, r.provenance);
    }
  }
  const layerNumbers = new Set(a.layers.map((l) => l.number));
  const classSlugs = new Set(a.bigt.classes.map((c) => c.slug));
  for (const l of a.levers) {
    if (l.layer !== null && !layerNumbers.has(l.layer)) {
      fail("content/levers.json", `${l.slug} cites unknown layer ${l.layer}`);
    }
    for (const c of l.bigt_classes) {
      if (!classSlugs.has(c)) {
        fail(
          "content/levers.json",
          `${l.slug} cites unknown Big-T class "${c}"`,
        );
      }
    }
  }
  const stageSlugs = new Set(a.stages.map((s) => s.slug));
  for (const p of a.personas) {
    for (const s of p.stages) {
      if (s !== "spans" && !stageSlugs.has(s)) {
        fail("content/personas.json", `${p.slug} cites unknown stage "${s}"`);
      }
    }
  }
  const slugsByType: Record<string, Set<string>> = {
    document: docSlugs,
    stage: stageSlugs,
    layer: new Set(a.layers.map((l) => l.slug)),
    "bigt-class": classSlugs,
    lever: new Set(a.levers.map((l) => l.slug)),
    metric: new Set(a.metrics.map((m) => m.slug)),
    persona: new Set(a.personas.map((p) => p.slug)),
    "value-category": new Set(a.value.categories.map((c) => c.slug)),
    "glossary-term": new Set(a.glossary.map((g) => g.slug)),
    "focus-item": new Set(a.focusTracker.map((f) => f.slug)),
  };
  const checkFrom = (file: string, from: { type: string; slug: string }) => {
    if (!slugsByType[from.type]?.has(from.slug)) {
      fail(file, `link source ${from.type}:${from.slug} does not exist`);
    }
  };
  for (const l of a.crosslinks) {
    checkFrom("derived/crosslinks.json", l.from);
    if (!docSlugs.has(l.document)) {
      fail("derived/crosslinks.json", `unknown document "${l.document}"`);
    }
  }
  for (const c of a.crosswalk) checkFrom("derived/crosswalk.json", c.from);
}

/** Load + validate data/tokenomics/. Throws ArtifactValidationError. */
export function loadTokenomicsArtifact(dir: string): TokenomicsArtifact {
  return loadArtifactGeneric(dir, {
    files: TOKENOMICS_ARTIFACT_FILES,
    remediation: REMEDIATION,
    assemble: (parsed, manifest) => {
      const documents = parsed.get("content/documents.json") as TkDocument[];
      const documentBodies = new Map<string, string>();
      for (const d of documents) {
        const rel = documentMarkdownPath(d.slug);
        if (!(rel in manifest.sha256)) {
          fail(rel, "document markdown is not covered by the manifest");
        }
        let text: string;
        try {
          text = readFileSync(join(dir, rel), "utf8");
        } catch (e) {
          fail(rel, `cannot read file (${String(e)})`);
        }
        documentBodies.set(d.slug, stripFrontmatter(text));
      }
      return {
        manifest: manifest as TkManifest,
        documents,
        documentBodies,
        stages: parsed.get("content/stages.json") as TkStage[],
        layers: parsed.get("content/layers.json") as TkLayer[],
        bigt: parsed.get("content/bigt.json") as TkBigT,
        levers: parsed.get("content/levers.json") as TkLever[],
        metrics: parsed.get("content/metrics.json") as TkMetric[],
        personas: parsed.get("content/personas.json") as TkPersona[],
        value: parsed.get("content/value.json") as TkValue,
        glossary: parsed.get("content/glossary.json") as TkGlossaryTerm[],
        focusTracker: parsed.get(
          "content/focus-tracker.json",
        ) as TkFocusTrackerItem[],
        cacheProviders: parsed.get(
          "content/cache-providers.json",
        ) as TkCacheProvider[],
        crosslinks: parsed.get("derived/crosslinks.json") as TkCrossLink[],
        crosswalk: parsed.get("derived/crosswalk.json") as TkCrosswalkEntry[],
        changelog: parsed.get("derived/changelog.json") as TkChangelogEntry[],
      };
    },
    crossValidate,
  });
}
