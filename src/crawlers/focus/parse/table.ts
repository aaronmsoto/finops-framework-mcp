/** Minimal GitHub-flavored markdown pipe-table parser — the FOCUS column and
 * attribute files use only simple, single-line-cell tables (spec: "Content
 * constraints (table: ...)"). */

export interface MdTable {
  headers: string[];
  rows: string[][];
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const SEPARATOR_ROW = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** Finds the first pipe table at or after `fromIdx`; returns null if none. */
export function findPipeTable(
  lines: string[],
  fromIdx = 0,
): { table: MdTable; startIdx: number; nextIdx: number } | null {
  for (let i = fromIdx; i < lines.length - 1; i++) {
    const header = lines[i] as string;
    const sep = lines[i + 1] as string;
    if (!header.trim().startsWith("|") || !SEPARATOR_ROW.test(sep)) continue;
    const headers = splitRow(header);
    const rows: string[][] = [];
    let j = i + 2;
    for (; j < lines.length; j++) {
      const line = lines[j] as string;
      if (!line.trim().startsWith("|")) break;
      rows.push(splitRow(line));
    }
    return { table: { headers, rows }, startIdx: i, nextIdx: j };
  }
  return null;
}

const NORMATIVE = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD)\b/;

/**
 * Extracts normative requirement statements from a markdown section. FOCUS
 * column/attribute intros state requirements either as top-level bullets
 * (`* X MUST ...`) or, for a handful of columns, as plain prose sentences —
 * both forms appear verbatim across the two ingested tags, so both are
 * handled (spec "Ingestion rules": parse only the structured sections).
 */
export function extractRequirements(sectionMd: string): string[] {
  const lines = sectionMd.split("\n");
  const topLevelBullets = lines.filter((l) => /^[*-]\s+/.test(l));
  const fromBullets = topLevelBullets
    .map((l) => l.replace(/^[*-]\s+/, "").trim())
    .filter((l) => NORMATIVE.test(l));
  if (fromBullets.length > 0) return fromBullets;

  const prose = lines
    .filter((l) => !/^\s*[*-]\s+/.test(l) && !/^```/.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!prose) return [];
  return prose
    .split(/(?<=[.?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => NORMATIVE.test(s));
}
