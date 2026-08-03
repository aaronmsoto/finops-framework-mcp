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

describe("direct-run detection (mirrors the framework server's main.test.ts)", () => {
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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "focus-bin-"));
    const link = path.join(tmp, "finops-focus-mcp");
    fs.symlinkSync(moduleFile, link);
    process.argv[1] = link;
    expect(detectDirectRun()).toBe(true);
  });

  it("stays false for unrelated entry points and missing argv[1]", () => {
    process.argv[1] = "/usr/bin/definitely-not-this-module";
    expect(detectDirectRun()).toBe(false);
    process.argv[1] = "/nonexistent/path/main.ts";
    expect(detectDirectRun()).toBe(false);
  });
});

const DIST_MAIN = fileURLToPath(
  new URL("../../../dist/servers/focus/main.js", import.meta.url),
);

describe.skipIf(!fs.existsSync(DIST_MAIN))(
  "built bin via symlink (requires dist/)",
  () => {
    it("prints --version with both pinned spec versions and the latest", () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "focus-binlink-"));
      try {
        const link = path.join(tmp, "finops-focus-mcp");
        fs.symlinkSync(DIST_MAIN, link);
        const out = execFileSync(process.execPath, [link, "--version"], {
          encoding: "utf8",
        });
        expect(out).toMatch(
          /^finops-focus-mcp v\d+\.\d+\.\d+ \(FOCUS spec versions: 1\.0, 1\.2; latest 1\.2\)\n$/,
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  },
);

describe("--version flag", () => {
  it("prints the package version and spec versions, and never starts the server", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runCli(["--version"]);

    expect(createServer).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const [line] = logSpy.mock.calls[0] as [string];
    expect(line).toMatch(
      /^finops-focus-mcp v\d+\.\d+\.\d+ \(FOCUS spec versions: 1\.0, 1\.2; latest 1\.2\)$/,
    );
    logSpy.mockRestore();
  });

  it("is filtered from positional artifact-dir handling", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(runCli(["--version"])).resolves.toBeUndefined();
    logSpy.mockRestore();
  });
});
