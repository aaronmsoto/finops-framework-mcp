import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCapability,
  parseCapabilityPage,
  type ParsedCapabilityPage,
} from "../parse/capability.js";
import {
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
import {
  deriveCapabilityDoc,
  deriveDomainsDoc,
  deriveKpiDoc,
  deriveMaturityModelDoc,
  derivePersonaDoc,
  derivePhasesDoc,
  derivePrinciplesDoc,
  deriveScopesDoc,
  deriveTechnologyCategoriesDoc,
} from "./derive.js";

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

describe.each([
  ["capability-allocation.html", "allocation"],
  ["capability-forecasting.html", "forecasting"],
  ["capability-finops-practice-operations.html", "finops-practice-operations"],
  [
    "capability-executive-strategy-alignment.html",
    "executive-strategy-alignment",
  ],
  ["capability-sustainability.html", "sustainability"],
])("derive(compose(parse(%s))) round-trips", (fixtureName, slug) => {
  const page = parse(fixtureName, slug);
  const meta = {
    wpId: 100,
    domainSlug: "understand-usage",
    sourceUrl: url(slug),
    license: "CC-BY-4.0",
  };
  const md = composeCapabilityMd(page, meta, NO_REFS);
  const derived = deriveCapabilityDoc(md);
  const expectedCapability = buildCapability(
    page,
    meta.wpId,
    meta.domainSlug,
    meta.sourceUrl,
  );

  it("reproduces the direct-parse Capability entity field-for-field", () => {
    expect(derived.capability).toEqual(expectedCapability);
  });

  it("reproduces the direct-parse Action array (ordinals + parent_ordinal)", () => {
    expect(derived.actions).toEqual(page.actions);
  });
});

describe("derive — allocation actions ordinal/parent_ordinal (spec §3)", () => {
  const page = parse("capability-allocation.html", "allocation");
  const md = composeCapabilityMd(
    page,
    {
      wpId: 100,
      domainSlug: "understand-usage",
      sourceUrl: url("allocation"),
      license: "CC-BY-4.0",
    },
    NO_REFS,
  );
  const derived = deriveCapabilityDoc(md);

  it("assigns the same ordinal sequence per maturity level as the direct parser", () => {
    for (const level of ["crawl", "walk", "run"] as const) {
      const expected = page.actions.filter((a) => a.maturity === level);
      const actual = derived.actions.filter((a) => a.maturity === level);
      expect(actual).toEqual(expected);
    }
  });

  it("links nested items to their parent ordinal, matching the direct parser", () => {
    const expectedChildren = page.actions.filter(
      (a) => a.parent_ordinal !== undefined,
    );
    expect(expectedChildren.length).toBeGreaterThan(0);
    const derivedChildren = derived.actions.filter(
      (a) => a.parent_ordinal !== undefined,
    );
    expect(derivedChildren).toEqual(expectedChildren);
  });
});

describe("section-doc derive round-trips its own compose output", () => {
  it("persona", () => {
    const persona = {
      slug: "finance",
      title: "Finance",
      category: "core" as const,
      description_md: "Finance owns the budget.",
      source_url: "https://www.finops.org/framework/persona/finance/",
      license: "CC-BY-4.0" as const,
    };
    expect(derivePersonaDoc(composePersonaMd(persona))).toEqual(persona);
  });

  it("kpi (with formula)", () => {
    const kpi = {
      slug: "aai",
      title: "Allocation Accuracy Index",
      wp_id: 25779,
      description_md: "desc",
      formula: "Directly Attributed Costs / Total Costs",
      data_sources: ["Billing export"],
      related_capability_slugs: ["allocation"],
      featured_on: ["allocation"],
      source_url: "https://www.finops.org/kpi/aai/",
      license: "CC-BY-4.0" as const,
    };
    expect(deriveKpiDoc(composeKpiMd(kpi))).toEqual(kpi);
  });

  it("kpi (bare, no formula/related)", () => {
    const kpi = {
      slug: "bare",
      title: "Bare KPI",
      wp_id: 1,
      description_md: "desc",
      data_sources: [],
      related_capability_slugs: [],
      featured_on: [],
      source_url: "https://www.finops.org/kpi/bare/",
      license: "CC-BY-4.0" as const,
    };
    expect(deriveKpiDoc(composeKpiMd(kpi))).toEqual(kpi);
  });

  it("principles", () => {
    const principles = [
      {
        slug: "teams-need-access",
        title: "Teams need access to and visibility of cost and usage data",
        description_md: "body",
        order: 1,
        source_url: "https://www.finops.org/framework/principles/",
        license: "CC-BY-4.0" as const,
      },
    ];
    expect(derivePrinciplesDoc(composePrinciplesMd(principles))).toEqual(
      principles,
    );
  });

  it("phases", () => {
    const phases = [
      {
        slug: "inform",
        title: "Inform",
        description_md: "body",
        order: 1,
        source_url: "https://www.finops.org/framework/phases/",
        license: "CC-BY-4.0" as const,
      },
    ];
    expect(derivePhasesDoc(composePhasesMd(phases))).toEqual(phases);
  });

  it("domains", () => {
    const domains = [
      {
        slug: "understand-usage",
        title: "Understand Usage & Cost",
        description_md: "body",
        capability_slugs: ["allocation", "forecasting"],
        source_url: "https://www.finops.org/framework/domains/",
        license: "CC-BY-4.0" as const,
      },
    ];
    expect(deriveDomainsDoc(composeDomainsMd(domains))).toEqual(domains);
  });

  it("technology categories", () => {
    const cats = [
      {
        slug: "compute",
        title: "FinOps for Compute",
        description_md: "body",
        source_url: "https://www.finops.org/framework/technology-categories/",
        license: "CC-BY-4.0" as const,
      },
    ];
    expect(
      deriveTechnologyCategoriesDoc(composeTechnologyCategoriesMd(cats)),
    ).toEqual(cats);
  });

  it("maturity model (with and without sample goals)", () => {
    const levels = [
      {
        slug: "crawl" as const,
        title: "Crawl",
        characteristics_md: "chars",
        sample_goals_md: "goals",
        official: true as const,
        source_url: "https://www.finops.org/framework/maturity-model/",
        license: "CC-BY-4.0" as const,
      },
      {
        slug: "walk" as const,
        title: "Walk",
        characteristics_md: "chars2",
        sample_goals_md: "",
        official: true as const,
        source_url: "https://www.finops.org/framework/maturity-model/",
        license: "CC-BY-4.0" as const,
      },
    ];
    expect(deriveMaturityModelDoc(composeMaturityModelMd(levels))).toEqual(
      levels,
    );
  });

  it("scopes", () => {
    const scopes = {
      title: "FinOps Scopes",
      sections: [
        { heading: "Overview", body_md: "body" },
        { heading: "Public Cloud", body_md: "more body" },
      ],
      source_url: "https://www.finops.org/framework/scopes/",
      license: "CC-BY-4.0" as const,
    };
    expect(deriveScopesDoc(composeScopesMd(scopes))).toEqual(scopes);
  });
});
