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

const NORMATIVE = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD|RECOMMENDED|MAY)\b/;

interface BulletNode {
  text: string;
  children: BulletNode[];
}

const BULLET_LINE = /^(\s*)[*-]\s+(.*)$/;

/** Builds a forest of bullets from indentation (FOCUS 1.2 nests scoped
 * requirements 2 spaces per level, e.g. "X nullability is defined as
 * follows:" introducing per-case MUSTs). */
function buildBulletForest(lines: string[]): BulletNode[] {
  const roots: BulletNode[] = [];
  const stack: { indent: number; node: BulletNode }[] = [];
  for (const line of lines) {
    const match = BULLET_LINE.exec(line);
    if (!match) continue;
    const indent = (match[1] as string).length;
    const node: BulletNode = {
      text: (match[2] as string).trim(),
      children: [],
    };
    while (
      stack.length > 0 &&
      (stack[stack.length - 1] as { indent: number }).indent >= indent
    ) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      (stack[stack.length - 1] as { node: BulletNode }).node.children.push(
        node,
      );
    }
    stack.push({ indent, node });
  }
  return roots;
}

/** Walks the bullet forest depth-first, emitting every normative bullet —
 * nested ones prefixed with the chain of their ancestors' own bullet text
 * (the scoping clause each level introduces, e.g. "SkuId nullability is
 * defined as follows: SkuId MUST be null when ..."). */
function collectNormative(
  nodes: BulletNode[],
  ancestorClauses: string[],
  out: string[],
): void {
  for (const node of nodes) {
    if (NORMATIVE.test(node.text)) {
      const prefix =
        ancestorClauses.length > 0 ? `${ancestorClauses.join(": ")}: ` : "";
      out.push(`${prefix}${node.text}`);
    }
    if (node.children.length > 0) {
      collectNormative(
        node.children,
        [...ancestorClauses, node.text.replace(/:$/, "")],
        out,
      );
    }
  }
}

/**
 * Extracts normative requirement statements from a markdown section. FOCUS
 * column/attribute intros state requirements either as (possibly nested)
 * bullets (`* X MUST ...`) or, for a handful of columns, as plain prose
 * sentences — both forms appear verbatim across the two ingested tags, so
 * both are handled (spec "Ingestion rules": parse only the structured
 * sections).
 */
export function extractRequirements(sectionMd: string): string[] {
  const lines = sectionMd.split("\n");
  const hasTopLevelBullets = lines.some((l) => /^[*-]\s+/.test(l));
  if (hasTopLevelBullets) {
    const forest = buildBulletForest(lines);
    const out: string[] = [];
    collectNormative(forest, [], out);
    return out;
  }

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
