// vitest globalSetup: guarantee dist/ exists before the suite runs.
//
// Why this is load-bearing, not a convenience: several integration tests
// execute the BUILT bin through a node_modules/.bin-style symlink
// (src/servers/framework/main.test.ts, src/servers/focus/main.test.ts) and
// are gated with `describe.skipIf(!existsSync(DIST_MAIN))`. Those are the
// regression guard for the shipped-broken-bin incident in
// docs/critique-3-publish-gate.md — the bug where the npm bin entry never
// started the server, exiting 0 with no diagnostics and silently breaking
// every documented install path.
//
// CI never ran them: the fast tier runs `npm test` without a build and the
// full tier runs the build without the tests, so the skipIf was always true
// in CI and the guard only fired for someone who happened to have built
// locally. Building here makes them execute wherever `npm test` runs.
//
// Same ensure-built shape as scripts/gen-mcp-surface.mjs, kept deliberately
// dumb: existence check only, no staleness comparison. A stale dist is the
// build's problem, not the test runner's.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

export default function setup() {
  const builtBins = [
    join(ROOT, "dist/servers/framework/main.js"),
    join(ROOT, "dist/servers/focus/main.js"),
  ];
  if (builtBins.every((p) => existsSync(p))) return;
  execFileSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
}
