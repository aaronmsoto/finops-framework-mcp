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
import { sha256 } from "../artifact-loader.js";
import { ArtifactValidationError, loadFocusStore } from "./artifact.js";

const FOCUS_DIR = join(import.meta.dirname, "../../../data/focus");

describe("committed FOCUS data artifact (contract tests)", () => {
  const store = loadFocusStore(FOCUS_DIR);

  it("loads both pinned spec versions", () => {
    expect([...store.versions.keys()].sort()).toEqual(["1.0", "1.2"]);
    expect(store.index.latest).toBe("1.2");
  });

  it("carries the pinned column counts (43 v1.0, 57 v1.2)", () => {
    expect(store.versions.get("1.0")?.columns).toHaveLength(43);
    expect(store.versions.get("1.2")?.columns).toHaveLength(57);
  });

  it("has every column/attribute record source-cited and CC BY licensed", () => {
    for (const artifact of store.versions.values()) {
      for (const rec of [...artifact.columns, ...artifact.attributes]) {
        expect(typeof rec.source_url).toBe("string");
        expect(rec.license).toBe("CC-BY-4.0");
      }
    }
  });

  it("loads non-empty glossary/changelog markdown per version", () => {
    for (const artifact of store.versions.values()) {
      expect(artifact.glossary_md.length).toBeGreaterThan(0);
      expect(artifact.changelog_md.length).toBeGreaterThan(0);
    }
  });

  it("loads the 1.0->1.2 diff, source-cited, matching the pinned 14 added columns", () => {
    expect(store.diff.from).toBe("1.0");
    expect(store.diff.to).toBe("1.2");
    expect(store.diff.added_columns).toHaveLength(14);
    for (const added of store.diff.added_columns) {
      expect(typeof added.source_url).toBe("string");
    }
  });

  it("loads the unofficial KPI mapping, 15-20 entries, every record official:false", () => {
    expect(store.kpiMapping.official).toBe(false);
    expect(store.kpiMapping.kpis.length).toBeGreaterThanOrEqual(15);
    expect(store.kpiMapping.kpis.length).toBeLessThanOrEqual(20);
    for (const entry of store.kpiMapping.kpis) {
      expect(entry.official).toBe(false);
    }
  });

  it("loads the bundled sample manifest: an official 1.0 sample and a synthetic sample per version", () => {
    const byVersion = new Map(
      store.sampleManifest.samples.map((s) => [`${s.version}:${s.kind}`, s]),
    );
    expect(byVersion.get("1.0:official")?.row_count).toBe(1000);
    expect(byVersion.get("1.0:synthetic")).toBeDefined();
    expect(byVersion.get("1.2:synthetic")).toBeDefined();
    expect(byVersion.has("1.2:official")).toBe(false); // no official 1.2 sample exists
    for (const entry of store.sampleManifest.samples) {
      expect(entry.license).toBe("CC-BY-4.0");
      expect(
        store.sampleCsv.get(`${entry.version}:${entry.kind}`)?.length,
      ).toBeGreaterThan(0);
    }
  });
});

describe("loadFocusStore failure modes", () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  function corruptCopy(mutate: (dir: string) => void): () => void {
    const dir = mkdtempSync(join(tmpdir(), "focus-artifact-test-"));
    dirs.push(dir);
    cpSync(FOCUS_DIR, dir, { recursive: true });
    mutate(dir);
    return () => loadFocusStore(dir);
  }

  it("refuses a schema-violating column record", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "1.0/columns.json");
      const data = JSON.parse(readFileSync(p, "utf8")) as { id: unknown }[];
      (data[0] as { id: unknown }).id = 42;
      writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
    });
    expect(load).toThrowError(ArtifactValidationError);
    expect(load).toThrowError(/columns.json/);
  });

  it("refuses a version dir whose manifest hash doesn't match index.json", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "index.json");
      const idx = JSON.parse(readFileSync(p, "utf8")) as {
        versions: { manifest_sha256: string }[];
      };
      idx.versions[0]!.manifest_sha256 = "0".repeat(64);
      writeFileSync(p, `${JSON.stringify(idx, null, 2)}\n`);
    });
    expect(load).toThrowError(/manifest_sha256 mismatch/);
  });

  it("refuses a tampered derived diff file", () => {
    const load = corruptCopy((dir) => {
      const files = readFileSync(join(dir, "index.json"), "utf8");
      const idx = JSON.parse(files) as { derived: Record<string, string> };
      const [filename] = Object.keys(idx.derived);
      const p = join(dir, "derived", filename as string);
      const diff = JSON.parse(readFileSync(p, "utf8")) as { from: string };
      diff.from = "tampered";
      writeFileSync(p, `${JSON.stringify(diff, null, 2)}\n`);
    });
    expect(load).toThrowError(/sha256 mismatch/);
  });

  it("refuses a tampered kpi-mapping.json", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "derived/kpi-mapping.json");
      const mapping = JSON.parse(readFileSync(p, "utf8")) as {
        methodology: string;
      };
      mapping.methodology = "tampered";
      writeFileSync(p, `${JSON.stringify(mapping, null, 2)}\n`);
    });
    expect(load).toThrowError(/sha256 mismatch/);
  });

  it("refuses a kpi-mapping.json entry referencing an unknown column", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "derived/kpi-mapping.json");
      const mapping = JSON.parse(readFileSync(p, "utf8")) as {
        kpis: { columns_by_version: Record<string, string[]> }[];
      };
      mapping.kpis[0]!.columns_by_version["1.2"] = ["NotAColumn"];
      writeFileSync(p, `${JSON.stringify(mapping, null, 2)}\n`);
      const idxPath = join(dir, "index.json");
      const idx = JSON.parse(readFileSync(idxPath, "utf8")) as {
        derived: Record<string, string>;
      };
      idx.derived["kpi-mapping.json"] = sha256(readFileSync(p, "utf8"));
      writeFileSync(idxPath, `${JSON.stringify(idx, null, 2)}\n`);
    });
    expect(load).toThrowError(/unknown column "NotAColumn"/);
  });

  it("refuses a missing content file", () => {
    const load = corruptCopy((dir) => {
      rmSync(join(dir, "1.0/attributes.json"));
    });
    expect(load).toThrowError(/cannot read file/);
  });

  it("refuses a tampered bundled sample CSV", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "samples/1.0/official/focus_sample.csv");
      writeFileSync(p, `${readFileSync(p, "utf8")}tampered\n`);
    });
    expect(load).toThrowError(/sha256 mismatch/);
  });

  it("refuses a samples/manifest.json entry referencing an unknown FOCUS version", () => {
    const load = corruptCopy((dir) => {
      const p = join(dir, "samples/manifest.json");
      const manifest = JSON.parse(readFileSync(p, "utf8")) as {
        samples: { version: string }[];
      };
      manifest.samples[0]!.version = "9.9";
      writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
      const idxPath = join(dir, "index.json");
      const idx = JSON.parse(readFileSync(idxPath, "utf8")) as {
        samples: Record<string, string>;
      };
      idx.samples["manifest.json"] = sha256(readFileSync(p, "utf8"));
      writeFileSync(idxPath, `${JSON.stringify(idx, null, 2)}\n`);
    });
    expect(load).toThrowError(/unknown FOCUS version "9.9"/);
  });
});
