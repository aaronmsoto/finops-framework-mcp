import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FocusColumn } from "./types.js";
import { parseCsv, validateFocusCsv } from "./validate.js";

const SAMPLE_DIR = join(
  import.meta.dirname,
  "../../crawlers/focus/fixtures/samples/1.0",
);
const COLUMNS_1_0 = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../../data/focus/1.0/columns.json"),
    "utf8",
  ),
) as FocusColumn[];

function csvField(value: string): string {
  if (value === "NULL") return value; // matches the official sample's null convention
  return `"${value.replace(/"/g, '""')}"`;
}

function csvOf(columnIds: string[], rows: string[][]): string {
  const lines = [
    columnIds.map(csvField).join(","),
    ...rows.map((r) => r.map(csvField).join(",")),
  ];
  return lines.join("\n") + "\n";
}

/** A minimal single-row baseline covering every 1.0 Mandatory column with a
 * spec-conformant value, for isolating one corruption at a time. */
function baselineRow(): Record<string, string> {
  return {
    AvailabilityZone: "NULL",
    BilledCost: "1.50",
    BillingAccountId: "acct-1",
    BillingAccountName: "Acme",
    BillingCurrency: "USD",
    BillingPeriodEnd: "2024-10-01 00:00:00",
    BillingPeriodStart: "2024-09-01 00:00:00",
    ChargeCategory: "Usage",
    ChargeClass: "NULL",
    ChargeDescription: "Compute usage",
    ChargeFrequency: "Usage-Based",
    ChargePeriodEnd: "2024-09-02 00:00:00",
    ChargePeriodStart: "2024-09-01 00:00:00",
    CommitmentDiscountCategory: "NULL",
    CommitmentDiscountId: "NULL",
    CommitmentDiscountName: "NULL",
    CommitmentDiscountStatus: "NULL",
    CommitmentDiscountType: "NULL",
    ConsumedQuantity: "1",
    ConsumedUnit: "Hours",
    ContractedCost: "1.50",
    ContractedUnitPrice: "1.50",
    EffectiveCost: "1.50",
    InvoiceIssuerName: "Acme Cloud",
    ListCost: "1.50",
    ListUnitPrice: "1.50",
    PricingCategory: "Standard",
    PricingQuantity: "1",
    PricingUnit: "Hours",
    ProviderName: "Acme",
    PublisherName: "Acme",
    RegionId: "NULL",
    RegionName: "NULL",
    ResourceId: "NULL",
    ResourceName: "NULL",
    ResourceType: "NULL",
    ServiceCategory: "Compute",
    ServiceName: "Virtual Machines",
    SkuId: "NULL",
    SkuPriceId: "NULL",
    SubAccountId: "NULL",
    SubAccountName: "NULL",
    Tags: '{"env": "prod"}',
  };
}

function csvFromBaseline(overrides: Record<string, string> = {}): {
  columnIds: string[];
  csv: string;
} {
  const row = { ...baselineRow(), ...overrides };
  const columnIds = Object.keys(row);
  return {
    columnIds,
    csv: csvOf(columnIds, [columnIds.map((c) => row[c] as string)]),
  };
}

describe("parseCsv", () => {
  it("handles quoted fields with embedded commas and escaped quotes", () => {
    const text = 'a,b,c\n"1,000","say ""hi""",3\n';
    const { header, rows } = parseCsv(text);
    expect(header).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([["1,000", 'say "hi"', "3"]]);
  });

  it("treats an unquoted NULL and an empty field as distinct raw tokens", () => {
    const { rows } = parseCsv("a,b\nNULL,\n");
    expect(rows).toEqual([["NULL", ""]]);
  });
});

