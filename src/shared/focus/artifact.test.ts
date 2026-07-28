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

  it("refuses a missing content file", () => {
    const load = corruptCopy((dir) => {
      rmSync(join(dir, "1.0/attributes.json"));
    });
    expect(load).toThrowError(/cannot read file/);
  });
});
