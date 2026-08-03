// Deterministic seeded synthetic FOCUS CSV generator (T-032). Like
// validate.ts, every generation rule is derived purely from a version's
// columns.json (data_type, allowed_values, value_format_md, number_range,
// allows_nulls) — no hardcoded per-column or per-version table — so adding
// a spec version needs no generator change, and output is guaranteed to
// pass that version's validateFocusCsv by construction.

import type { FocusColumn } from "./types.js";

export interface GenerateFocusCsvOptions {
  rows: number;
  seed: number;
}

/** mulberry32: small, fast, deterministic 32-bit PRNG (public domain algorithm). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[randInt(rng, 0, items.length - 1)] as T;
}

const CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY", "AUD"];
const WORD_BANK = [
  "compute",
  "storage",
  "network",
  "database",
  "analytics",
  "container",
  "serverless",
  "gateway",
  "instance",
  "volume",
];

function randomDateTime(rng: () => number): string {
  const year = 2024;
  const month = randInt(rng, 1, 12);
  const day = randInt(rng, 1, 28);
  const hour = randInt(rng, 0, 23);
  const minute = randInt(rng, 0, 59);
  const second = randInt(rng, 0, 59);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function randomDecimal(rng: () => number, nonNegative: boolean): string {
  const magnitude = rng() * 1000;
  const value = nonNegative || rng() > 0.1 ? magnitude : -magnitude;
  return value.toFixed(6);
}

function randomToken(
  rng: () => number,
  columnId: string,
  rowIdx: number,
): string {
  return `${pick(rng, WORD_BANK)}-${columnId.toLowerCase()}-${rowIdx}`;
}

function isCurrencyCodeFormat(column: FocusColumn): boolean {
  return /Currency Code Format/i.test(column.value_format_md ?? "");
}

function isNonNegativeRange(column: FocusColumn): boolean {
  return column.number_range === "Any valid non-negative decimal value";
}

function generateValue(
  rng: () => number,
  column: FocusColumn,
  rowIdx: number,
): string {
  switch (column.data_type) {
    case "Decimal":
      return randomDecimal(rng, isNonNegativeRange(column));
    case "Date/Time":
      return randomDateTime(rng);
    case "JSON":
      return JSON.stringify({ key: `value-${rowIdx}` });
    default: {
      if (column.allowed_values && column.allowed_values.length > 0) {
        return pick(rng, column.allowed_values).value;
      }
      if (isCurrencyCodeFormat(column)) {
        return pick(rng, CURRENCY_CODES);
      }
      return randomToken(rng, column.id, rowIdx);
    }
  }
}

function isQuoted(column: FocusColumn): boolean {
  return column.data_type !== "Decimal" && column.data_type !== "Date/Time";
}

function csvField(raw: string, quoted: boolean): string {
  if (raw === "NULL") return raw;
  return quoted ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/**
 * Generates a spec-conformant, deterministic synthetic FOCUS CSV for a
 * single version's column set. The same (columns, seed, rows) always
 * produces byte-identical output. Every non-null value satisfies its
 * column's data_type/allowed_values/value_format_md/number_range so the
 * result passes validateFocusCsv(columns, ...) with 0 errors; null
 * placement additionally respects allows_nulls so it produces 0 warnings.
 */
export function generateFocusCsv(
  columns: FocusColumn[],
  opts: GenerateFocusCsvOptions,
): string {
  const rng = mulberry32(opts.seed);
  const header = columns.map((c) => c.id);
  const lines = [header.map((id) => csvField(id, true)).join(",")];

  for (let rowIdx = 1; rowIdx <= opts.rows; rowIdx++) {
    const cells = columns.map((column) => {
      const nullable = column.allows_nulls === true;
      // A JSON-typed column with allowed_values enumerates valid *keys*
      // within the JSON object (KeyValueFormat), not the literal value —
      // no single raw string can satisfy both the JSON-parses and the
      // allowed_values-exact-match checks at once, so prefer null when
      // that's permitted (the only real instance today, SkuPriceDetails,
      // is nullable).
      const mustNull =
        nullable &&
        column.data_type === "JSON" &&
        (column.allowed_values?.length ?? 0) > 0;
      const emitNull = mustNull || (nullable && rng() < 0.15);
      const raw = emitNull ? "NULL" : generateValue(rng, column, rowIdx);
      return csvField(raw, isQuoted(column));
    });
    lines.push(cells.join(","));
  }

  return lines.join("\n") + "\n";
}
