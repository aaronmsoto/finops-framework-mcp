#!/usr/bin/env node
// PreToolUse hook (matcher: Edit|Write|MultiEdit): blocks agent edits to
// owner-approval files listed in approvals.yaml `protected_paths`.
//
// Contract: exit 2 = block (reason on stderr). ANY internal error = allow
// (exit 0, note on stderr) — a broken hook must never brick the session.
// Human override for a supervised edit: `touch .agents/.cache/policy-edit-ok`.

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, isAbsolute, sep, dirname } from "node:path";

const FALLBACK_PROTECTED = [
  "approvals.yaml",
  "agentic.config.json",
  ".claude/settings.json",
  ".github/workflows/**",
];

// The session may start in a SUBDIRECTORY of the repo, so the hook's cwd is
// not necessarily the repo root. Walk up (bounded) until a directory holding
// approvals.yaml or agentic.config.json is found; fall back to the starting
// directory (the previous behavior) when nothing matches — still fail-open.
function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 64; i++) {
    if (existsSync(resolve(dir, "approvals.yaml")) || existsSync(resolve(dir, "agentic.config.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root reached
    dir = parent;
  }
  return resolve(startDir);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Tiny YAML-subset parser: extracts the flat string-list under a top-level
// `protected_paths:` key. Anything it can't parse falls back to the
// hardcoded list — this is a tripwire, not a YAML implementation.
function loadProtectedPaths(repoRoot) {
  try {
    const text = readFileSync(resolve(repoRoot, "approvals.yaml"), "utf8");
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((l) => /^protected_paths:\s*(#.*)?$/.test(l));
    if (start === -1) return FALLBACK_PROTECTED;
    const paths = [];
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*(#.*)?$/.test(line)) continue; // blank or comment
      const m = line.match(/^\s+-\s*(.+?)\s*$/);
      if (!m) break; // end of the list block
      let item = m[1].replace(/\s+#.*$/, "");
      item = item.replace(/^["']|["']$/g, "");
      if (item) paths.push(item);
    }
    return paths.length > 0 ? paths : FALLBACK_PROTECTED;
  } catch {
    return FALLBACK_PROTECTED;
  }
}

// Minimal glob: `**` crosses directories, `*` does not. A pattern without
// wildcards also protects everything beneath it if it is a directory.
function globToRegExp(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i++;
        if (pattern[i + 1] === "/") i++; // "**/" also matches zero dirs
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^(?:" + re + ")$");
}

function isProtected(relPath, patterns) {
  return patterns.some((p) => {
    if (globToRegExp(p).test(relPath)) return true;
    // "dir/**" also protects the directory path itself
    if (p.endsWith("/**") && relPath === p.slice(0, -3)) return true;
    return false;
  });
}

try {
  const raw = readStdin();
  if (!raw.trim()) process.exit(0);
  const input = JSON.parse(raw);
  const toolInput = input.tool_input ?? {};
  const target = toolInput.file_path ?? toolInput.path;
  if (!target || typeof target !== "string") process.exit(0);

  const startDir = input.cwd && typeof input.cwd === "string" ? input.cwd : process.cwd();
  const repoRoot = findRepoRoot(startDir);
  const abs = isAbsolute(target) ? target : resolve(repoRoot, target);
  let rel = relative(repoRoot, abs).split(sep).join("/");
  if (rel.startsWith("..")) rel = abs.split(sep).join("/"); // outside repo: match on raw path

  const patterns = loadProtectedPaths(repoRoot);
  if (!isProtected(rel, patterns)) process.exit(0);

  if (existsSync(resolve(repoRoot, ".agents/.cache/policy-edit-ok"))) {
    process.exit(0); // human placed the override marker: supervised edit allowed
  }

  process.stderr.write(
    `Blocked: ${rel} is an owner-approval file (approvals.yaml protected_paths) — do not edit it unless your task explicitly says so; a human can permit a supervised edit with: touch .agents/.cache/policy-edit-ok\n`
  );
  process.exit(2);
} catch (err) {
  process.stderr.write(`protect-policy hook error (allowing): ${err?.message ?? err}\n`);
  process.exit(0);
}
