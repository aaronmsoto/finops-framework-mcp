import { describe, expect, it } from "vitest";
import { formatFrontmatter, parseFrontmatter } from "./frontmatter.js";

describe("formatFrontmatter", () => {
  it("emits sorted keys regardless of insertion order", () => {
    const text = formatFrontmatter({
      title: "Allocation",
      slug: "allocation",
      kind: "capability",
    });
    expect(text).toBe(
      [
        "---",
        "kind: capability",
        "slug: allocation",
        "title: Allocation",
        "---",
      ].join("\n"),
    );
  });

  it("formats string-lists in comma-joined bracket form", () => {
    const text = formatFrontmatter({ warnings: ["a", "b"] });
    expect(text).toBe(["---", "warnings: [a, b]", "---"].join("\n"));
  });

  it("formats an empty list as []", () => {
    const text = formatFrontmatter({ warnings: [] });
    expect(text).toContain("warnings: []");
  });

  it("omits keys whose value is undefined", () => {
    const text = formatFrontmatter({ a: "x", b: undefined });
    expect(text).not.toContain("b:");
  });

  it("preserves numbers", () => {
    const text = formatFrontmatter({ wp_id: 25779 });
    expect(text).toContain("wp_id: 25779");
  });
});

describe("parseFrontmatter", () => {
  it("round-trips string, number, and list values", () => {
    const fields = {
      kind: "capability",
      slug: "allocation",
      title: "Allocation",
      wp_id: 25779,
      warnings: ["one", "two"],
    };
    const text = `${formatFrontmatter(fields)}\n\n## Body\n\ntext\n`;
    const parsed = parseFrontmatter(text);
    expect(parsed.data).toEqual(fields);
    expect(parsed.body).toBe("\n## Body\n\ntext\n");
  });

  it("round-trips an empty list", () => {
    const text = formatFrontmatter({ warnings: [] });
    const parsed = parseFrontmatter(`${text}\n`);
    expect(parsed.data.warnings).toEqual([]);
  });

  it("throws when the document has no opening fence", () => {
    expect(() => parseFrontmatter("## Body\n")).toThrow(/front-matter fence/);
  });

  it("throws when the opening fence is never closed", () => {
    expect(() => parseFrontmatter("---\nkind: capability\n")).toThrow(
      /closing fence/,
    );
  });

  it("throws on a malformed line without a `: ` separator", () => {
    expect(() => parseFrontmatter("---\nnotakeyvalue\n---\n")).toThrow(
      /malformed front-matter line/,
    );
  });
});
