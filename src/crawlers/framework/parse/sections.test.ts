import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseDomains,
  parseMaturityModel,
  parsePersonaPage,
  parsePhases,
  parsePrinciples,
  parseScopes,
  parseTechnologyCategories,
} from "./sections.js";

const FIXTURES = join(import.meta.dirname, "../fixtures");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");
const U = "https://www.finops.org/framework/x/";

describe("section page parsers", () => {
  it("parses exactly 6 principles with bullet content", () => {
    const out = parsePrinciples(fixture("principles.html"), U);
    expect(out.map((p) => p.slug)).toHaveLength(6);
    for (const p of out) {
      expect(p.description_md).toMatch(/- /);
      expect(p.license).toBe("CC-BY-4.0");
    }
  });

  it("parses the 3 phases in order", () => {
    const out = parsePhases(fixture("phases.html"), U);
    expect(out.map((p) => p.slug)).toEqual(["inform", "optimize", "operate"]);
    expect(out[0]?.description_md.length).toBeGreaterThan(200);
  });

  it("parses 4 domains covering all 22 capabilities", () => {
    const out = parseDomains(fixture("domains.html"), U);
    expect(out).toHaveLength(4);
    const caps = new Set(out.flatMap((d) => d.capability_slugs));
    expect(caps.size).toBe(22);
    expect(out.every((d) => d.description_md.length > 100)).toBe(true);
  });

  it("parses the 3 official maturity levels with characteristics and sample goals", () => {
    const out = parseMaturityModel(fixture("maturity-model.html"), U);
    expect(out.map((l) => l.slug)).toEqual(["crawl", "walk", "run"]);
    for (const l of out) {
      expect(l.official).toBe(true);
      expect(l.characteristics_md).toMatch(/- /);
      expect(l.sample_goals_md).toMatch(/- /);
    }
  });

  it("parses 5 technology categories", () => {
    const out = parseTechnologyCategories(
      fixture("technology-categories.html"),
      U,
    );
    expect(out.map((t) => t.slug).sort()).toEqual([
      "ai",
      "data-center",
      "data-cloud-platforms",
      "public-cloud",
      "saas",
    ]);
  });

  it("parses Scopes as one conceptual document, never an entity list (critique B3)", () => {
    const out = parseScopes(fixture("scopes.html"), U);
    expect(out.sections.length).toBeGreaterThanOrEqual(5);
    const headings = out.sections.map((s) => s.heading);
    expect(headings.join(" ")).toMatch(/Scopes/);
  });

  it("parses a persona detail page", () => {
    const out = parsePersonaPage(fixture("persona-finance.html"), U, "core");
    expect(out.title).toBe("Finance");
    expect(out.category).toBe("core");
    expect(out.description_md).toMatch(/Objectives/);
    expect(out.description_md).toMatch(/budget/i);
  });
});
