// Packaging test for the finops-focus-mcp publish shim (T-036, spec
// .agents/specs/focus-mcp-v1.md "Packaging / worker / demo"). Asserts BOTH
// directions of the tarball boundary — the root (framework) package must
// ship no focus server code or focus data, and the finops-focus-mcp shim must
// ship no framework server code or framework data — then proves the shim's
// tarball actually installs and runs offline (using packages already
// resolved for the root project, so no network access is required).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const focusPkgDir = path.join(repoRoot, "packages/finops-focus-mcp");

function ensureBuilt(): void {
  const frameworkMain = path.join(repoRoot, "dist/servers/framework/main.js");
  const focusMain = path.join(repoRoot, "dist/servers/focus/main.js");
  if (!fs.existsSync(frameworkMain) || !fs.existsSync(focusMain)) {
    execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "inherit" });
  }
}

interface PackedFile {
  path: string;
  size: number;
}
interface PackResult {
  filename: string;
  size: number;
  files: PackedFile[];
}

function packDryRun(cwd: string): PackResult {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
  });
  return (JSON.parse(out) as PackResult[])[0];
}

describe("packaging: finops-focus-mcp shim (T-036)", () => {
  beforeAll(() => {
    ensureBuilt();
  }, 120_000);

  it("root (framework) tarball ships no focus server code or focus data", () => {
    const pack = packDryRun(repoRoot);
    const paths = pack.files.map((f) => f.path);

    expect(paths.some((p) => p.startsWith("dist/servers/focus/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("data/focus/"))).toBe(false);

    // sanity: the framework server and its data still ship
    expect(paths).toContain("dist/servers/framework/main.js");
    expect(paths.some((p) => p.startsWith("data/framework/"))).toBe(true);
  });

  it("finops-focus-mcp tarball ships no framework server code or framework data, and is under 1MB", () => {
    const pack = packDryRun(focusPkgDir);
    const paths = pack.files.map((f) => f.path);

    expect(paths.some((p) => p.startsWith("dist/servers/framework/"))).toBe(
      false,
    );
    expect(paths.some((p) => p.startsWith("data/framework/"))).toBe(false);

    expect(paths).toContain("dist/servers/focus/main.js");
    expect(paths.some((p) => p.startsWith("data/focus/"))).toBe(true);
    expect(pack.size).toBeLessThan(1024 * 1024); // packed (compressed) tarball size
  });

  it("packs the shim into scratch, installs it, and runs the bin --version", () => {
    // Scratch prefixes deliberately contain a space: the bin resolves its
    // data dir from import.meta.url, and URL.pathname percent-encodes
    // spaces (broke real installs) — fileURLToPath must survive this path.
    const packScratch = fs.mkdtempSync(path.join(os.tmpdir(), "focus pack "));
    const installScratch = fs.mkdtempSync(
      path.join(os.tmpdir(), "focus install "),
    );
    try {
      const out = execFileSync(
        "npm",
        ["pack", "--pack-destination", packScratch, "--json"],
        { cwd: focusPkgDir, encoding: "utf8" },
      );
      const [{ filename }] = JSON.parse(out) as { filename: string }[];
      const tarball = path.join(packScratch, filename);
      expect(fs.statSync(tarball).size).toBeLessThan(1024 * 1024);

      fs.writeFileSync(
        path.join(installScratch, "package.json"),
        JSON.stringify({ name: "focus-pack-scratch", version: "0.0.0" }),
      );
      // --prefer-offline: @modelcontextprotocol/sdk, ajv, ajv-formats, and
      // zod are resolved dependencies of the root project, so a warm local
      // npm cache serves them without network; strict --offline breaks in
      // CI (ENOTCACHED) because `npm ci` installs from the lockfile without
      // caching packuments, which offline range resolution needs.
      execFileSync(
        "npm",
        [
          "install",
          tarball,
          "--no-save",
          "--no-audit",
          "--no-fund",
          "--prefer-offline",
        ],
        { cwd: installScratch, stdio: "inherit" },
      );

      const bin = path.join(
        installScratch,
        "node_modules/.bin/finops-focus-mcp",
      );
      const versionOut = execFileSync(bin, ["--version"], {
        encoding: "utf8",
      });
      expect(versionOut).toMatch(/^finops-focus-mcp v\d+\.\d+\.\d+/);
    } finally {
      fs.rmSync(packScratch, { recursive: true, force: true });
      fs.rmSync(installScratch, { recursive: true, force: true });
    }
  }, 60_000);
});
