import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseCapabilityPage,
  type ParsedCapabilityPage,
} from "../parse/capability.js";
import {
  ComposeError,
  composeCapabilityMd,
  composeDomainsMd,
  composeKpiMd,
  composeMaturityModelMd,
  composePersonaMd,
  composePhasesMd,
  composePrinciplesMd,
  composeScopesMd,
  composeTechnologyCategoriesMd,
  type CapabilityRef,
} from "./compose.js";

const FIXTURES = join(import.meta.dirname, "../fixtures");

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}

const url = (slug: string) =>
  `https://www.finops.org/framework/capabilities/${slug}/`;

function parse(fixtureName: string, slug: string): ParsedCapabilityPage {
  return parseCapabilityPage(fixture(fixtureName), url(slug));
}

const NO_REFS = new Map<string, CapabilityRef>();

const META = {
  wpId: 100,
  domainSlug: "understand-usage",
  sourceUrl: url("allocation"),
  license: "CC-BY-4.0",
};

describe.each([
  ["capability-allocation.html", "allocation"],
  ["capability-forecasting.html", "forecasting"],
  ["capability-finops-practice-operations.html", "finops-practice-operations"],
  [
    "capability-executive-strategy-alignment.html",
    "executive-strategy-alignment",
  ],
  ["capability-sustainability.html", "sustainability"],
])("composeCapabilityMd — %s", (fixtureName, slug) => {
  const page = parse(fixtureName, slug);
  const md = composeCapabilityMd(
    page,
    { ...META, sourceUrl: url(slug) },
    NO_REFS,
  );

  it("opens with a front-matter fence and sorted keys", () => {
    expect(md.startsWith("---\n")).toBe(true);
    const fenceEnd = md.indexOf("\n---\n", 4);
    const keys = md
      .slice(4, fenceEnd)
      .split("\n")
      .map((line) => line.split(": ")[0] as string);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
    expect(keys).toContain("kind");
    expect(keys).toContain("slug");
    expect(keys).toContain("wp_id");
    expect(keys).toContain("domain");
  });

  it("carries kind=capability, the slug, and the title in front-matter", () => {
    expect(md).toContain("kind: capability");
    expect(md).toContain(`slug: ${page.slug}`);
    expect(md).toContain(`title: ${page.title}`);
  });

  it("ends with exactly one trailing newline", () => {
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });

  it("renders Definition verbatim under a canonical heading", () => {
    expect(md).toContain("## Definition");
    expect(md).toContain(page.definition_md);
  });

  it("renders all three maturity levels as ### subheadings", () => {
    expect(md).toContain("## Maturity Assessment");
    for (const level of ["Crawl", "Walk", "Run"]) {
      expect(md).toContain(`### ${level}`);
    }
    expect(md).toContain(page.maturity_raw.crawl);
    expect(md).toContain(page.maturity_raw.walk);
    expect(md).toContain(page.maturity_raw.run);
  });

  it("renders one ### block per functional-activity heading", () => {
    if (page.functional_activities.length === 0) return;
    expect(md).toContain("## Functional Activities");
    for (const activity of page.functional_activities) {
      expect(md).toContain(`### ${activity.heading}`);
      for (const item of activity.items) expect(md).toContain(`- ${item}`);
    }
  });

  it("omits Featured KPIs entirely when the page has none", () => {
    if (page.featured_kpis.length === 0) {
      expect(md).not.toContain("## Featured KPIs");
    } else {
      expect(md).toContain("## Featured KPIs");
      for (const fk of page.featured_kpis) {
        expect(md).toContain(`{wp_id=${fk.wp_id}}`);
        if (fk.formula) expect(md).toContain("#### Formula");
      }
    }
  });

  it("renders Examples as an objective bullet with nested Objective/KPI pairs", () => {
    if (page.example_kpis.length === 0) return;
    expect(md).toContain("### Examples");
    for (const ex of page.example_kpis) {
      expect(md).toContain(`  - Objective: ${ex.objective}`);
      expect(md).toContain(`  - KPI: ${ex.kpi}`);
    }
  });

  it("is a pure function of its input (idempotent across repeated composition)", () => {
    const again = composeCapabilityMd(
      page,
      { ...META, sourceUrl: url(slug) },
      NO_REFS,
    );
    expect(again).toBe(md);
  });
});

