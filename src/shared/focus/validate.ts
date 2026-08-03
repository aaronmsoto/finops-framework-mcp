// Per-version FOCUS CSV conformance validator (T-031). Rules come entirely
// from a version's data/focus/{version}/columns.json — feature_level,
// data_type, allows_nulls, allowed_values, value_format_md, number_range —
// never a hardcoded per-version rule table, so adding a version (spec
// "Non-goals": supported by re-running ingestion) needs no validator change.
//
// Errors vs. warnings: structural/domain violations that make a value
// impossible to interpret (missing Mandatory column, unparsable data type,
// a value outside the declared enum, a malformed currency code) are errors.
// Completeness/range gaps (a null where the spec says "MUST NOT be null", a
// negative value where the range is "non-negative") are warnings — verified
// against the official FOCUS-Sample-Data 1.0 fixture (real, anonymized
// multi-provider billing data), which itself contains a handful of such
// gaps despite being the FOCUS Foundation's own published ground truth, so
// hard-failing on them would make the validator unusable against real data.

import type { FocusColumn } from "./types.js";

export interface FocusValidationIssue {
  /** 1-based data row number, header excluded; 0 for header/structural issues. */
  row: number;
  column: string;
  message: string;
}

export interface FocusValidationResult {
  errors: FocusValidationIssue[];
  warnings: FocusValidationIssue[];
  rowCount: number;
  columnCount: number;
}

const NULL_TOKENS = new Set(["NULL", ""]);

/**
 * Minimal RFC4180 CSV parser: quoted fields, "" as an escaped quote,
 * embedded commas/newlines inside quotes. Good enough for the FOCUS sample
 * data's conventions (unquoted `NULL` or an empty field for null, quoted
 * strings/JSON otherwise).
 */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let sawAnyField = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
    sawAnyField = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      sawAnyField = true;
    } else if (c === ",") {
      pushField();
      sawAnyField = true;
    } else if (c === "\r") {
      // ignore — paired \n (or lone \r) handled below
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
      sawAnyField = true;
    }
  }
  if (sawAnyField || field.length > 0) pushRow();

  const header = rows.shift() ?? [];
  return { header, rows };
}

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

function checkDataType(column: FocusColumn, raw: string): string | null {
  switch (column.data_type) {
    case "Decimal":
      return DECIMAL_RE.test(raw)
        ? null
        : `expected a Decimal value for "${column.id}", got "${raw}"`;
    case "Date/Time":
      return DATETIME_RE.test(raw)
        ? null
        : `expected a Date/Time value (YYYY-MM-DD HH:MM:SS) for "${column.id}", got "${raw}"`;
    case "JSON":
      try {
        JSON.parse(raw);
        return null;
      } catch {
        return `expected valid JSON for "${column.id}", got "${raw}"`;
      }
    default:
      return null; // String / unknown: no format constraint beyond presence/nullability
  }
}

/** Allowed-value membership is case-insensitive: casing differences across
 * provider exports (e.g. "usage-based" vs "Usage-Based") don't change the
 * semantic value. */
function matchesAllowedValue(column: FocusColumn, raw: string): boolean {
  return (column.allowed_values ?? []).some(
    (v) => v.value.toLowerCase() === raw.toLowerCase(),
  );
}

function checkCurrencyFormat(column: FocusColumn, raw: string): string | null {
  const fmt = column.value_format_md ?? "";
  if (/Currency Code Format/i.test(fmt) && !CURRENCY_CODE_RE.test(raw)) {
    return `expected a 3-letter currency code for "${column.id}" (Currency Code Format), got "${raw}"`;
  }
  return null;
}

function checkNonNegativeRange(
  column: FocusColumn,
  raw: string,
): string | null {
  if (column.number_range !== "Any valid non-negative decimal value")
    return null;
  const n = Number(raw);
  if (!Number.isNaN(n) && n < 0) {
    return `expected a non-negative value for "${column.id}", got "${raw}"`;
  }
  return null;
}

/**
 * Validates CSV billing data against one version's column definitions:
 * mandatory-column presence, nullability, data type, allowed values, and
 * value-format constraints derived from the artifact (spec "Ingestion
 * rules" / T-031 acceptance). Issues are column- (and row-) addressed.
 */
export function validateFocusCsv(
  columns: FocusColumn[],
  csvText: string,
): FocusValidationResult {
  const { header, rows } = parseCsv(csvText);
  const errors: FocusValidationIssue[] = [];
  const warnings: FocusValidationIssue[] = [];
  const indexByColumnId = new Map(header.map((h, i) => [h, i]));

  for (const column of columns) {
    if (
      column.feature_level === "Mandatory" &&
      !indexByColumnId.has(column.id)
    ) {
      errors.push({
        row: 0,
        column: column.id,
        message: `Mandatory column "${column.id}" is missing from the data`,
      });
    }
  }

  for (const column of columns) {
    const idx = indexByColumnId.get(column.id);
    if (idx === undefined) continue; // presence already reported above if Mandatory
    rows.forEach((cells, rowIdx) => {
      const raw = cells[idx] ?? "";
      const rowNum = rowIdx + 1;

      if (NULL_TOKENS.has(raw)) {
        if (column.allows_nulls === false) {
          warnings.push({
            row: rowNum,
            column: column.id,
            message: `null value not allowed for "${column.id}" (allows_nulls: false)`,
          });
        }
        return;
      }

      const typeError = checkDataType(column, raw);
      if (typeError) {
        errors.push({ row: rowNum, column: column.id, message: typeError });
        return;
      }

      if (column.allowed_values && !matchesAllowedValue(column, raw)) {
        const values = column.allowed_values.map((v) => v.value).join(", ");
        errors.push({
          row: rowNum,
          column: column.id,
          message: `"${raw}" is not one of the allowed values for "${column.id}" (${values})`,
        });
        return;
      }

      const currencyError = checkCurrencyFormat(column, raw);
      if (currencyError) {
        errors.push({ row: rowNum, column: column.id, message: currencyError });
      }

      const rangeWarning = checkNonNegativeRange(column, raw);
      if (rangeWarning) {
        warnings.push({
          row: rowNum,
          column: column.id,
          message: rangeWarning,
        });
      }
    });
  }

  return {
    errors,
    warnings,
    rowCount: rows.length,
    columnCount: header.length,
  };
}
