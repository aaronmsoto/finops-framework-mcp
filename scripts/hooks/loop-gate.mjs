#!/usr/bin/env node
// Stop hook: when running inside the supervised loop (AGENTIC_LOOP=1), block
// the agent from ending its turn while fast-tier quality gates are red.
//
// Contract: exit 2 = block turn end (reason on stderr). Exit 0 in every other
// case — not in the loop, stop_hook_active already set (never double-block),
// gates pass, harness not built, or ANY internal error. A broken hook must
// never brick the session.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const GATE_TIMEOUT_MS = 10 * 60 * 1000; // 10-minute guard

try {
  if (process.env.AGENTIC_LOOP !== "1") process.exit(0);

  let input = {};
  try {
    const raw = readFileSync(0, "utf8");
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    // unreadable stdin: fall through with empty input
  }
  if (input.stop_hook_active === true) process.exit(0);

  // Sessions can start in a subdirectory: walk up from cwd to the repo root
  // (marked by agentic.config.json) so gate enforcement is not silently off.
  let repoRoot = input.cwd && typeof input.cwd === "string" ? input.cwd : process.cwd();
  for (let dir = repoRoot; ; ) {
    if (existsSync(resolve(dir, "agentic.config.json"))) {
      repoRoot = dir;
      break;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break; // filesystem root: keep the original cwd
    dir = parent;
  }
  // Same npm-first probe order as scripts/agentic (the vendored copy is gone
  // since Phase C).
  const cli = [
    ".agentic/node_modules/@aaronmsoto/agentic-harness/dist/cli.js",
    "node_modules/@aaronmsoto/agentic-harness/dist/cli.js",
  ]
    .map((c) => resolve(repoRoot, c))
    .find((c) => existsSync(c));
  if (cli === undefined) process.exit(0); // harness not installed: nothing to enforce

  const res = spawnSync(process.execPath, [cli, "gates", "--tier", "fast"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: GATE_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (res.error) process.exit(0); // spawn failure / timeout: allow, don't brick
  if (res.status === 0) process.exit(0); // gates green

  const combined = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const lastLine =
    combined
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .pop() ?? "see ./scripts/agentic gates";
  const summary = lastLine.length > 200 ? lastLine.slice(0, 197) + "..." : lastLine;
  process.stderr.write(`Quality gates failing — fix before stopping: ${summary}\n`);
  process.exit(2);
} catch (err) {
  process.stderr.write(`loop-gate hook error (allowing): ${err?.message ?? err}\n`);
  process.exit(0);
}
