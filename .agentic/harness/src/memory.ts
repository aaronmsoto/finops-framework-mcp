import fs from "node:fs";
import path from "node:path";
import type { AgenticConfig } from "./config.js";
import { journalTail } from "./journal.js";
import { countLines, git, readTextIfExists } from "./util.js";

export interface MemoryLintResult {
  failures: string[];
  warnings: string[];
}

export const AGENTS_MD_WARN_LINES = 170;

/**
 * Enforce memory budgets and staleness:
 * - MEMORY.md over memory.coreBudgetLines -> failure (missing file -> failure).
 * - AGENTS.md over 170 lines -> warning.
 * - activeContext.md untouched for > staleDays while the repo kept moving -> warning.
 * Warnings exit 0 (printed clearly); failures exit 1.
 */
export function lintMemory(rootDir: string, config: AgenticConfig): MemoryLintResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const memDir = path.join(rootDir, config.memory.dir);

  const memoryFile = path.join(memDir, "MEMORY.md");
  const memoryText = readTextIfExists(memoryFile);
  if (memoryText === null) {
    failures.push(
      `${rel(rootDir, memoryFile)} not found — the memory bank is not initialized. Run \`agentic init\` or create the file (see .agentic/docs/architecture.md "Memory").`,
    );
  } else {
    const lines = countLines(memoryText);
    if (lines > config.memory.coreBudgetLines) {
      failures.push(
        `${rel(rootDir, memoryFile)} is ${lines} lines — over the ${config.memory.coreBudgetLines}-line core budget. Curate it down (move detail to decisions.md/patterns.md).`,
      );
    }
  }

  const agentsFile = path.join(rootDir, "AGENTS.md");
  const agentsText = readTextIfExists(agentsFile);
  if (agentsText !== null) {
    const lines = countLines(agentsText);
    if (lines > AGENTS_MD_WARN_LINES) {
      warnings.push(`AGENTS.md is ${lines} lines (soft budget ~150, warn over ${AGENTS_MD_WARN_LINES}) — trim it; agents read this every session.`);
    }
  }

  const activeFile = path.join(memDir, "activeContext.md");
  if (!fs.existsSync(activeFile)) {
    warnings.push(`${rel(rootDir, activeFile)} not found — create it so the next session has a handoff.`);
  } else {
    const staleness = activeContextStaleness(rootDir, activeFile);
    if (staleness !== null && staleness.staleSeconds > config.memory.staleDays * 86_400) {
      const days = Math.floor(staleness.staleSeconds / 86_400);
      warnings.push(
        `${rel(rootDir, activeFile)} is stale: last touched ${days} days before the latest commit (staleDays: ${config.memory.staleDays}). Update the handoff file.`,
      );
    }
  }

  return { failures, warnings };
}

function rel(rootDir: string, file: string): string {
  return path.relative(rootDir, file) || file;
}

/**
 * How far activeContext.md lags behind HEAD: last commit touching the file
 * (fallback: filesystem mtime) vs. the HEAD commit time. Null when the repo
 * has no usable git history to compare against.
 */
function activeContextStaleness(rootDir: string, activeFile: string): { staleSeconds: number } | null {
  // git prints nothing (empty stdout, exit 0) for files with no history, and
  // Number("") is 0 — parse via a helper so "no history" is NaN, not epoch 0.
  const headTs = parseTimestamp(git(rootDir, ["log", "-1", "--format=%ct"]));
  if (!Number.isFinite(headTs)) return null;

  let fileTs = parseTimestamp(git(rootDir, ["log", "-1", "--format=%ct", "--", path.relative(rootDir, activeFile)]));
  if (!Number.isFinite(fileTs)) {
    try {
      fileTs = fs.statSync(activeFile).mtimeMs / 1000;
    } catch {
      return null;
    }
  }
  return { staleSeconds: headTs - fileTs };
}

function parseTimestamp(res: { ok: boolean; stdout: string }): number {
  if (!res.ok) return NaN;
  const trimmed = res.stdout.trim();
  return trimmed === "" ? NaN : Number(trimmed);
}

/** Compact session-start banner: MEMORY.md + activeContext.md + last 3 journal entries. */
export function memorySessionBanner(rootDir: string, config: AgenticConfig): string {
  const memDir = path.join(rootDir, config.memory.dir);
  const sections: string[] = [];
  for (const name of ["MEMORY.md", "activeContext.md"]) {
    const text = readTextIfExists(path.join(memDir, name));
    sections.push(`===== ${config.memory.dir}/${name} =====`);
    sections.push(text !== null ? text.trimEnd() : "(missing)");
    sections.push("");
  }
  sections.push("===== .agents/journal/ (last 3 entries) =====");
  const tail = journalTail(rootDir, 3);
  sections.push(tail.length > 0 ? tail.join("\n\n") : "(no journal entries)");
  sections.push("");
  return sections.join("\n");
}

/** Short overview for plain `memory show`: files, line counts, budgets. */
export function memorySummary(rootDir: string, config: AgenticConfig): string {
  const memDir = path.join(rootDir, config.memory.dir);
  const lines: string[] = [`memory bank: ${config.memory.dir} (core budget ${config.memory.coreBudgetLines} lines, staleDays ${config.memory.staleDays})`];
  for (const name of ["MEMORY.md", "decisions.md", "patterns.md", "activeContext.md"]) {
    const text = readTextIfExists(path.join(memDir, name));
    lines.push(text !== null ? `  ${name}: ${countLines(text)} lines` : `  ${name}: missing`);
  }
  return lines.join("\n");
}
