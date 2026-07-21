import fs from "node:fs";
import path from "node:path";
import type { AgenticConfig, BranchingPolicy } from "./config.js";
import { git, matchesAnyGlob } from "./util.js";

export interface IntegrityResult {
  /** "checked" when a diff was analyzed; "skipped" when the base ref is unresolvable. */
  status: "checked" | "skipped";
  base: string;
  notice?: string;
  failures: string[];
  warnings: string[];
}

export const DEFAULT_BASE = "origin/main";

/**
 * Pick the integrity base ref from branching policy instead of a hardcoded
 * constant, so a repo whose default branch is not `main` (or whose remote is
 * not `origin/main`) still gets a real anti-gaming diff instead of a silent
 * skip. Order: the branch this repo's work targets (integration branch in
 * integration mode, else the default branch), then the remote's own default
 * (origin/HEAD), then the legacy constant. runIntegrity still resolves the
 * chosen ref and skips gracefully if none exist.
 */
export function resolveDefaultBase(rootDir: string, policy: BranchingPolicy): string {
  const targetBranch = policy.mode === "integration" ? policy.integration_branch : policy.default_branch;
  const candidates = [`origin/${targetBranch}`];
  const remoteHead = git(rootDir, ["rev-parse", "--abbrev-ref", "origin/HEAD"]);
  if (remoteHead.ok) {
    const ref = remoteHead.stdout.trim();
    if (ref !== "") candidates.push(ref);
  }
  candidates.push(DEFAULT_BASE);
  for (const ref of candidates) {
    if (git(rootDir, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).ok) return ref;
  }
  // Nothing resolves — return the primary candidate so the skip notice names
  // the branch this repo actually targets, not a misleading `origin/main`.
  return candidates[0]!;
}

