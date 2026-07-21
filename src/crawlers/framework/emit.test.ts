import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { EntityCounts } from "../../shared/index.js";
import { canonicalJson, diffArtifact, emitArtifact } from "./emit.js";

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

  it("diffArtifact keys relationships stably regardless of property order", () => {
    const dir = tmp();
    const rel = {
      from: "a",
      to: "b",
      type: "related",
      source: "official",
      evidence_url: "https://www.finops.org/x",
    };
    const files = new Map<string, unknown>([
      ["derived/relationships-official.json", [rel]],
    ]);
    emitArtifact(dir, files, COUNTS, undefined, [], []);
    // Same edge, different key insertion order.
    const reordered = {
      evidence_url: "https://www.finops.org/x",
      source: "official",
      type: "related",
      to: "b",
      from: "a",
    };
    const diff = diffArtifact(
      dir,
      new Map<string, unknown>([
        ["derived/relationships-official.json", [reordered]],
      ]),
    );
    expect(diff.hasChanges).toBe(false);
  });
});
