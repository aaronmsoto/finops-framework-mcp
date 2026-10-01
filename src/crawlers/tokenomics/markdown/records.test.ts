import { describe, expect, it } from "vitest";
import { ComposeError } from "../../../shared/markdown/compose.js";
import {
  composeCollection,
  deriveCollection,
  PROVENANCE_FIELDS,
  type CollectionSpec,
} from "./records.js";

const SPEC: CollectionSpec = {
  collection: "things",
  heading: "Things",
  titleKey: "name",
  fields: [
    { key: "n", type: "int" },
    { key: "opt", type: "int?" },
    { key: "flag", type: "bool" },
    { key: "note", type: "text?" },
    ...PROVENANCE_FIELDS,
    { key: "items", type: "list" },
    { key: "body", type: "md" },
    { key: "maybe", type: "md?" },
    { key: "nested", type: "json" },
  ],
};

const rec = {
  slug: "a",
  name: "Alpha",
  n: 3,
  opt: null,
  flag: true,
  note: "hello: world",
  items: ["x", "y"],
  body: "Para one.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n#### deep ok",
  maybe: null,
  nested: [{ k: 1 }],
  provenance: {
    document: "d",
    section: null,
    source_url: "https://x/",
    license: "CC-BY-4.0",
  },
};

describe("record dialect", () => {
  it("round-trips every field type exactly", () => {
    const md = composeCollection(
      SPEC,
      [rec, { ...rec, slug: "b", items: [] }],
      { extra: "v" },
    );
    const { frontmatter, records } = deriveCollection(SPEC, md);
    expect(frontmatter.extra).toBe("v");
    expect(records[0]).toEqual(rec);
    expect(records[1]?.items).toEqual([]);
  });

  it("refuses headings that would break the dialect and missing required fields", () => {
    expect(() =>
      composeCollection(SPEC, [{ ...rec, body: "### boom" }]),
    ).toThrow(ComposeError);
    expect(() => composeCollection(SPEC, [{ ...rec, n: null }])).toThrow(
      /required field "n"/,
    );
    expect(() =>
      composeCollection(SPEC, [{ ...rec, items: ["- bad"] }]),
    ).toThrow(ComposeError);
  });

  it("rejects wrong collection, count drift, and malformed values on derive", () => {
    const md = composeCollection(SPEC, [rec]);
    expect(() =>
      deriveCollection({ ...SPEC, collection: "other" }, md),
    ).toThrow(/expected collection/);
    expect(() =>
      deriveCollection(SPEC, md.replace("count: 1", "count: 2")),
    ).toThrow(/count/);
    expect(() =>
      deriveCollection(SPEC, md.replace("- n: 3", "- n: three")),
    ).toThrow(/not an integer/);
    expect(() =>
      deriveCollection(SPEC, md.replace("- flag: true", "- flag: yes")),
    ).toThrow(/boolean/);
    expect(() => deriveCollection(SPEC, md.replace("- n: 3\n", ""))).toThrow(
      /required field n/,
    );
    expect(() => deriveCollection(SPEC, md.replace("```json", "```"))).toThrow(
      /fenced JSON/,
    );
    expect(() =>
      deriveCollection(SPEC, md.replace("### body", "### bodyx")),
    ).toThrow(/body missing/);
  });
});
