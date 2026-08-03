import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadArtifact } from "../../../shared/artifact.js";
import { walkMarkdownFiles } from "../../../shared/markdown/derive.js";
import { deriveArtifactPayload, deriveFromDocs } from "./derive.js";

// Closes the derive-orchestration coverage gap (review R1): deriveFromDocs
// and deriveArtifactPayload were previously exercised only per-entity
// against synthetic fixtures, never end-to-end against the real committed
// markdown corpus. This runs the actual offline `derive` CLI's core against
// data/framework/content/markdown and asserts the result equals the
// committed artifact — the same check a bad regeneration would have to
// survive undetected.
const ARTIFACT_DIR = join(import.meta.dirname, "../../../../data/framework");
const MARKDOWN_DIR = join(ARTIFACT_DIR, "content/markdown");

describe("derive pipeline integration (offline reconstruction, review R1)", () => {
  const derived = deriveArtifactPayload(MARKDOWN_DIR);
  const artifact = loadArtifact(ARTIFACT_DIR);

  it("re-derives every entity byte-identical to the committed artifact", () => {
    expect(derived.entities.principles).toEqual(artifact.principles);
    expect(derived.entities.phases).toEqual(artifact.phases);
    expect(derived.entities.domains).toEqual(artifact.domains);
    expect(derived.entities.capabilities).toEqual(artifact.capabilities);
    expect(derived.entities.personas).toEqual(artifact.personas);
    expect(derived.entities.scopes).toEqual(artifact.scopes);
    expect(derived.entities.technologyCategories).toEqual(
      artifact.technology_categories,
    );
    expect(derived.entities.maturityLevels).toEqual(artifact.maturity_levels);
    expect(derived.entities.kpis).toEqual(artifact.kpis);
    expect(derived.entities.actions).toEqual(artifact.actions);
  });

  it("produces zero parse warnings against the committed markdown", () => {
    expect(derived.warnings).toEqual([]);
  });

  it("matches the committed manifest counts", () => {
    expect(derived.counts).toEqual(artifact.manifest.counts);
  });

  it("is a thin wrapper: deriveArtifactPayload(dir) === deriveFromDocs(walkMarkdownFiles(dir))", () => {
    expect(deriveFromDocs(walkMarkdownFiles(MARKDOWN_DIR))).toEqual(derived);
  });
});
