import { ARTIFACT_FILES } from "./schemas.js";
import {
  ArtifactValidationError,
  loadArtifactGeneric,
  sha256,
} from "./artifact-loader.js";
import type {
  Action,
  Artifact,
  Capability,
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

export { ArtifactValidationError, sha256 };

const REMEDIATION =
  'Re-run "npm run refresh" or restore data/framework/ from git; ' +
  "the server refuses to start on an invalid artifact.";

/**
 * Load and validate the data artifact. Throws ArtifactValidationError with an
 * actionable message on any schema violation, hash mismatch, or missing file.
 */
export function loadArtifact(dir: string): Artifact {
  return loadArtifactGeneric(dir, {
    files: ARTIFACT_FILES,
    remediation: REMEDIATION,
    crossValidate,
    assemble: (parsed, manifest) => ({
      manifest: manifest as Manifest,
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
      changelog: parsed.get("derived/changelog.json") as ChangelogEntry[],
    }),
  });
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
          REMEDIATION,
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
        REMEDIATION,
      );
    }
  }
}
