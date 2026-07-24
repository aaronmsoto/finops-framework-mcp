import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "./server.js";
import { detectDirectRun, runCli } from "./main.js";

vi.mock("./server.js", () => ({
  createServer: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("direct-run detection (npm .bin symlink regression, critique-3 A4-community-1)", () => {
  const savedArgv1 = process.argv[1];
  let tmp: string | null = null;
  afterEach(() => {
    process.argv[1] = savedArgv1;
    if (tmp !== null) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = null;
  });

  it("recognizes invocation through a symlink to this module (npm's .bin mechanism)", () => {
    const moduleFile = fileURLToPath(import.meta.url).replace(
      /main\.test\.ts$/,
      "main.ts",
    );
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "finops-bin-"));
    const link = path.join(tmp, "finops-framework-mcp");
    fs.symlinkSync(moduleFile, link);
    process.argv[1] = link; // what node sees under node_modules/.bin: the UNRESOLVED link path
    expect(link.endsWith("main.ts")).toBe(false); // the old suffix guard would return false here
    expect(detectDirectRun()).toBe(true);
  });

  it("stays false for unrelated entry points and missing argv[1]", () => {
    process.argv[1] = "/usr/bin/definitely-not-this-module";
    expect(detectDirectRun()).toBe(false);
    process.argv[1] = "/nonexistent/path/main.ts"; // realpath throws -> false, not crash
    expect(detectDirectRun()).toBe(false);
  });
});

const DIST_MAIN = fileURLToPath(
  new URL("../../../dist/servers/framework/main.js", import.meta.url),
);

describe.skipIf(!fs.existsSync(DIST_MAIN))(
  "built bin via symlink (requires dist/)",
  () => {
    it("prints --version when invoked through a .bin-style symlink", () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "finops-binlink-"));
      try {
        const link = path.join(tmp, "finops-framework-mcp");
        fs.symlinkSync(DIST_MAIN, link);
        const out = execFileSync(process.execPath, [link, "--version"], {
          encoding: "utf8",
        });
        expect(out).toMatch(
          /^finops-framework-mcp v\d+\.\d+\.\d+ \(data v\d+\.\d+\.\d+\)\n$/,
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  },
);

describe("--version flag", () => {
  it("prints the package version and artifact data_version, and never starts the server", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runCli(["--version"]);

    expect(createServer).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const [line] = logSpy.mock.calls[0] as [string];
    expect(line).toMatch(
      /^finops-framework-mcp v\d+\.\d+\.\d+ \(data v\d+\.\d+\.\d+\)$/,
    );
    logSpy.mockRestore();
  });

  it("is filtered from positional artifact-dir handling like --experimental", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    // If --version were treated as the positional artifact-dir argument,
    // loadArtifact would throw trying to read "--version" as a directory
    // instead of resolving to the default data/framework artifact.
    await expect(
      runCli(["--version", "--experimental"]),
    ).resolves.toBeUndefined();
    logSpy.mockRestore();
  });
});
