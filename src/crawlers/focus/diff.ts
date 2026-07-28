import type { FocusColumn, FocusDiff } from "../../shared/focus/types.js";

const COMPARABLE_FIELDS: (keyof FocusColumn)[] = [
  "display_name",
  "description_md",
  "column_type",
  "feature_level",
  "allows_nulls",
  "data_type",
  "value_format_md",
  "number_range",
  "allowed_values",
  "requirements",
  "introduced_version",
];

function changedFields(from: FocusColumn, to: FocusColumn): string[] {
  return COMPARABLE_FIELDS.filter(
    (f) => JSON.stringify(from[f]) !== JSON.stringify(to[f]),
  );
}

/** Diffs two versions' column sets by ColumnId (spec "Version model"):
 * every added/changed record is source-cited back to the raw column file. */
export function diffColumns(
  from: { spec_version: string; source_tag: string; columns: FocusColumn[] },
  to: { spec_version: string; source_tag: string; columns: FocusColumn[] },
): FocusDiff {
  const fromById = new Map(from.columns.map((c) => [c.id, c]));
  const toById = new Map(to.columns.map((c) => [c.id, c]));

  const added_columns = [...toById.values()]
    .filter((c) => !fromById.has(c.id))
    .map((c) => ({ id: c.id, source_url: c.source_url }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const removed_columns = [...fromById.values()]
    .filter((c) => !toById.has(c.id))
    .map((c) => ({ id: c.id, source_url: c.source_url }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const changed_columns = [...toById.values()]
    .filter((c) => fromById.has(c.id))
    .map((toCol) => {
      const fromCol = fromById.get(toCol.id) as FocusColumn;
      return {
        id: toCol.id,
        changed_fields: changedFields(fromCol, toCol),
        from_source_url: fromCol.source_url,
        to_source_url: toCol.source_url,
      };
    })
    .filter((c) => c.changed_fields.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    from: from.spec_version,
    to: to.spec_version,
    source: { from_tag: from.source_tag, to_tag: to.source_tag },
    added_columns,
    removed_columns,
    changed_columns,
  };
}
