// Generic markdown-compose infra shared by every canonical-markdown dialect
// (spec §2 for the framework server; the FOCUS server reuses the same
// primitives for its own dialect). Concrete per-entity composers stay next
// to their own domain types.
import { formatFrontmatter, type FrontmatterValue } from "./frontmatter.js";

/** Thrown when compose input would break the markdown dialect. */
export class ComposeError extends Error {}

/**
 * Escaping guard: a plain-text item/label may not start with `-`/`#` (would
 * be misread as a list marker or heading) or contain a newline (would break
 * line-based list/heading detection). Verbatim already-markdown fields are
 * NOT run through this — they are inserted as-is.
 */
export function guard(text: string, where: string): string {
  if (text.includes("\n")) {
    throw new ComposeError(`${where}: plain-text item contains a newline`);
  }
  if (/^[-#]/.test(text)) {
    throw new ComposeError(
      `${where}: plain-text item starts with "${text[0]}" — would break the markdown dialect`,
    );
  }
  return text;
}

export function bulletLines(
  items: string[],
  where: string,
  indent = "",
): string {
  return items.map((item) => `${indent}- ${guard(item, where)}`).join("\n");
}

export function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

/** Joins top-level blocks with a single blank line; trims outer whitespace. */
export function assembleBody(blocks: string[]): string {
  return blocks
    .filter((b) => b.length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Assembles a full document: front-matter fence + blank-line-joined body. */
export function doc(
  frontmatter: Record<string, FrontmatterValue | undefined>,
  blocks: string[],
): string {
  return `${formatFrontmatter(frontmatter)}\n\n${assembleBody(blocks)}\n`;
}