// Focus markers that silently narrow a test run. Regexes are built so this
// source file itself never contains the literal marker text.
const FOCUS_MARKERS: Array<{ label: string; re: RegExp }> = [
  { label: ".only", re: /\.only\s*\(/ },
  { label: "fit", re: /\bfit\s*\(/ },
  { label: "fdescribe", re: /\bfdescribe\s*\(/ },
];

const TEST_CALLSITE_RES: RegExp[] = [/\bit\s*\(/g, /\btest\s*\(/g, /\bdef\s+test_/g];

const POLICY_FILES = ["approvals.yaml", "agentic.config.json"];
const POLICY_DIR_PREFIX = ".github/workflows/";
const JOURNAL_DIR_PREFIX = ".agents/journal/";
const DECISIONS_FILE = ".agents/memory/decisions.md";
const MAX_SUBJECT_CHARS = 72;

interface DiffEntry {
  status: "A" | "M" | "D" | "R";
  path: string;
  oldPath?: string;
}

/**
 * Anti-gaming diff checks against a base ref (default origin/main). Compares
 * the base's merge-base with HEAD against the current working tree, so
 * uncommitted edits are caught too.
 */
export function runIntegrity(
  rootDir: string,
  config: AgenticConfig,
  opts: { base?: string } = {},
): IntegrityResult {
  const base = opts.base ?? DEFAULT_BASE;
  const failures: string[] = [];
  const warnings: string[] = [];

  const resolved = git(rootDir, ["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  if (!resolved.ok) {
    return {
      status: "skipped",
      base,
      notice: `integrity: base ref "${base}" is unresolvable in this repository — skipping diff checks (nothing to compare against). Pass --base <ref> to compare against a different ref.`,
      failures,
      warnings,
    };
  }
  const mergeBaseRes = git(rootDir, ["merge-base", base, "HEAD"]);
  const compareRef = mergeBaseRes.ok ? mergeBaseRes.stdout.trim() : resolved.stdout.trim();

  // -z: NUL-separated records with RAW paths — git's default C-style quoting
  // of non-ASCII/quoted filenames would otherwise break parsing and make
  // deleted-test detection silently miss them.
  const nameStatus = git(rootDir, ["diff", "--name-status", "-z", "-M", compareRef]);
  if (!nameStatus.ok) {
    return {
      status: "skipped",
      base,
      notice: `integrity: could not diff against ${base} (${nameStatus.stderr.trim()}) — skipping.`,
      failures,
      warnings,
    };
  }
  const entries = parseNameStatus(nameStatus.stdout);
  const testGlobs = config.project.testGlobs;

  // 1. Deleted test files -> fail.
  for (const e of entries) {
    if (e.status === "D" && matchesAnyGlob(e.path, testGlobs)) {
      failures.push(`deleted test file: ${e.path} (protected by project.testGlobs). Restore it or land the deletion as its own human-reviewed change.`);
    }
  }

  // 1b. Journal files are append-only history: a session may ADD its own
  // dated file, but never modify or delete a file that already exists at the
  // comparison base — that is another session's record. README.md (the
  // convention doc) is the one legitimately editable file in the directory.
  for (const e of entries) {
    if (e.status === "A") continue; // added in this diff: the session's own file
    const p = e.oldPath ?? e.path;
    if (!p.startsWith(JOURNAL_DIR_PREFIX)) continue;
    if (p.split("/").pop() === "README.md") continue;
    // Only files that exist at the base are someone else's history.
    if (!git(rootDir, ["cat-file", "-e", `${compareRef}:${p}`]).ok) continue;
    failures.push(
      `journal file ${p} was modified/deleted — journal files are append-only history owned by their original session; write your own dated file instead.`,
    );
  }

  // 2. Added focus markers in changed TEST files -> fail. Markers are only
  // harmful where a runner honors them; docs or source merely MENTIONING
  // `.only(` must not fail the gate (found the hard way on the bootstrap PR).
  const fullDiff = git(rootDir, ["-c", "core.quotepath=false", "diff", "--unified=0", "-M", compareRef]);
  if (fullDiff.ok) {
    for (const found of scanAddedLines(fullDiff.stdout, testGlobs)) {
      failures.push(`focus marker ${found.label}( added in ${found.file} — remove it; focused tests silently skip the rest of the suite.`);
    }

    // 2b. The decision log is append-only: any removed line in decisions.md
    // (edit or wholesale deletion) rewrites recorded history.
    if (hasRemovedLines(fullDiff.stdout, DECISIONS_FILE)) {
      failures.push(`decisions.md lines were removed — the decision log is append-only; supersede with a new entry instead.`);
    }
  }

  // 3. Decreased total test callsites across changed test files -> warn.
  const changedTestFiles = new Set<string>();
  for (const e of entries) {
    if (matchesAnyGlob(e.path, testGlobs)) changedTestFiles.add(e.path);
    if (e.oldPath && matchesAnyGlob(e.oldPath, testGlobs)) changedTestFiles.add(e.oldPath);
  }
  let baseCount = 0;
  let currentCount = 0;
  for (const file of changedTestFiles) {
    const baseContent = git(rootDir, ["show", `${compareRef}:${file}`]);
    baseCount += baseContent.ok ? countCallsites(baseContent.stdout) : 0;
    try {
      currentCount += countCallsites(fs.readFileSync(path.join(rootDir, file), "utf8"));
    } catch {
      // deleted or renamed away — counts as 0
    }
  }
  if (currentCount < baseCount) {
    warnings.push(
      `test callsite count decreased across changed test files: ${baseCount} -> ${currentCount}. If tests were consolidated deliberately, say so in the journal; otherwise restore them.`,
    );
  }

  // 4. Mixed implementation + test/policy diff -> warn.
  const implFiles: string[] = [];
  const sensitiveFiles: string[] = [];
  for (const e of entries) {
    for (const p of e.oldPath ? [e.path, e.oldPath] : [e.path]) {
      if (isSensitive(p, testGlobs)) sensitiveFiles.push(p);
      else if (isImplementation(p, config)) implFiles.push(p);
    }
  }
  if (implFiles.length > 0 && sensitiveFiles.length > 0) {
    warnings.push(
      `diff mixes implementation (${implFiles.length} file(s), e.g. ${implFiles[0]}) with tests/policy (${sensitiveFiles.length} file(s), e.g. ${sensitiveFiles[0]}). ` +
        `Changing behavior and its own guardrails in one change deserves a human look — split it if possible.`,
    );
  }

  // 5. AI-attribution markers in new commit messages -> fail (owner policy:
  // no AI attribution in git artifacts — see AGENTS.md Conventions and
  // decisions.md 2026-07-14). The prepare-commit-msg hook strips these
  // best-effort; this check is the enforcement. Commit MESSAGES only —
  // functional references to agent tooling in code/docs are out of scope,
  // and human Co-Authored-By trailers do not match.
  const logRes = git(rootDir, ["log", "--format=%h%x00%B%x01", `${compareRef}..HEAD`]);
  if (logRes.ok) {
    for (const record of logRes.stdout.split("\x01")) {
      const sep = record.indexOf("\x00");
      if (sep === -1) continue;
      const short = record.slice(0, sep).trim();
      const message = record.slice(sep + 1);
      // 5b. Subject length -> warn (convention: imperative subject <= 72
      // chars). Merge commits carry generated subjects and are exempt.
      const subject = (message.split("\n", 1)[0] ?? "").replace(/\r$/, "");
      if (subject.length > MAX_SUBJECT_CHARS && !subject.startsWith("Merge ")) {
        warnings.push(`commit ${short} subject is ${subject.length} chars (max ${MAX_SUBJECT_CHARS}): "${subject.slice(0, 50)}..."`);
      }
      for (const marker of AI_ATTRIBUTION_RES) {
        const m = marker.exec(message);
        if (m) {
          failures.push(
            `AI-attribution marker in commit ${short}: "${m[0].trim().slice(0, 80)}" — owner policy forbids AI attribution in commits/PRs. Reword the commit (git commit --amend / rebase) before pushing.`,
          );
          break; // one failure per commit is enough
        }
      }
    }
  }

  return { status: "checked", base, failures, warnings };
}

// AI-tool attribution patterns for commit messages. Anchored to line starts
// where the marker is a trailer, and scoped to known AI-tool identities so
// human co-authors never match.
const AI_ATTRIBUTION_RES: RegExp[] = [
  /^co-authored-by:.*\b(claude|copilot|anthropic|openai|gemini|cursor|aider|devin)\b.*$/im,
  /^claude-session:.*$/im,
  /^agent:\s*(claude|copilot).*$/im,
  /^.*generated with.*\b(claude|copilot)\b.*$/im,
  /^.*🤖.*$/im,
];

function isSensitive(p: string, testGlobs: string[]): boolean {
  return matchesAnyGlob(p, testGlobs) || POLICY_FILES.includes(p) || p.startsWith(POLICY_DIR_PREFIX);
}

function isImplementation(p: string, config: AgenticConfig): boolean {
  const srcDirs = config.project.srcDirs;
  if (srcDirs.length === 0) return true; // no srcDirs declared: any non-test, non-policy file counts
  return srcDirs.some((d) => p === d || p.startsWith(d.endsWith("/") ? d : d + "/"));
}

/**
 * Parse `git diff --name-status -z` output: NUL-separated records of
 * status, [oldPath (renames/copies only)], path. Paths arrive raw (never
 * C-style quoted), so non-ASCII characters and quotes in filenames survive
 * intact and can be passed verbatim to `git show <ref>:<path>`.
 */
function parseNameStatus(output: string): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const tokens = output.split("\0");
  for (let i = 0; i < tokens.length; ) {
    const code = tokens[i]!;
    if (code === "") {
      i++;
      continue;
    }
    const kind = code[0]!;
    if (kind === "R" || kind === "C") {
      // Two path tokens: old path, then new path.
      const oldPath = tokens[i + 1];
      const newPath = tokens[i + 2];
      if (oldPath !== undefined && oldPath !== "" && newPath !== undefined && newPath !== "") {
        entries.push({ status: kind === "R" ? "R" : "M", oldPath, path: newPath });
      }
      i += 3;
    } else {
      const p = tokens[i + 1];
      if (p !== undefined && p !== "") {
        const status = kind === "A" || kind === "M" || kind === "D" ? (kind as DiffEntry["status"]) : "M";
        entries.push({ status, path: p });
      }
      i += 2;
    }
  }
  return entries;
}

function* scanAddedLines(unifiedDiff: string, testGlobs: string[]): Generator<{ file: string; label: string }> {
  let currentFile = "(unknown)";
  let fileIsTest = false;
  const seen = new Set<string>();
  for (const line of unifiedDiff.split("\n")) {
    if (line.startsWith("+++ ")) {
      currentFile = line.replace(/^\+\+\+ (b\/)?/, "").trim();
      fileIsTest = matchesAnyGlob(currentFile, testGlobs);
      continue;
    }
    if (!fileIsTest || !line.startsWith("+") || line.startsWith("+++")) continue;
    for (const marker of FOCUS_MARKERS) {
      if (marker.re.test(line)) {
        const key = `${currentFile}:${marker.label}`;
        if (!seen.has(key)) {
          seen.add(key);
          yield { file: currentFile, label: marker.label };
        }
      }
    }
  }
}

/**
 * Does the unified diff (-U0) contain any removed line within the given
 * file's hunks? File tracking follows "--- " headers (the OLD path — removed
 * lines belong to the base version, and a full deletion has "+++ /dev/null").
 */
function hasRemovedLines(unifiedDiff: string, file: string): boolean {
  let inFile = false;
  for (const line of unifiedDiff.split("\n")) {
    if (line.startsWith("--- ")) {
      inFile = line.replace(/^--- (a\/)?/, "").trim() === file;
      continue;
    }
    if (inFile && line.startsWith("-") && !line.startsWith("---")) return true;
  }
  return false;
}

export function countCallsites(content: string): number {
  let count = 0;
  for (const re of TEST_CALLSITE_RES) {
    count += content.match(re)?.length ?? 0;
  }
  return count;
}
