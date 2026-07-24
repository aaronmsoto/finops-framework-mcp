// Plain `key: value` front-matter — no YAML dependency (spec §2). Keys are
// always emitted sorted; values are string | number | string-list (comma
// joined `[a, b]` form). Parsing is the exact inverse of emitting.

export type FrontmatterValue = string | number | string[];

const FENCE = "---";

function formatValue(value: FrontmatterValue): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

/** Emit sorted `key: value` lines between `---` fences (no trailing fence newline). */
export function formatFrontmatter(
  fields: Record<string, FrontmatterValue | undefined>,
): string {
  const keys = Object.keys(fields)
    .filter((k) => fields[k] !== undefined)
    .sort((a, b) => a.localeCompare(b));
  const lines = keys.map(
    (k) => `${k}: ${formatValue(fields[k] as FrontmatterValue)}`,
  );
  return [FENCE, ...lines, FENCE].join("\n");
}

export interface ParsedFrontmatter {
  data: Record<string, FrontmatterValue>;
  body: string;
}

function parseValue(raw: string): FrontmatterValue {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    return inner === "" ? [] : inner.split(", ").map((s) => s.trim());
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return raw;
}

/** Parse a document that begins with a `---`-fenced front-matter block. */
export function parseFrontmatter(text: string): ParsedFrontmatter {
  if (!text.startsWith(`${FENCE}\n`)) {
    throw new Error("document does not begin with a front-matter fence");
  }
  const end = text.indexOf(`\n${FENCE}\n`, FENCE.length + 1);
  if (end < 0) {
    throw new Error("front-matter opening fence has no matching closing fence");
  }
  const raw = text.slice(FENCE.length + 1, end);
  const body = text.slice(end + FENCE.length + 2);
  const data: Record<string, FrontmatterValue> = {};
  for (const line of raw.split("\n")) {
    if (line === "") continue;
    const idx = line.indexOf(": ");
    if (idx < 0) throw new Error(`malformed front-matter line: "${line}"`);
    data[line.slice(0, idx)] = parseValue(line.slice(idx + 2));
  }
  return { data, body };
}
