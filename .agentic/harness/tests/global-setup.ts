// Builds dist/ once before the test run so tests (e.g. mock loop scripts
// completing tasks through the real CLI) can spawn node dist/cli.js.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default function globalSetup(): void {
  const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const tsc = path.join(harnessRoot, "node_modules", "typescript", "bin", "tsc");
  const res = spawnSync(process.execPath, [tsc, "-p", path.join(harnessRoot, "tsconfig.json")], {
    cwd: harnessRoot,
    stdio: "inherit",
  });
  if (res.status !== 0) throw new Error(`tsc build failed in global setup (exit ${res.status})`);
}
