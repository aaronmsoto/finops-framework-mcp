#!/usr/bin/env node
// prepack for packages/focus-spec-mcp: stages a self-contained copy of the
// built focus server (dist/servers/focus + dist/shared, which the server's
// relative imports need) and data/focus into the shim package directory, so
// `npm pack`/`npm publish` run from packages/focus-spec-mcp/ tarball exactly
// that — never the framework server or data/framework (T-036).

import { cpSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const pkgDir = join(repoRoot, "packages/focus-spec-mcp");

const distFocusServer = join(repoRoot, "dist/servers/focus");
const distShared = join(repoRoot, "dist/shared");
if (!existsSync(distFocusServer) || !existsSync(distShared)) {
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
  "pack-focus: staged dist/servers/focus, dist/shared, data/focus into packages/focus-spec-mcp/",
);
