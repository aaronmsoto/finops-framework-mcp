import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCapabilityPage, resolveActivityPersona } from "./capability.js";

const FIXTURES = join(import.meta.dirname, "../fixtures");

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}

const URL = (slug: string) =>
  `https://www.finops.org/framework/capabilities/${slug}/`;

describe("parseCapabilityPage — allocation (canonical shape)", () => {
  const page = parseCapabilityPage(
    fixture("capability-allocation.html"),
    URL("allocation"),
  );

  it("extracts identity and domain breadcrumb", () => {
    expect(page.slug).toBe("allocation");
    expect(page.title).toBe("Allocation");
    expect(page.domain_title).toMatch(/Understand Usage/);
  });

  it("parses all three maturity levels as itemized lists (critique B1)", () => {
    for (const level of ["crawl", "walk", "run"] as const) {
      expect(page.maturity_raw[level].length).toBeGreaterThan(50);
    }
    const itemized = page.actions.filter((a) => a.parse_quality === "itemized");
    expect(itemized.length).toBeGreaterThan(10);
    expect(page.actions.every((a) => a.official === false)).toBe(true);
  });

  it("keeps nested list items linked to their parents", () => {
    const children = page.actions.filter((a) => a.parent_ordinal !== undefined);
    expect(children.length).toBeGreaterThan(0);
    for (const c of children) {
      expect(
        page.actions.some(
          (p) => p.maturity === c.maturity && p.ordinal === c.parent_ordinal,
        ),
      ).toBe(true);
    }
  });

  it("parses headline groups from the page-top callout, not maturity", () => {
    expect(page.headline_groups.length).toBeGreaterThanOrEqual(3);
    expect(page.headline_groups[0]?.items.length).toBeGreaterThan(0);
  });

  it("extracts featured KPI modals with formula and related capabilities", () => {
    expect(page.featured_kpis.length).toBe(3);
    const aai = page.featured_kpis.find((k) => k.wp_id === 25779);
    expect(aai?.title).toMatch(/Allocation Accuracy Index/);
    expect(aai?.formula).toMatch(/Directly Attributed Costs/);
    expect(aai?.data_sources.length).toBeGreaterThan(0);
    expect(aai?.related_capability_slugs).toContain("reporting-analytics");
  });

  it("parses KPI bullets and Examples objective/kpi pairs", () => {
    expect(page.kpi_bullets.length).toBeGreaterThanOrEqual(4);
    expect(page.example_kpis.length).toBeGreaterThanOrEqual(5);
    expect(page.example_kpis[0]).toHaveProperty("objective");
  });

  it("captures per-persona functional activities", () => {
    const kinds = page.functional_activities.map((f) => f.persona.kind);
    expect(kinds).toContain("core");
    expect(kinds).toContain("allied-group");
  });
});

describe("parseCapabilityPage — forecasting (separate KPIs h2, critique B2)", () => {
  const page = parseCapabilityPage(
    fixture("capability-forecasting.html"),
    URL("forecasting"),
  );

  it("finds featured KPI modals even outside the Measures section", () => {
    expect(page.featured_kpis.length).toBeGreaterThanOrEqual(4);
  });

  it("still parses maturity and definition", () => {
    expect(page.definition_md.length).toBeGreaterThan(100);
    expect(page.maturity_raw.run.length).toBeGreaterThan(50);
  });
});

describe("parseCapabilityPage — finops-practice-operations (no featured KPIs)", () => {
  const page = parseCapabilityPage(
    fixture("capability-finops-practice-operations.html"),
    URL("finops-practice-operations"),
  );

  it("yields zero featured KPIs without failing", () => {
    expect(page.featured_kpis.length).toBe(0);
  });

  it('parses the "Inputs and Outputs" heading variant', () => {
    expect(page.inputs_outputs_md.length).toBeGreaterThan(50);
  });
});

describe("parseCapabilityPage — intersecting-disciplines (repeated Maturity h2)", () => {
  const page = parseCapabilityPage(
    fixture("capability-intersecting-disciplines.html"),
    URL("intersecting-disciplines"),
  );

  it("finds levels under the second Maturity Assessment section", () => {
    for (const level of ["crawl", "walk", "run"] as const) {
      expect(page.maturity_raw[level].length).toBeGreaterThan(50);
    }
  });
});

describe("parseCapabilityPage — sustainability (h3-style page-top callout)", () => {
  const page = parseCapabilityPage(
    fixture("capability-sustainability.html"),
    URL("sustainability"),
  );

  it("captures headline groups labeled with h3 (critique-2 B3')", () => {
    expect(page.headline_groups.length).toBeGreaterThanOrEqual(2);
    expect(page.headline_groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it("never pollutes headline groups with persona role-play blocks", () => {
    expect(
      page.headline_groups.some((g) => /^as someone in/i.test(g.label)),
    ).toBe(false);
  });
});

describe("parseCapabilityPage — executive-strategy-alignment (Measure(s) heading)", () => {
  const page = parseCapabilityPage(
    fixture("capability-executive-strategy-alignment.html"),
    URL("executive-strategy-alignment"),
  );

  it('parses bullets under the "Measure(s) of Success & KPIs" variant (critique-2 B4\')', () => {
    expect(page.kpi_bullets.length).toBeGreaterThanOrEqual(10);
  });

  it("keeps persona blocks out of headline groups and maps Executive→leadership", () => {
    expect(
      page.headline_groups.some((g) => /^as someone in/i.test(g.label)),
    ).toBe(false);
    expect(
      page.functional_activities.some(
        (f) =>
          f.persona.kind === "core" && f.persona.persona_slug === "leadership",
      ),
    ).toBe(true);
  });
});

describe("resolveActivityPersona", () => {
  it("maps plain core persona headings", () => {
    expect(resolveActivityPersona("FinOps Practitioner")).toEqual({
      kind: "core",
      persona_slug: "finops-practitioner",
    });
  });
  it('maps "As someone in a/an X role" phrasing, including Executive→leadership', () => {
    expect(
      resolveActivityPersona("As someone in a Finance role, I will…"),
    ).toEqual({
      kind: "core",
      persona_slug: "finance",
    });
    expect(
      resolveActivityPersona("As someone in an Executive role, I will…"),
    ).toEqual({
      kind: "core",
      persona_slug: "leadership",
    });
  });
  it("maps individually named allied personas", () => {
    expect(resolveActivityPersona("ITAM")).toEqual({
      kind: "allied",
      persona_slug: "itam",
    });
    expect(resolveActivityPersona("Sustainability")).toEqual({
      kind: "allied",
      persona_slug: "sustainability",
    });
  });
  it("maps the group bucket and flags unknowns", () => {
    expect(resolveActivityPersona("Allied Personas")).toEqual({
      kind: "allied-group",
    });
    expect(resolveActivityPersona("Random Heading").kind).toBe("unknown");
  });
});
