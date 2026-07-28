import { describe, expect, it } from "vitest";
import { extractRequirements, findPipeTable } from "./table.js";

describe("findPipeTable", () => {
  it("parses headers and rows, stopping at the first non-table line", () => {
    const lines = [
      "intro text",
      "| Constraint   | Value  |",
      "|:-------------|:-------|",
      "| Column type  | Metric |",
      "| Feature level| Mandatory |",
      "",
      "trailing prose",
    ];
    const result = findPipeTable(lines);
    expect(result).not.toBeNull();
    expect(result?.table.headers).toEqual(["Constraint", "Value"]);
    expect(result?.table.rows).toEqual([
      ["Column type", "Metric"],
      ["Feature level", "Mandatory"],
    ]);
    expect(result?.nextIdx).toBe(5);
  });

  it("finds a second table starting after nextIdx", () => {
    const lines = [
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "Allowed values:",
      "",
      "| Value | Description |",
      "| :---- | :----------- |",
      "| Used  | in use       |",
    ];
    const first = findPipeTable(lines);
    expect(first).not.toBeNull();
    const second = findPipeTable(lines, first?.nextIdx);
    expect(second?.table.headers).toEqual(["Value", "Description"]);
    expect(second?.table.rows).toEqual([["Used", "in use"]]);
  });

  it("returns null when there is no table", () => {
    expect(findPipeTable(["just", "some", "prose"])).toBeNull();
  });
});

describe("extractRequirements", () => {
  it("prefers top-level bullets containing MUST/SHOULD, ignoring nested bullets", () => {
    const section = [
      "* Foo MUST be present.",
      "* Foo MUST be of type String.",
      "  * Nested bullet MUST be ignored.",
      "* Bar is not normative.",
    ].join("\n");
    expect(extractRequirements(section)).toEqual([
      "Foo MUST be present.",
      "Foo MUST be of type String.",
    ]);
  });

  it("falls back to normative prose sentences when there are no bullets", () => {
    const section =
      "This column is nice. The Foo column MUST be present and MUST NOT be null. " +
      "It is commonly used for reporting.";
    expect(extractRequirements(section)).toEqual([
      "The Foo column MUST be present and MUST NOT be null.",
    ]);
  });

  it("returns an empty array when nothing is normative", () => {
    expect(extractRequirements("Just some descriptive prose.")).toEqual([]);
  });
});
