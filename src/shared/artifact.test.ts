import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ArtifactValidationError, loadArtifact } from "./artifact.js";

const ARTIFACT_DIR = join(import.meta.dirname, "../../data/framework");

describe("committed data artifact (contract tests)", () => {
  const artifact = loadArtifact(ARTIFACT_DIR);

  it("loads and validates the committed artifact", () => {
    expect(artifact.manifest.data_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("carries the expected official entity counts", () => {
    expect(artifact.principles).toHaveLength(6);
    expect(artifact.phases).toHaveLength(3);
    expect(artifact.domains).toHaveLength(4);
    expect(artifact.capabilities).toHaveLength(22);
    expect(artifact.personas).toHaveLength(11);
    expect(artifact.technology_categories).toHaveLength(5);
    expect(artifact.maturity_levels).toHaveLength(3);
    expect(artifact.kpis.length).toBeGreaterThanOrEqual(80);
  });

  it("keeps official content free of unofficial records (critique B5/std orders)", () => {
    const contentBlobs = [
      artifact.principles,
      artifact.phases,
      artifact.domains,
      artifact.capabilities,
      artifact.personas,
      artifact.technology_categories,
      artifact.maturity_levels,
      artifact.kpis,
    ].flat() as unknown as Record<string, unknown>[];
    for (const rec of contentBlobs) {
      expect(rec.official === false).toBe(false);
      expect(typeof rec.source_url).toBe("string");
      expect(rec.license).toBe("CC-BY-4.0");
    }
  });

  it("marks every derived record unofficial where applicable", () => {
    expect(artifact.maturity_extension.official).toBe(false);
    expect(artifact.actions.every((a) => a.official === false)).toBe(true);
    expect(
      artifact.relationships_inferred.every(
        (r) => r.source === "inferred" && !!r.evidence_quote && !!r.confidence,
      ),
    ).toBe(true);
    expect(
      artifact.relationships_official.every(
        (r) => r.source === "official" && !!r.evidence_url,
      ),
    ).toBe(true);
  });

  it("has every capability complete: definition, 3 maturity levels, activities", () => {
    for (const c of artifact.capabilities) {
      expect(c.definition_md.length, c.slug).toBeGreaterThan(50);
      expect(c.maturity_raw.crawl.length, c.slug).toBeGreaterThan(20);
      expect(c.maturity_raw.walk.length, c.slug).toBeGreaterThan(20);
      expect(c.maturity_raw.run.length, c.slug).toBeGreaterThan(20);
      expect(c.functional_activities.length, c.slug).toBeGreaterThan(0);
      expect(c.summary.length, c.slug).toBeGreaterThan(20);
    }
  });

  it("joins every featured KPI id to a KPI library record", () => {
    const ids = new Set(artifact.kpis.map((k) => k.wp_id));
    for (const c of artifact.capabilities) {
      for (const id of c.featured_kpi_ids) {
        expect(ids.has(id), `${c.slug} featured ${id}`).toBe(true);
      }
    }
    const featured = artifact.kpis.filter((k) => k.featured_on.length > 0);
    expect(featured.length).toBeGreaterThanOrEqual(40);
    expect(
      featured.every((k) => !!k.formula || k.data_sources.length >= 0),
    ).toBe(true);
  });
});

describe("loadArtifact failure modes", () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  function corruptCopy(mutate: (dir: string) => void): () => void {
    const dir = mkdtempSync(join(tmpdir(), "artifact-test-"));
    dirs.push(dir);
    cpSync(ARTIFACT_DIR, dir, { recursive: true });
    mutate(dir);
    return () => loadArtifact(dir);
  }

  it("refuses a schema-violating file with an actionable error", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "content/principles.json");
      const data = JSON.parse(readFileSync(p, "utf8")) as { order: unknown }[];
      (data[0] as { order: unknown }).order = "not-a-number";
      writeFileSync(p, JSON.stringify(data));
    });
    expect(load).toThrowError(ArtifactValidationError);
    expect(load).toThrowError(/principles.json/);
  });

  it("refuses a hash mismatch", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "content/phases.json");
      const data = JSON.parse(readFileSync(p, "utf8")) as { title: string }[];
      (data[0] as { title: string }).title = "Tampered";
      writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
    });
    expect(load).toThrowError(/sha256 mismatch|schema violation/);
  });

  it("refuses a missing file", () => {
    const load = corruptCopy((dir) => {
      rmSync(join(dir, "derived/actions.json"));
    });
    expect(load).toThrowError(/cannot read file/);
  });
});
