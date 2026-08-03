import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAttributeFile } from "./attributes.js";

const FIXTURES = join(import.meta.dirname, "../fixtures/attributes");

function load(slug: string): string {
  return readFileSync(join(FIXTURES, `${slug}.md`), "utf8");
}

describe("parseAttributeFile", () => {
  it("parses id/name/description/requirements/exceptions/introduced", () => {
    const md = load("null_handling");
    const { attribute, warnings } = parseAttributeFile(md, {
      slug: "null_handling",
      sourceUrl: "https://example.test/null_handling.md",
    });
    expect(warnings).toEqual([]);
    expect(attribute.parse_quality).toBe("parsed");
    expect(attribute.id).toBe("NullHandling");
    expect(attribute.display_name).toBe("Null Handling");
    expect(attribute.exceptions_md).toBe("None");
    expect(attribute.introduced_version).toBe("0.5");
    expect(attribute.requirements).toEqual([
      "Columns MUST use NULL when there isn't a value that can be specified for a nullable column.",
      'Columns MUST NOT use empty strings or placeholder values such as 0 for numeric columns or "Not Applicable" for string columns to represent a null or not having a value, regardless of whether the column allows nulls or not.',
    ]);
  });

  it("parses a longer attribute with nested allowed-value sub-lists (top-level bullets only)", () => {
    const md = load("numeric_format");
    const { attribute } = parseAttributeFile(md, {
      slug: "numeric_format",
      sourceUrl: "https://example.test/numeric_format.md",
    });
    expect(attribute.id).toBe("NumericFormat");
    expect(attribute.requirements.length).toBeGreaterThan(0);
    for (const r of attribute.requirements) {
      expect(r).not.toMatch(/^Allowed values:/);
    }
  });

  it("degrades gracefully to markdown_only when structure is missing", () => {
    const md = "# Mystery Attribute\n\nNo sections here.";
    const { attribute, warnings } = parseAttributeFile(md, {
      slug: "mystery",
      sourceUrl: "https://example.test/mystery.md",
    });
    expect(attribute.parse_quality).toBe("markdown_only");
    expect(attribute.id).toBe("Mystery Attribute");
    expect(attribute.requirements).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
