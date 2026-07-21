import { describe, expect, it } from "vitest";
import type { Action, Capability } from "../../shared/index.js";
import {
  assertAcyclicPrerequisites,
  inferredRelationships,
  officialRelationships,
} from "./infer.js";

function cap(slug: string, title: string): Capability {
  return {
    slug,
    title,
    wp_id: 1,
    domain_slug: "d",
    summary: "s",
    definition_md: "d",
    headline_groups: [],
    maturity_raw: { crawl: "c", walk: "w", run: "r" },
    functional_activities: [],
    kpi_bullets: [],
    example_kpis: [],
    inputs_outputs_md: "",
    featured_kpi_ids: [],
    source_url: "https://www.finops.org/x",
    license: "CC-BY-4.0",
  };
}

function action(capability_slug: string, text: string): Action {
  return {
    capability_slug,
    maturity: "crawl",
    text,
    ordinal: 1,
    official: false,
    parse_quality: "itemized",
  };
}

describe("inferredRelationships (restrained per critique M14)", () => {
  const caps = [
    cap("allocation", "Allocation"),
    cap("forecasting", "Forecasting"),
  ];

  it("emits informs edges with quoted evidence for plain title mentions", () => {
    const edges = inferredRelationships(caps, [
      action(
        "forecasting",
        "Improve models using Allocation metadata quality.",
      ),
    ]);
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e?.type).toBe("informs");
    expect(e?.from).toBe("allocation");
    expect(e?.to).toBe("forecasting");
    expect(e?.source).toBe("inferred");
    expect(e?.evidence_quote).toMatch(/Allocation metadata/);
    expect(e?.confidence).toBe("weak");
    expect(e?.heuristic).toBe("title-mention");
  });

  it("emits prerequisite only with dependency language, at moderate confidence", () => {
    const edges = inferredRelationships(caps, [
      action(
        "forecasting",
        "Forecast accuracy requires Allocation coverage of spend.",
      ),
    ]);
    expect(edges[0]?.type).toBe("prerequisite");
    expect(edges[0]?.confidence).toBe("moderate");
    expect(edges[0]?.heuristic).toBe("title-mention-dependency-language");
  });

  it("never emits self-edges or unquoted edges", () => {
    const edges = inferredRelationships(caps, [
      action("allocation", "Allocation improves over time."),
    ]);
    expect(edges).toHaveLength(0);
  });
});

describe("assertAcyclicPrerequisites", () => {
  it("throws on a cycle", () => {
    expect(() =>
      assertAcyclicPrerequisites([
        { from: "a", to: "b", type: "prerequisite", source: "inferred" },
        { from: "b", to: "a", type: "prerequisite", source: "inferred" },
      ]),
    ).toThrowError(/cycle/);
  });
  it("accepts a DAG", () => {
    expect(() =>
      assertAcyclicPrerequisites([
        { from: "a", to: "b", type: "prerequisite", source: "inferred" },
        { from: "b", to: "c", type: "prerequisite", source: "inferred" },
      ]),
    ).not.toThrow();
  });
});

describe("officialRelationships", () => {
  it("derives shared-KPI co-links with evidence URLs", () => {
    const edges = officialRelationships(
      [],
      [
        {
          slug: "k",
          title: "K",
          wp_id: 9,
          description_md: "d",
          data_sources: [],
          related_capability_slugs: ["allocation", "reporting-analytics"],
          featured_on: ["allocation"],
          source_url: "https://www.finops.org/kpi/k/",
          license: "CC-BY-4.0",
        },
      ],
      (s) => `https://www.finops.org/framework/capabilities/${s}/`,
    );
    expect(edges).toHaveLength(1);
    expect(edges[0]?.source).toBe("official");
    expect(edges[0]?.evidence_url).toBe("https://www.finops.org/kpi/k/");
  });
});
