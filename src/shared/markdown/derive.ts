// Generic markdown-dialect splitting/parsing primitives shared by every
// offline derive step (spec §3 for the framework server; the FOCUS server
// reuses the same primitives for its own dialect). Parses ONLY the closed
// dialect (front-matter, `#{1,6} ` headings, `- ` lists with 2-space
// nesting, fenced code) — never re-fetches or re-parses HTML.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { FrontmatterValue } from "./frontmatter.js";

export interface HeadingSection {
  title: string;
  body: string;
}

/**
 * Split `text` on lines that are EXACTLY an `N`-level heading (`#{level} `):
 * a shallower/deeper heading count never false-matches, since markdown
 * heading runs are exact-length (`^#{2}\s` cannot match a `### ` line).
 * Fenced code blocks are tracked so a `#` inside one is never read as a
 * heading. Returns the text before the first such heading (`preamble`) and
 * the ordered sections that follow.
 */
export function splitHeadingSections(
  text: string,
  level: number,
): { preamble: string; sections: HeadingSection[] } {
  const markerRe = new RegExp(`^${"#".repeat(level)}\\s+(.+)$`);
  const preambleLines: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    const m = !inFence ? line.match(markerRe) : null;
    if (m) {
      current = { title: (m[1] as string).trim(), lines: [] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : preambleLines).push(line);
  }
  return {
    preamble: preambleLines.join("\n").trim(),
    sections: sections.map((s) => ({
      title: s.title,
      body: s.lines.join("\n").trim(),
    })),
  };
}

/** Parses a heading's trailing `{key=value}` identity attribute (compose's
 * `{wp_id=N}`/`{slug=x}` convention) — the derive-time inverse of it. */
export function parseHeadingAttr(
  title: string,
  key: string,
): { label: string; value: string } {
  const m = title.match(new RegExp(`^(.*) \\{${key}=([^}]+)\\}$`));
  if (!m) {
    throw new Error(`heading missing {${key}=...} attribute: "${title}"`);
  }
  return { label: (m[1] as string).trim(), value: m[2] as string };
}

export function parseOrderedSlugHeading(title: string): {
  order: number;
  label: string;
  slug: string;
} {
  const attr = parseHeadingAttr(title, "slug");
  const m = attr.label.match(/^(\d+)\.\s+(.*)$/);
  if (!m) throw new Error(`expected "N. Title" heading, got "${title}"`);
  return { order: Number(m[1]), label: m[2] as string, slug: attr.value };
}

export function parseSlugHeading(title: string): {
  label: string;
  slug: string;
} {
  const attr = parseHeadingAttr(title, "slug");
  return { label: attr.label, slug: attr.value };
}

/** Flat `- item` bullet list (no nesting — used for guarded plain-text fields). */
export function parseFlatBulletList(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^- (.*)$/);
    if (m) items.push(m[1] as string);
  }
  return items;
}

export function extractFencedCode(text: string): string | undefined {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === "```");
  if (start < 0) return undefined;
  const end = lines.findIndex((l, i) => i > start && l.trim() === "```");
  if (end < 0) return undefined;
  const inner = lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
  return inner || undefined;
}

/**
 * Verbatim markdown fields preserve inline `**bold**`, `*em*`, and
 * `[text](url)` from `htmlToMd` — but plain-text fields derived from the
 * same list were originally extracted as PLAIN text. This is the inverse of
 * that inline rendering, so re-derived text matches the direct-parse output.
 */
export function stripInlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function str(
  data: Record<string, FrontmatterValue>,
  key: string,
): string {
  const v = data[key];
  if (typeof v !== "string") {
    throw new Error(`front-matter field "${key}" is missing or not a string`);
  }
  return v;
}

export function num(
  data: Record<string, FrontmatterValue>,
  key: string,
): number {
  const v = data[key];
  if (typeof v !== "number") {
    throw new Error(`front-matter field "${key}" is missing or not a number`);
  }
  return v;
}

/** Recursively reads every `.md` file under `dir` into a map keyed by its
 * path relative to `dir`, using forward slashes regardless of platform. */
export function walkMarkdownFiles(
  dir: string,
  base: string = dir,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      for (const [k, v] of walkMarkdownFiles(full, base)) out.set(k, v);
    } else if (entry.endsWith(".md")) {
      const rel = relative(base, full).split(sep).join("/");
      out.set(rel, readFileSync(full, "utf8"));
    }
  }
  return out;
}
