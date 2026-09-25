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
import { ArtifactValidationError, loadTokenomicsArtifact } from "./artifact.js";

const DATA = join(import.meta.dirname, "../../../data/tokenomics");
const tmp: string[] = [];
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

function copy(): string {
  const d = mkdtempSync(join(tmpdir(), "tk-art-"));
  tmp.push(d);
  cpSync(DATA, d, { recursive: true });
  return d;
}

/** Rewrite a JSON file and re-seal its manifest hash so only crossValidate can catch it. */
function mutate(dir: string, rel: string, fn: (v: unknown) => unknown): void {
  const text = `${JSON.stringify(fn(JSON.parse(readFileSync(join(dir, rel), "utf8"))), null, 2)}\n`;
  writeFileSync(join(dir, rel), text);
  const m = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
    sha256: Record<string, string>;
  };
  m.sha256[rel] = sha256(text);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2));
}

describe("loadTokenomicsArtifact", () => {
  it("loads the committed artifact with document bodies", () => {
    const a = loadTokenomicsArtifact(DATA);
    expect(a.documents).toHaveLength(12);
    expect(a.documentBodies.get("cache-explainer")).toMatch(/^# /);
    expect(a.crosslinks.every((l) => l.official)).toBe(true);
    expect(a.crosswalk.every((c) => !c.official)).toBe(true);
  });

  it("rejects a tampered document (sha256 mismatch)", () => {
    const d = copy();
    const rel = "content/markdown/documents/cache-explainer.md";
    writeFileSync(
      join(d, rel),
      `${readFileSync(join(d, rel), "utf8")}\ntampered\n`,
    );
    expect(() => loadTokenomicsArtifact(d)).toThrow(/sha256 mismatch/);
  });

  it("rejects dangling references the schema cannot see", () => {
    const cases: [string, (v: unknown) => unknown, RegExp][] = [
      [
        "content/levers.json",
        (v) =>
          (v as { layer: number | null }[]).map((l, i) =>
            i === 0 ? { ...l, layer: 9 } : l,
          ),
        /unknown layer/,
      ],
      [
        "content/levers.json",
        (v) =>
          (v as { bigt_classes: string[] }[]).map((l, i) =>
            i === 0 ? { ...l, bigt_classes: ["t-x"] } : l,
          ),
        /Big-T class/,
      ],
      [
        "content/metrics.json",
        (v) =>
          (v as { provenance: object }[]).map((m, i) =>
            i === 0
              ? { ...m, provenance: { ...m.provenance, section: "nope" } }
              : m,
          ),
        /unknown section/,
      ],
      [
        "content/metrics.json",
        (v) =>
          (v as { provenance: object }[]).map((m, i) =>
            i === 0
              ? { ...m, provenance: { ...m.provenance, document: "nope" } }
              : m,
          ),
        /unknown document/,
      ],
      [
        "content/metrics.json",
        (v) => [...(v as unknown[]), (v as unknown[])[0]],
        /duplicate slug/,
      ],
      [
        "content/personas.json",
        (v) =>
          (v as { stages: string[] }[]).map((p, i) =>
            i === 0 ? { ...p, stages: ["nope"] } : p,
          ),
        /unknown stage/,
      ],
      [
        "derived/crosslinks.json",
        (v) =>
          (v as { from: object }[]).map((l, i) =>
            i === 0 ? { ...l, from: { type: "metric", slug: "nope" } } : l,
          ),
        /does not exist/,
      ],
      [
        "derived/crosslinks.json",
        (v) =>
          (v as object[]).map((l, i) =>
            i === 0 ? { ...l, document: "nope" } : l,
          ),
        /unknown document/,
      ],
      [
        "derived/crosswalk.json",
        (v) =>
          (v as { from: object }[]).map((l, i) =>
            i === 0 ? { ...l, from: { type: "lever", slug: "nope" } } : l,
          ),
        /does not exist/,
      ],
    ];
    for (const [rel, fn, re] of cases) {
      const d = copy();
      mutate(d, rel, fn);
      expect(() => loadTokenomicsArtifact(d), `${rel} ${re}`).toThrow(re);
    }
  });

  it("rejects a document missing from the manifest", () => {
    const d = copy();
    const m = JSON.parse(readFileSync(join(d, "manifest.json"), "utf8")) as {
      sha256: Record<string, string>;
    };
    delete m.sha256["content/markdown/documents/routing-wars.md"];
    writeFileSync(join(d, "manifest.json"), JSON.stringify(m));
    expect(() => loadTokenomicsArtifact(d)).toThrow(ArtifactValidationError);
  });
});
