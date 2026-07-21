import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ARTIFACT_FILES } from "./schemas.js";
import type {
  Action,
  Artifact,
  Capability,
  CapabilityRelationship,
  ChangelogEntry,
  Domain,
  Kpi,
  Manifest,
  MaturityExtension,
  MaturityLevel,
  Persona,
  Phase,
  Principle,
  ScopeDoc,
  TechnologyCategory,
} from "./types.js";

export class ArtifactValidationError extends Error {
  constructor(
    readonly file: string,
    readonly detail: string,
  ) {
    super(
      `data artifact invalid: ${file} — ${detail}. ` +
        `Re-run "npm run refresh" or restore data/framework/ from git; ` +
        `the server refuses to start on an invalid artifact.`,
    );
    this.name = "ArtifactValidationError";
  }
}

function readJson(dir: string, rel: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(join(dir, rel), "utf8");
  } catch (err) {
    throw new ArtifactValidationError(rel, `cannot read file (${String(err)})`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new ArtifactValidationError(rel, `not valid JSON (${String(err)})`);
  }
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function buildValidators(): Map<string, ValidateFunction> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const out = new Map<string, ValidateFunction>();
  for (const [rel, schema] of Object.entries(ARTIFACT_FILES)) {
    out.set(rel, ajv.compile(schema));
  }
  return out;
}

/**
 * Load and validate the data artifact. Throws ArtifactValidationError with an
 * actionable message on any schema violation, hash mismatch, or missing file.
 */
export function loadArtifact(dir: string): Artifact {
  const validators = buildValidators();
  const parsed = new Map<string, unknown>();

  for (const rel of Object.keys(ARTIFACT_FILES)) {
    const data = readJson(dir, rel);
    const validate = validators.get(rel) as ValidateFunction;
    if (!validate(data)) {
      const first = validate.errors?.[0];
      throw new ArtifactValidationError(
        rel,
        `schema violation at "${first?.instancePath ?? ""}": ${first?.message ?? "unknown"}`,
      );
    }
    parsed.set(rel, data);
  }

  const manifest = parsed.get("manifest.json") as Manifest;

  // Manifest hashes must match the files on disk (integrity of the seam).
  for (const [rel, expected] of Object.entries(manifest.sha256)) {
    if (rel === "manifest.json") continue;
    const actual = sha256(readFileSync(join(dir, rel), "utf8"));
    if (actual !== expected) {
      throw new ArtifactValidationError(
        rel,
        `sha256 mismatch (manifest ${expected.slice(0, 12)}…, file ${actual.slice(0, 12)}…)`,
      );
    }
  }

  const artifact: Artifact = {
    manifest,
    principles: parsed.get("content/principles.json") as Principle[],
    phases: parsed.get("content/phases.json") as Phase[],
    domains: parsed.get("content/domains.json") as Domain[],
    capabilities: parsed.get("content/capabilities.json") as Capability[],
    personas: parsed.get("content/personas.json") as Persona[],
    scopes: parsed.get("content/scopes.json") as ScopeDoc,
    technology_categories: parsed.get(
      "content/technology-categories.json",
    ) as TechnologyCategory[],
    maturity_levels: parsed.get(
      "content/maturity-levels.json",
    ) as MaturityLevel[],
    maturity_extension: parsed.get(
      "derived/maturity-extension.json",
    ) as MaturityExtension,
    kpis: parsed.get("content/kpis.json") as Kpi[],
    actions: parsed.get("derived/actions.json") as Action[],
    relationships_official: parsed.get(
      "derived/relationships-official.json",
    ) as CapabilityRelationship[],
    relationships_inferred: parsed.get(
      "derived/relationships-inferred.json",
    ) as CapabilityRelationship[],
    changelog: parsed.get("derived/changelog.json") as ChangelogEntry[],
  };

  crossValidate(artifact);
  return artifact;
}

/** Referential checks that JSON Schema alone cannot express. */
function crossValidate(a: Artifact): void {
  const capSlugs = new Set(a.capabilities.map((c) => c.slug));
  for (const d of a.domains) {
    for (const s of d.capability_slugs) {
      if (!capSlugs.has(s)) {
        throw new ArtifactValidationError(
          "content/domains.json",
          `domain "${d.slug}" references unknown capability "${s}"`,
        );
      }
    }
  }
  const domainSlugs = new Set(a.domains.map((d) => d.slug));
  for (const c of a.capabilities) {
    if (!domainSlugs.has(c.domain_slug)) {
      throw new ArtifactValidationError(
        "content/capabilities.json",
        `capability "${c.slug}" references unknown domain "${c.domain_slug}"`,
      );
    }
  }
  for (const edges of [a.relationships_official, a.relationships_inferred]) {
    for (const r of edges) {
      for (const end of [r.from, r.to]) {
        if (!capSlugs.has(end)) {
          throw new ArtifactValidationError(
            "derived/relationships-*.json",
            `relationship ${r.from} -> ${r.to} references unknown capability "${end}"`,
          );
        }
      }
    }
  }
  for (const r of a.relationships_inferred) {
    if (
      r.source !== "inferred" ||
      !r.evidence_quote ||
      !r.heuristic ||
      !r.confidence
    ) {
      throw new ArtifactValidationError(
        "derived/relationships-inferred.json",
        `inferred edge ${r.from} -> ${r.to} must carry source:"inferred", evidence_quote, heuristic, confidence`,
      );
    }
  }
  for (const r of a.relationships_official) {
    if (r.source !== "official" || !r.evidence_url) {
      throw new ArtifactValidationError(
        "derived/relationships-official.json",
        `official edge ${r.from} -> ${r.to} must carry source:"official" and evidence_url`,
      );
    }
  }
}
