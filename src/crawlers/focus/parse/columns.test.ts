import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseColumnFile } from "./columns.js";

const FIXTURES = join(import.meta.dirname, "../fixtures/columns");

function load(version: string, slug: string): string {
  return readFileSync(join(FIXTURES, version, `${slug}.md`), "utf8");
}

describe("parseColumnFile", () => {
  it("parses a mandatory metric column with prose (non-bulleted) requirements", () => {
    const md = load("1.0", "billedcost");
    const { column, warnings } = parseColumnFile(md, {
      slug: "billedcost",
      sourceUrl: "https://example.test/billedcost.md",
    });
    expect(warnings).toEqual([]);
    expect(column.parse_quality).toBe("parsed");
    expect(column).toMatchObject({
      id: "BilledCost",
      display_name: "Billed Cost",
      column_type: "Metric",
      feature_level: "Mandatory",
      allows_nulls: false,
      data_type: "Decimal",
      introduced_version: "0.5",
    });
    expect(column.requirements.length).toBeGreaterThan(0);
    expect(column.requirements.some((r) => /MUST NOT be null/.test(r))).toBe(
      true,
    );
    expect(column.allowed_values).toBeNull();
  });

  it("parses a dimension column with an Allowed values table", () => {
    const md = load("1.0", "chargecategory");
    const { column } = parseColumnFile(md, {
      slug: "chargecategory",
      sourceUrl: "https://example.test/chargecategory.md",
    });
    expect(column.column_type).toBe("Dimension");
    expect(column.feature_level).toBe("Mandatory");
    expect(column.allowed_values).not.toBeNull();
    expect(column.allowed_values?.map((v) => v.value)).toContain("Usage");
    expect(column.parse_quality).toBe("parsed");
  });

  it("parses bulleted normative requirements (not prose)", () => {
    const md = load("1.0", "tags");
    const { column } = parseColumnFile(md, {
      slug: "tags",
      sourceUrl: "https://example.test/tags.md",
    });
    expect(column.id).toBe("Tags");
    expect(column.requirements).toContain(
      "The Tags column MUST be in [Key-Value Format](#key-valueformat).",
    );
    expect(column.introduced_version).toBe("1.0-preview");
  });

  it("parses a conditional column with no Number range row", () => {
    const md = load("1.0", "resourceid");
    const { column } = parseColumnFile(md, {
      slug: "resourceid",
      sourceUrl: "https://example.test/resourceid.md",
    });
    expect(column.feature_level).toBe("Conditional");
    expect(column.allows_nulls).toBe(true);
    expect(column.number_range).toBeNull();
  });

  it("parses a v1.2-only column introduced after 1.0", () => {
    const md = load("1.2", "capacityreservationstatus");
    const { column } = parseColumnFile(md, {
      slug: "capacityreservationstatus",
      sourceUrl: "https://example.test/capacityreservationstatus.md",
    });
    expect(column.id).toBe("CapacityReservationStatus");
    expect(column.introduced_version).toBe("1.1");
    expect(column.allowed_values?.length).toBe(2);
  });

  it("parses a Metric column with Number range and value format link", () => {
    const md = load("1.2", "pricingcurrency");
    const { column } = parseColumnFile(md, {
      slug: "pricingcurrency",
      sourceUrl: "https://example.test/pricingcurrency.md",
    });
    expect(column.column_type).toBe("Dimension");
    expect(column.data_type).toBe("String");
  });

  it("degrades gracefully to markdown_only when structure is missing, never throwing", () => {
    const md = [
      "# Something Weird",
      "",
      "This file has no structured sections at all, just prose.",
    ].join("\n");
    const { column, warnings } = parseColumnFile(md, {
      slug: "something-weird",
      sourceUrl: "https://example.test/something-weird.md",
    });
    expect(column.parse_quality).toBe("markdown_only");
    expect(column.id).toBe("Something Weird");
    expect(column.display_name).toBe("Something Weird");
    expect(column.column_type).toBe("unknown");
    expect(column.feature_level).toBe("unknown");
    expect(column.requirements).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
