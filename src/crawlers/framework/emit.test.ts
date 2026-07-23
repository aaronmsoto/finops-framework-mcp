import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type EntityCounts } from "../../shared/index.js";
import { canonicalJson, emitArtifact } from "./emit.js";

const COUNTS: EntityCounts = {
  principles: 1,
  phases: 0,
  domains: 0,
  capabilities: 1,
  personas: 0,
  technology_categories: 0,
  maturity_levels: 0,
  kpis: 0,
};

function payload(defText: string): Map<string, unknown> {
  return new Map<string, unknown>([
    [
      "content/principles.json",
      [
        {
          slug: "p1",
          title: "P1",
          description_md: "d",
          order: 1,
          source_url: "https://www.finops.org/x",
          license: "CC-BY-4.0",
        },
      ],
    ],
    ["content/capabilities.json", [{ slug: "c1", definition_md: defText }]],
  ]);
}

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "emit-test-"));
  dirs.push(d);
  return d;
}
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("canonicalJson", () => {
  it("is key-order independent", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});

describe("emitArtifact idempotence and versioning (critique M15/M16)", () => {
  it("writes 1.0.0 on first emit, does nothing on identical re-emit", () => {
    const dir = tmp();
    const first = emitArtifact(
      dir,
      payload("original"),
      COUNTS,
      undefined,
      [],
      [],
    );
    expect(first.wrote).toBe(true);
    expect(first.dataVersion).toBe("1.0.0");

    const second = emitArtifact(
      dir,
      payload("original"),
      COUNTS,
      undefined,
      [],
      [],
    );
    expect(second.wrote).toBe(false);
    expect(second.dataVersion).toBe("1.0.0");
    expect(second.diff.hasChanges).toBe(false);
  });

  it("bumps patch on content change, minor on entity add", () => {
    const dir = tmp();
    emitArtifact(dir, payload("original"), COUNTS, undefined, [], []);

    const changed = emitArtifact(
      dir,
      payload("edited"),
      COUNTS,
      undefined,
      [],
      [],
    );
    expect(changed.dataVersion).toBe("1.0.1");
    expect(changed.diff.changed).toEqual(["content/capabilities.json#c1"]);

    const withExtra = payload("edited");
    (withExtra.get("content/capabilities.json") as unknown[]).push({
      slug: "c2",
      definition_md: "new",
    });
    const added = emitArtifact(dir, withExtra, COUNTS, undefined, [], []);
    expect(added.dataVersion).toBe("1.1.0");
    expect(added.diff.added).toEqual(["content/capabilities.json#c2"]);
  });

  it("bumps data_version to <schema major>.0.0 on a schema major change (spec §1)", () => {
    const dir = tmp();
    emitArtifact(dir, payload("original"), COUNTS, undefined, [], []);
    const manifestPath = join(dir, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      schema_version: string;
    };
    const [currMajor] = SCHEMA_VERSION.split(".");
    manifest.schema_version = `${Number(currMajor) - 1}.0.0`;
    writeFileSync(manifestPath, JSON.stringify(manifest));

    const result = emitArtifact(
      dir,
      payload("original"),
      COUNTS,
      undefined,
      [],
      [],
    );
    expect(result.dataVersion).toBe(`${currMajor}.0.0`);
  });
});

describe("emitArtifact — markdown payloads (spec §2)", () => {
  function withMarkdown(md: string): Map<string, unknown> {
    const files = payload("original");
    files.set("content/markdown/capabilities/c1.md", md);
    return files;
  }

  it("writes a markdown string verbatim with exactly one trailing newline", () => {
    const dir = tmp();
    emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\n## Summary\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    const written = readFileSync(
      join(dir, "content/markdown/capabilities/c1.md"),
      "utf8",
    );
    expect(written).toBe("---\nkind: capability\n---\n\n## Summary\n");
  });

  it("normalizes multiple trailing newlines to exactly one", () => {
    const dir = tmp();
    emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\nbody\n\n\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    const written = readFileSync(
      join(dir, "content/markdown/capabilities/c1.md"),
      "utf8",
    );
    expect(written.endsWith("body\n")).toBe(true);
    expect(written.endsWith("body\n\n")).toBe(false);
  });

  it("is byte-idempotent: an unchanged markdown doc produces no diff on re-emit", () => {
    const dir = tmp();
    emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\nbody\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    const second = emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\nbody\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    expect(second.wrote).toBe(false);
    expect(second.diff.hasChanges).toBe(false);
  });

  it("diffs a changed markdown doc as a whole file, not per-entity", () => {
    const dir = tmp();
    emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\nbody\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    const changed = emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\nedited\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    expect(changed.diff.changed).toContain(
      "content/markdown/capabilities/c1.md",
    );
  });

  it("hashes markdown files into the manifest sha256 map", () => {
    const dir = tmp();
    emitArtifact(
      dir,
      withMarkdown("---\nkind: capability\n---\n\nbody\n"),
      COUNTS,
      undefined,
      [],
      [],
    );
    const manifest = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    ) as {
      sha256: Record<string, string>;
    };
    expect(manifest.sha256["content/markdown/capabilities/c1.md"]).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});