describe("validateFocusCsv — official 1.0 ground truth", () => {
  it("passes the official FOCUS-Sample-Data 1,000-row sample with 0 errors", () => {
    const csv = readFileSync(join(SAMPLE_DIR, "focus_sample.csv"), "utf8");
    const result = validateFocusCsv(COLUMNS_1_0, csv);
    expect(result.rowCount).toBe(1000);
    expect(result.errors).toEqual([]);
  });

  it("still surfaces real completeness gaps in the official sample as warnings", () => {
    // The official sample is anonymized real-world multi-provider data; a
    // handful of rows are missing a Mandatory, non-nullable value even
    // though the FOCUS Foundation publishes it as ground truth — the
    // validator reports these as warnings rather than hard errors.
    const csv = readFileSync(join(SAMPLE_DIR, "focus_sample.csv"), "utf8");
    const result = validateFocusCsv(COLUMNS_1_0, csv);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.column === "ContractedCost")).toBe(
      true,
    );
  });
});

describe("validateFocusCsv — a clean baseline round-trips with 0 issues", () => {
  it("produces no errors or warnings for a fully spec-conformant row", () => {
    const { columnIds, csv } = csvFromBaseline();
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe("validateFocusCsv — deliberately corrupted fixtures", () => {
  it("fails when a Mandatory column is missing from the header", () => {
    const row = baselineRow();
    delete row.BilledCost;
    const columnIds = Object.keys(row);
    const corrupted = csvOf(columnIds, [
      columnIds.map((c) => row[c] as string),
    ]);
    const result = validateFocusCsv(COLUMNS_1_0, corrupted);
    expect(result.errors).toContainEqual({
      row: 0,
      column: "BilledCost",
      message: 'Mandatory column "BilledCost" is missing from the data',
    });
  });

  it("fails on a non-Decimal value in a Decimal column", () => {
    const { csv, columnIds } = csvFromBaseline({ BilledCost: "not-a-number" });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(
      result.errors.some(
        (e) =>
          e.column === "BilledCost" && e.row === 1 && /Decimal/.test(e.message),
      ),
    ).toBe(true);
  });

  it("fails on a value outside the declared allowed_values enum", () => {
    const { csv, columnIds } = csvFromBaseline({ ChargeCategory: "Bogus" });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(
      result.errors.some(
        (e) =>
          e.column === "ChargeCategory" &&
          e.row === 1 &&
          /not one of the allowed values/.test(e.message),
      ),
    ).toBe(true);
  });

  it("fails on a malformed Date/Time value", () => {
    const { csv, columnIds } = csvFromBaseline({
      BillingPeriodStart: "2024/13/45",
    });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(
      result.errors.some(
        (e) =>
          e.column === "BillingPeriodStart" &&
          e.row === 1 &&
          /Date\/Time/.test(e.message),
      ),
    ).toBe(true);
  });

  it("fails on malformed JSON in the Tags column", () => {
    const { csv, columnIds } = csvFromBaseline({ Tags: "{not valid json" });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(
      result.errors.some(
        (e) => e.column === "Tags" && e.row === 1 && /JSON/.test(e.message),
      ),
    ).toBe(true);
  });

  it("fails on an invalid currency code", () => {
    const { csv, columnIds } = csvFromBaseline({ BillingCurrency: "US1" });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(
      result.errors.some(
        (e) =>
          e.column === "BillingCurrency" &&
          e.row === 1 &&
          /currency code/.test(e.message),
      ),
    ).toBe(true);
  });

  it("accepts allowed-value matches regardless of casing", () => {
    const { csv, columnIds } = csvFromBaseline({
      ChargeFrequency: "usage-based",
    });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(result.errors).toEqual([]);
  });

  it("warns (does not error) on a null in a non-nullable Mandatory column", () => {
    const { csv, columnIds } = csvFromBaseline({ BilledCost: "NULL" });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(result.errors).toEqual([]);
    expect(
      result.warnings.some(
        (w) =>
          w.column === "BilledCost" && /allows_nulls: false/.test(w.message),
      ),
    ).toBe(true);
  });

  it("warns (does not error) on a negative value in a non-negative range", () => {
    const { csv, columnIds } = csvFromBaseline({ ContractedUnitPrice: "-5" });
    const columns = COLUMNS_1_0.filter((c) => columnIds.includes(c.id));
    const result = validateFocusCsv(columns, csv);
    expect(result.errors).toEqual([]);
    expect(
      result.warnings.some(
        (w) =>
          w.column === "ContractedUnitPrice" && /non-negative/.test(w.message),
      ),
    ).toBe(true);
  });
});
