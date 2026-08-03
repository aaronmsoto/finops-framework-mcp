import { describe, expect, it } from "vitest";
import { calculableKpiSlugs, calculateKpi, hasFormula } from "./kpi-calc.js";

describe("calculateKpi — effective-savings-rate-percentage (ESR)", () => {
  it("matches a hand-computed 10-row fixture exactly", () => {
    const header = ["ListCost", "EffectiveCost"];
    // Sum(ListCost) = 1250, Sum(EffectiveCost) = 1060.
    // ESR% = ((1250 - 1060) / 1250) * 100 = 15.2 exactly.
    const rows = [
      ["100", "90"],
      ["200", "150"],
      ["50", "50"],
      ["300", "250"],
      ["120", "100"],
      ["80", "60"],
      ["60", "60"],
      ["90", "70"],
      ["110", "100"],
      ["140", "130"],
    ];
    const result = calculateKpi("effective-savings-rate-percentage", {
      header,
      rows,
    });
    expect(result.value).toBe(15.2);
    expect(result.unit).toBe("percent");
    expect(result.row_count).toBe(10);
  });

  it("treats NULL and empty cells as zero", () => {
    const result = calculateKpi("effective-savings-rate-percentage", {
      header: ["ListCost", "EffectiveCost"],
      rows: [
        ["100", "NULL"],
        ["NULL", ""],
      ],
    });
    // Sum(ListCost) = 100, Sum(EffectiveCost) = 0 -> ((100-0)/100)*100 = 100.
    expect(result.value).toBe(100);
  });

  it("returns 0 rather than dividing by zero when ListCost sums to zero", () => {
    const result = calculateKpi("effective-savings-rate-percentage", {
      header: ["ListCost", "EffectiveCost"],
      rows: [["0", "0"]],
    });
    expect(result.value).toBe(0);
  });
});

describe("calculateKpi — other computable KPIs use their WHERE-filters correctly", () => {
  it("commitment-utilization-score filters by ChargeCategory and requires a non-null commitment id", () => {
    const header = [
      "ChargeCategory",
      "CommitmentDiscountId",
      "EffectiveCost",
      "ContractedCost",
    ];
    const rows = [
      ["Usage", "cd-1", "80", "0"],
      ["Purchase", "cd-1", "0", "100"],
      ["Usage", "NULL", "999", "0"], // excluded: no commitment id
      ["Purchase", "NULL", "0", "999"], // excluded: no commitment id
    ];
    const result = calculateKpi("commitment-utilization-score", {
      header,
      rows,
    });
    expect(result.value).toBe(80); // 80 / 100 * 100
    expect(result.unit).toBe("percent");
  });

  it("consumption-versus-commitment reports the same ratio unscaled", () => {
    const header = [
      "ChargeCategory",
      "CommitmentDiscountId",
      "EffectiveCost",
      "ContractedCost",
    ];
    const rows = [
      ["Usage", "cd-1", "80", "0"],
      ["Purchase", "cd-1", "0", "100"],
    ];
    const result = calculateKpi("consumption-versus-commitment", {
      header,
      rows,
    });
    expect(result.value).toBe(0.8);
    expect(result.unit).toBe("ratio");
  });

  it("allocation-accuracy-index-aai requires both SubAccountId and Tags non-null", () => {
    const header = ["BilledCost", "SubAccountId", "Tags"];
    const rows = [
      ["100", "acct-1", "{}"],
      ["50", "NULL", "{}"],
      ["25", "acct-2", "NULL"],
    ];
    const result = calculateKpi("allocation-accuracy-index-aai", {
      header,
      rows,
    });
    expect(result.value).toBeCloseTo((100 / 175) * 100, 10);
  });

  it("percentage-of-costs-associated-with-unallocated-csp-cloud-resources counts null SubAccountId spend", () => {
    const header = ["BilledCost", "SubAccountId"];
    const rows = [
      ["100", "acct-1"],
      ["50", "NULL"],
    ];
    const result = calculateKpi(
      "percentage-of-costs-associated-with-unallocated-csp-cloud-resources",
      { header, rows },
    );
    expect(result.value).toBeCloseTo((50 / 150) * 100, 10);
  });
});

describe("calculateKpi — commitment KPIs guard against a zero denominator", () => {
  // Mirrors the official FOCUS 1.0 sample's actual shape: ChargeCategory only
  // ever takes {Usage, Adjustment, Credit} there — zero Purchase rows — so
  // the commitment-spend denominator is 0. The old behavior silently
  // reported a definite-looking 0%/100%/0; that is a fabrication, not a
  // correct application of the formula, so all three must now error.
  const noPurchaseRowsTable = {
    header: [
      "ChargeCategory",
      "CommitmentDiscountId",
      "EffectiveCost",
      "ContractedCost",
    ],
    rows: [
      ["Usage", "cd-1", "80", "0"],
      ["Usage", "NULL", "999", "0"],
      ["Adjustment", "NULL", "5", "0"],
    ],
  };

  it.each([
    "commitment-utilization-score",
    "percentage-of-commitment-based-discount-waste",
    "consumption-versus-commitment",
  ])(
    "%s throws a not-computable error instead of returning 0/100/0",
    (kpiSlug) => {
      expect(() => calculateKpi(kpiSlug, noPurchaseRowsTable)).toThrow(
        /no ChargeCategory="Purchase" rows.*not computable.*version="1\.2"/s,
      );
    },
  );
});

describe("calculateKpi — KPIs without a registered formula", () => {
  it("hasFormula is false for KPIs needing an external forecast/budget input", () => {
    expect(hasFormula("forecast-accuracy-rate-spend")).toBe(false);
    expect(
      hasFormula("percentage-variance-of-budgeted-vs-actual-csp-cloud-spend"),
    ).toBe(false);
  });

  it("throws a clean, identifiable error for an unregistered KPI slug", () => {
    expect(() =>
      calculateKpi("forecast-accuracy-rate-spend", { header: [], rows: [] }),
    ).toThrow(/no formula registered/);
  });

  it("calculableKpiSlugs lists ESR plus at least 2 others", () => {
    const slugs = calculableKpiSlugs();
    expect(slugs).toContain("effective-savings-rate-percentage");
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(slugs).size).toBe(slugs.length); // no duplicates
  });
});

describe("calculateKpi — missing sample column", () => {
  it("throws naming the missing column rather than silently defaulting", () => {
    expect(() =>
      calculateKpi("effective-savings-rate-percentage", {
        header: ["SomeOtherColumn"],
        rows: [],
      }),
    ).toThrow(/ListCost/);
  });
});
