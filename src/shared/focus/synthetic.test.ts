import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateFocusCsv } from "./synthetic.js";
import type { FocusColumn } from "./types.js";
import { parseCsv, validateFocusCsv } from "./validate.js";

function loadColumns(version: string): FocusColumn[] {
  return JSON.parse(
    readFileSync(
      join(import.meta.dirname, `../../../data/focus/${version}/columns.json`),
      "utf8",
    ),
  ) as FocusColumn[];
}

const COLUMNS_1_0 = loadColumns("1.0");
const COLUMNS_1_2 = loadColumns("1.2");

describe("generateFocusCsv — determinism", () => {
  it("produces byte-identical output for the same seed", () => {
    const a = generateFocusCsv(COLUMNS_1_0, { rows: 25, seed: 7 });
    const b = generateFocusCsv(COLUMNS_1_0, { rows: 25, seed: 7 });
    expect(a).toBe(b);
  });

  it("produces different output for a different seed", () => {
    const a = generateFocusCsv(COLUMNS_1_0, { rows: 25, seed: 7 });
    const b = generateFocusCsv(COLUMNS_1_0, { rows: 25, seed: 8 });
    expect(a).not.toBe(b);
  });
});

describe.each([
  ["1.0", COLUMNS_1_0],
  ["1.2", COLUMNS_1_2],
])("generateFocusCsv — FOCUS %s", (version, columns) => {
  it("emits a header that exactly matches the version's column list", () => {
    const csv = generateFocusCsv(columns, { rows: 5, seed: 1 });
    const { header } = parseCsv(csv);
    expect(header).toEqual(columns.map((c) => c.id));
  });

  it("passes its own version's validator with 0 errors", () => {
    const csv = generateFocusCsv(columns, { rows: 50, seed: 42 });
    const result = validateFocusCsv(columns, csv);
    expect(result.rowCount).toBe(50);
    expect(result.errors).toEqual([]);
  });

  it("passes with 0 warnings too (nulls/ranges respect the declared constraints)", () => {
    const csv = generateFocusCsv(columns, { rows: 50, seed: 42 });
    const result = validateFocusCsv(columns, csv);
    expect(result.warnings).toEqual([]);
  });
});

describe("generateFocusCsv — committed synthetic fixtures", () => {
  const FIXTURE_DIR = join(
    import.meta.dirname,
    "../../crawlers/focus/fixtures/samples/synthetic",
  );

  it.each([
    ["1.0", COLUMNS_1_0],
    ["1.2", COLUMNS_1_2],
  ])(
    "the committed FOCUS %s synthetic sample passes its validator",
    (version, columns) => {
      const csv = readFileSync(
        join(FIXTURE_DIR, version, "focus_synthetic_sample.csv"),
        "utf8",
      );
      const result = validateFocusCsv(columns, csv);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    },
  );
});
