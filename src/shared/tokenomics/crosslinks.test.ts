import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadTokenomicsArtifact } from "./artifact.js";

// Cross-server integrity: every stated link and crosswalk target must exist
// in the committed framework / FOCUS artifacts, and every link's evidence
// must be quotable from its source document. The servers never import each
// other; this test is the contract (same approach as the FOCUS KPI mapping).

const ROOT = join(import.meta.dirname, "../../..");
const a = loadTokenomicsArtifact(join(ROOT, "data/tokenomics"));
const read = <T>(rel: string) =>
  JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as T;
const slugs = (rel: string) =>
  new Set(read<{ slug: string }[]>(rel).map((x) => x.slug));
const framework: Record<string, Set<string>> = {
  capability: slugs("data/framework/content/capabilities.json"),
  persona: slugs("data/framework/content/personas.json"),
  kpi: slugs("data/framework/content/kpis.json"),
};
const focusAttrs = new Map(
  read<{ id: string; slug: string }[]>("data/focus/1.2/attributes.json").map(
    (c) => [c.id, c.slug],
  ),
);
const focus = new Map(
  read<{ id: string; slug: string }[]>("data/focus/1.2/columns.json").map(
    (c) => [c.id, c.slug],
  ),
);
const flat = (s: string) =>
  s
    .replace(/\*\*|`|\*/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");

describe("cross-server links", () => {
  const targets = [
    ...a.crosslinks.map((l) => l.target),
    ...a.crosswalk.map((c) => c.target),
  ];

  it("framework targets exist and use the framework's URI contract", () => {
    for (const t of targets.filter((x) => x.server === "framework")) {
      expect(framework[t.kind]?.has(t.id), `${t.kind}:${t.id}`).toBe(true);
      const seg = {
        capability: "capabilities",
        persona: "personas",
        kpi: "kpis",
      }[t.kind];
      expect(t.uri).toBe(`finops://framework/${seg}/${t.id}`);
    }
  });

  it("FOCUS column targets exist in 1.2; working-draft ids do not and have no URI", () => {
    for (const t of targets.filter((x) => x.server === "focus")) {
      if (t.kind === "attribute") {
        expect(focusAttrs.has(t.id), t.id).toBe(true);
        expect(t.uri).toBe(
          `focus://spec/1.2/attributes/${focusAttrs.get(t.id)}`,
        );
      } else {
        expect(focus.has(t.id), t.id).toBe(true);
        expect(t.uri).toBe(`focus://spec/1.2/columns/${focus.get(t.id)}`);
      }
    }
    for (const t of targets.filter((x) => x.server === "focus-working-draft")) {
      expect(focus.has(t.id) || focusAttrs.has(t.id), t.id).toBe(false);
      expect(t.uri).toBeNull();
    }
  });

  it("every stated link's evidence appears verbatim in its source document", () => {
    for (const l of a.crosslinks) {
      const body = flat(a.documentBodies.get(l.document) ?? "");
      expect(body.includes(l.evidence), `${l.document}: ${l.evidence}`).toBe(
        true,
      );
    }
  });

  it("covers both companion servers", () => {
    const servers = new Set(a.crosslinks.map((l) => l.target.server));
    expect(servers).toEqual(
      new Set(["framework", "focus", "focus-working-draft"]),
    );
  });
});
