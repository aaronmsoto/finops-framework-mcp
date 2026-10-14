#!/usr/bin/env node
// prepack for packages/tokenomics-overview-mcp: stages a self-contained copy of the
// built tokenomics server (dist/servers/tokenomics + dist/shared, which the server's
// relative imports need) and data/tokenomics into the shim package directory, so
// `npm pack`/`npm publish` run from packages/tokenomics-overview-mcp/ tarball exactly
// that — never the framework or FOCUS servers or their data.

import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const pkgDir = join(repoRoot, "packages/tokenomics-overview-mcp");

// Newest mtime under a tree (files only). Used to detect a stale dist:
// existence alone let `npm publish` silently ship an old build after src
// edits, since prepack is the only build step on the tokenomics publish path.
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

const distServer = join(repoRoot, "dist/servers/tokenomics");
const distShared = join(repoRoot, "dist/shared");
const distStale =
  !existsSync(distServer) ||
  !existsSync(distShared) ||
  newestMtime(join(repoRoot, "src")) > newestMtime(join(repoRoot, "dist"));
if (distStale) {
  execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "inherit" });
}
if (!existsSync(distServer) || !existsSync(distShared)) {
  throw new Error(
    "pack-tokenomics: dist/servers/tokenomics or dist/shared missing after build — check tsconfig.build.json output",
  );
}

const stagedDist = join(pkgDir, "dist");
rmSync(stagedDist, { recursive: true, force: true });
cpSync(distServer, join(stagedDist, "servers/tokenomics"), {
  recursive: true,
});
cpSync(distShared, join(stagedDist, "shared"), { recursive: true });

const stagedData = join(pkgDir, "data/tokenomics");
rmSync(stagedData, { recursive: true, force: true });
cpSync(join(repoRoot, "data/tokenomics"), stagedData, { recursive: true });

// stderr, not stdout: prepack runs inline with `npm pack --json`, whose
// machine-readable result is on stdout.
console.error(
  "pack-tokenomics: staged dist/servers/tokenomics, dist/shared, data/tokenomics into packages/tokenomics-overview-mcp/",
);
