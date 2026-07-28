import { describe, expect, it } from "vitest";
import { diffColumns } from "./diff.js";
import type { FocusColumn } from "../../shared/focus/types.js";

function col(overrides: Partial<FocusColumn>): FocusColumn {
  return {
    id: "Foo",
    slug: "foo",
    display_name: "Foo",
    description_md: "desc",
    column_type: "Dimension",
    feature_level: "Mandatory",
    allows_nulls: false,
    data_type: "String",
    value_format_md: null,
    number_range: null,
    allowed_values: null,
    requirements: [],
    introduced_version: "1.0",
    source_url: "https://example.test/foo.md",
    license: "CC-BY-4.0",
    parse_quality: "parsed",
    ...overrides,
  };
}

describe("diffColumns", () => {
  it("finds added, removed, and changed columns, source-cited", () => {
    const from = {
      spec_version: "1.0",
      source_tag: "v1.0",
      columns: [
        col({ id: "BilledCost", slug: "billedcost" }),
        col({ id: "Removed", slug: "removed" }),
      ],
    };
    const to = {
      spec_version: "1.2",
      source_tag: "v1.2",
      columns: [
        col({
          id: "BilledCost",
          slug: "billedcost",
          data_type: "Decimal",
          source_url: "https://example.test/v1.2/billedcost.md",
        }),
        col({ id: "NewColumn", slug: "newcolumn" }),
      ],
    };

    const diff = diffColumns(from, to);
    expect(diff.from).toBe("1.0");
    expect(diff.to).toBe("1.2");
    expect(diff.added_columns).toEqual([
      { id: "NewColumn", source_url: "https://example.test/foo.md" },
    ]);
    expect(diff.removed_columns).toEqual([
      { id: "Removed", source_url: "https://example.test/foo.md" },
    ]);
    expect(diff.changed_columns).toEqual([
      {
        id: "BilledCost",
        changed_fields: ["data_type"],
        from_source_url: "https://example.test/foo.md",
        to_source_url: "https://example.test/v1.2/billedcost.md",
      },
    ]);
  });

  it("reports no changes for identical column sets", () => {
    const set = {
      spec_version: "1.0",
      source_tag: "v1.0",
      columns: [col({})],
    };
    const diff = diffColumns(set, { ...set, spec_version: "1.0" });
    expect(diff.added_columns).toEqual([]);
    expect(diff.removed_columns).toEqual([]);
    expect(diff.changed_columns).toEqual([]);
  });
});
