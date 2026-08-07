#!/usr/bin/env node
// prepack for packages/finops-focus-mcp: stages a self-contained copy of the
// built focus server (dist/servers/focus + dist/shared, which the server's
// relative imports need) and data/focus into the shim package directory, so
// `npm pack`/`npm publish` run from packages/finops-focus-mcp/ tarball exactly
// that — never the framework server or data/framework (T-036).

import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const pkgDir = join(repoRoot, "packages/finops-focus-mcp");

// Newest mtime under a tree (files only). Used to detect a stale dist:
// existence alone let `npm publish` silently ship an old build after src
// edits, since prepack is the only build step on the focus publish path.
function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    newest = Math.max(
      newest,
      entry.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs,
    );
  }
  return newest;
}

const distFocusServer = join(repoRoot, "dist/servers/focus");
const distShared = join(repoRoot, "dist/shared");
const distStale =
  !existsSync(distFocusServer) ||
  !existsSync(distShared) ||
  newestMtime(join(repoRoot, "src")) > newestMtime(join(repoRoot, "dist"));
if (distStale) {
  execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "inherit" });
}
if (!existsSync(distFocusServer) || !existsSync(distShared)) {
  throw new Error(
    "pack-focus: dist/servers/focus or dist/shared missing after build — check tsconfig.build.json output",
  );
}

const stagedDist = join(pkgDir, "dist");
rmSync(stagedDist, { recursive: true, force: true });
cpSync(distFocusServer, join(stagedDist, "servers/focus"), {
  recursive: true,
});
cpSync(distShared, join(stagedDist, "shared"), { recursive: true });

const stagedData = join(pkgDir, "data/focus");
rmSync(stagedData, { recursive: true, force: true });
cpSync(join(repoRoot, "data/focus"), stagedData, { recursive: true });

// stderr, not stdout: prepack runs inline with `npm pack --json`, whose
// machine-readable result is on stdout.
console.error(
  "pack-focus: staged dist/servers/focus, dist/shared, data/focus into packages/finops-focus-mcp/",
);