describe("composeCapabilityMd — escaping guard (spec §2)", () => {
  const base = parse("capability-allocation.html", "allocation");

  it("throws when a headline-group item starts with a dash", () => {
    const page: ParsedCapabilityPage = {
      ...base,
      headline_groups: [{ label: "Group", items: ["- looks like a bullet"] }],
    };
    expect(() => composeCapabilityMd(page, META, NO_REFS)).toThrow(
      ComposeError,
    );
  });

  it("throws when a functional-activity item starts with a hash", () => {
    const page: ParsedCapabilityPage = {
      ...base,
      functional_activities: [
        {
          persona: { kind: "allied-group" },
          heading: "Heading",
          items: ["#1 priority"],
        },
      ],
    };
    expect(() => composeCapabilityMd(page, META, NO_REFS)).toThrow(
      ComposeError,
    );
  });

  it("throws when a plain-text item contains a newline", () => {
    const page: ParsedCapabilityPage = {
      ...base,
      kpi_bullets: ["line one\nline two"],
    };
    expect(() => composeCapabilityMd(page, META, NO_REFS)).toThrow(
      ComposeError,
    );
  });

  it("throws when a headline-group label starts with a hash", () => {
    const page: ParsedCapabilityPage = {
      ...base,
      headline_groups: [{ label: "# not a heading", items: ["fine"] }],
    };
    expect(() => composeCapabilityMd(page, META, NO_REFS)).toThrow(
      ComposeError,
    );
  });

  it("does not guard verbatim markdown fields (definition_md may contain # and -)", () => {
    const page: ParsedCapabilityPage = {
      ...base,
      definition_md: "# Already markdown\n\n- a list item",
    };
    expect(() => composeCapabilityMd(page, META, NO_REFS)).not.toThrow();
  });
});

describe("section-doc composers", () => {
  it("composePersonaMd emits kind=persona front-matter and a Description section", () => {
    const md = composePersonaMd({
      slug: "finance",
      title: "Finance",
      category: "core",
      description_md: "Finance owns the budget.",
      source_url: "https://www.finops.org/framework/persona/finance/",
      license: "CC-BY-4.0",
    });
    expect(md).toContain("kind: persona");
    expect(md).toContain("category: core");
    expect(md).toContain("## Description");
    expect(md).toContain("Finance owns the budget.");
  });

  it("composeKpiMd includes a Formula code block only when a formula is present", () => {
    const withFormula = composeKpiMd({
      slug: "aai",
      title: "Allocation Accuracy Index",
      wp_id: 25779,
      description_md: "desc",
      formula: "Directly Attributed Costs / Total Costs",
      data_sources: ["Billing export"],
      related_capability_slugs: ["allocation"],
      featured_on: ["allocation"],
      source_url: "https://www.finops.org/kpi/aai/",
      license: "CC-BY-4.0",
    });
    expect(withFormula).toContain("## Formula");
    expect(withFormula).toContain(
      "```\nDirectly Attributed Costs / Total Costs\n```",
    );

    const withoutFormula = composeKpiMd({
      slug: "bare",
      title: "Bare KPI",
      wp_id: 1,
      description_md: "desc",
      data_sources: [],
      related_capability_slugs: [],
      featured_on: [],
      source_url: "https://www.finops.org/kpi/bare/",
      license: "CC-BY-4.0",
    });
    expect(withoutFormula).not.toContain("## Formula");
  });

  it("composePrinciplesMd numbers entries and embeds the slug attribute", () => {
    const md = composePrinciplesMd([
      {
        slug: "teams-need-access",
        title: "Teams need access to and visibility of cost and usage data",
        description_md: "body",
        order: 1,
        source_url: "https://www.finops.org/framework/principles/",
        license: "CC-BY-4.0",
      },
    ]);
    expect(md).toContain("## 1. Teams need access");
    expect(md).toContain("{slug=teams-need-access}");
  });

  it("composePhasesMd, composeDomainsMd, composeTechnologyCategoriesMd, composeMaturityModelMd, composeScopesMd all round-trip their titles", () => {
    const phases = composePhasesMd([
      {
        slug: "inform",
        title: "Inform",
        description_md: "body",
        order: 1,
        source_url: "https://www.finops.org/framework/phases/",
        license: "CC-BY-4.0",
      },
    ]);
    expect(phases).toContain("## 1. Inform {slug=inform}");

    const domains = composeDomainsMd([
      {
        slug: "understand-usage",
        title: "Understand Usage & Cost",
        description_md: "body",
        capability_slugs: ["allocation"],
        source_url: "https://www.finops.org/framework/domains/",
        license: "CC-BY-4.0",
      },
    ]);
    expect(domains).toContain("### Capabilities");
    expect(domains).toContain("- allocation");

    const techCats = composeTechnologyCategoriesMd([
      {
        slug: "compute",
        title: "FinOps for Compute",
        description_md: "body",
        source_url: "https://www.finops.org/framework/technology-categories/",
        license: "CC-BY-4.0",
      },
    ]);
    expect(techCats).toContain("## FinOps for Compute {slug=compute}");

    const maturity = composeMaturityModelMd([
      {
        slug: "crawl",
        title: "Crawl",
        characteristics_md: "chars",
        sample_goals_md: "goals",
        official: true,
        source_url: "https://www.finops.org/framework/maturity-model/",
        license: "CC-BY-4.0",
      },
    ]);
    expect(maturity).toContain("### Characteristics");
    expect(maturity).toContain("### Sample Goals");

    const scopes = composeScopesMd({
      title: "FinOps Scopes",
      sections: [{ heading: "Overview", body_md: "body" }],
      source_url: "https://www.finops.org/framework/scopes/",
      license: "CC-BY-4.0",
    });
    expect(scopes).toContain("kind: scopes");
    expect(scopes).toContain("## Overview");
  });
});
