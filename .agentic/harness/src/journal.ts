import fs from "node:fs";
import path from "node:path";
import { ensureDir, nowIso, readTextIfExists } from "./util.js";

// Journal layout: .agents/journal/ holds one file per session or loop run,
// named YYYYMMDD-<slug>.md. A session/run only ever appends to its OWN file,
// so parallel agents never conflict on a shared append-file. README.md inside
// the directory is reserved for the convention doc and is never an entry.

export function journalDirPath(rootDir: string): string {
  return path.join(rootDir, ".agents", "journal");
}

/** The pre-directory single-file journal; still read as a tail fallback mid-migration. */
export function legacyJournalPath(rootDir: string): string {
  return path.join(rootDir, ".agents", "journal.md");
}

/** Coerce arbitrary input to a valid slug ([a-z0-9][a-z0-9-]*). Sanitizes, never throws. */
export function sanitizeSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "entry" : slug;
}

/** LOCAL-time YYYYMMDD: journal files group by the writer's calendar day. */
export function localDateStamp(date = new Date()): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export interface JournalEntry {
  /** Identifier for the writing session/run (kebab-case; sanitized, never rejected). */
  slug: string;
  /** Section heading; defaults to the slug. */
  title?: string;
  /** Body lines written verbatim under the heading. */
  lines: string[];
}

/**
 * Append an entry to this session's file: .agents/journal/<YYYYMMDD>-<slug>.md.
 * Same date + same slug = the same actor's file, so repeat calls append
 * further `## <title> — <ISO timestamp>` sections to it. Creates the
 * directory/file on first use. Returns the absolute file path.
 */
export function appendJournalEntry(rootDir: string, entry: JournalEntry): string {
  const slug = sanitizeSlug(entry.slug);
  const dir = journalDirPath(rootDir);
  ensureDir(dir);
  const file = path.join(dir, `${localDateStamp()}-${slug}.md`);
  const existing = readTextIfExists(file);
  const block: string[] = [];
  if (existing !== null) {
    if (!existing.endsWith("\n")) block.push("");
    block.push(""); // blank line between sections
  }
  block.push(`## ${entry.title ?? slug} — ${nowIso()}`, "", ...entry.lines, "");
  fs.appendFileSync(file, block.join("\n"));
  return file;
}

/**
 * Return the newest `count` journal entry files' trimmed contents,
 * oldest-first. Entry files are *.md under .agents/journal/ except README.md;
 * the YYYYMMDD filename prefix makes filename order chronological. When the
 * directory has no entries but the legacy .agents/journal.md still exists,
 * fall back to parsing it so nothing breaks mid-migration.
 */
export function journalTail(rootDir: string, count: number): string[] {
  const dir = journalDirPath(rootDir);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  } catch {
    files = [];
  }
  if (files.length === 0) return legacyJournalTail(rootDir, count);
  return files
    .sort()
    .reverse()
    .slice(0, count)
    .reverse()
    .map((f) => (readTextIfExists(path.join(dir, f)) ?? "").trim())
    .filter((text) => text !== "");
}

/** Last `count` entries (each starting with "## ") of the legacy single-file journal, or []. */
function legacyJournalTail(rootDir: string, count: number): string[] {
  const text = readTextIfExists(legacyJournalPath(rootDir));
  if (text === null) return [];
  const entries: string[] = [];
  let current: string[] | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) entries.push(current.join("\n").trimEnd());
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) entries.push(current.join("\n").trimEnd());
  return entries.slice(-count);
}
