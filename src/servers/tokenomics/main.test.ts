import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "./server.js";
import { detectDirectRun, runCli } from "./main.js";

vi.mock("./server.js", () => ({
  createServer: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

const VERSION_LINE =
  /^tokenomics-overview-mcp v\d+\.\d+\.\d+ \(data v\d+\.\d+\.\d+, 12 Tokenomics Foundation documents\)$/;

describe("direct-run detection", () => {
  const saved = process.argv[1];
  let tmp: string | null = null;
  afterEach(() => {
    process.argv[1] = saved;
    if (tmp !== null) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = null;
  });

  it("recognizes invocation through a symlink (npm's .bin mechanism)", () => {
    const moduleFile = fileURLToPath(import.meta.url).replace(
      /main\.test\.ts$/,
      "main.ts",
    );
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tk-bin-"));
    const link = path.join(tmp, "tokenomics-overview-mcp");
    fs.symlinkSync(moduleFile, link);
    process.argv[1] = link;
    expect(detectDirectRun()).toBe(true);
  });

  it("stays false for unrelated entry points", () => {
    process.argv[1] = "/usr/bin/definitely-not-this-module";
    expect(detectDirectRun()).toBe(false);
  });
});

describe("runCli", () => {
  const env = { ...process.env };
  beforeEach(() => {
    vi.mocked(createServer).mockClear();
  });
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("--version prints the package and data version without starting the server", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runCli(["--version"]);
    expect(createServer).not.toHaveBeenCalled();
    expect((log.mock.calls[0] as [string])[0]).toMatch(VERSION_LINE);
  });

  it("starts in default mode without experimental extras", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.FINOPS_MCP_EXPERIMENTAL;
    delete process.env.TOKENOMICS_MCP_CURRICULUM;
    await runCli([]);
    expect(vi.mocked(createServer).mock.calls[0]?.[1]).toEqual({
      experimental: false,
      curriculum: null,
    });
  });

  it("warns and ignores a curriculum overlay when experimental is off", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.TOKENOMICS_MCP_CURRICULUM = "/nonexistent";
    delete process.env.FINOPS_MCP_EXPERIMENTAL;
    await runCli([]);
    expect(errSpy.mock.calls.flat().join("\n")).toContain("ignored");
    expect(vi.mocked(createServer).mock.calls[0]?.[1]?.curriculum).toBeNull();
  });

  it("loads the overlay when experimental is on", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-ov-"));
    fs.writeFileSync(
      path.join(dir, "curriculum.json"),
      JSON.stringify({
        kind: "cert-prep-curriculum",
        official: false,
        imported_at: "x",
        modules: [],
        glossary: [],
        numbers: [],
      }),
    );
    process.env.TOKENOMICS_MCP_CURRICULUM = dir;
    await runCli(["--experimental"]);
    const opts = vi.mocked(createServer).mock.calls[0]?.[1];
    expect(opts?.experimental).toBe(true);
    expect(opts?.curriculum?.kind).toBe("cert-prep-curriculum");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

const DIST_MAIN = fileURLToPath(
  new URL("../../../dist/servers/tokenomics/main.js", import.meta.url),
);

describe.skipIf(!fs.existsSync(DIST_MAIN))("built bin (requires dist/)", () => {
  it("prints --version through a symlink", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tk-binlink-"));
    try {
      const link = path.join(tmp, "tokenomics-overview-mcp");
      fs.symlinkSync(DIST_MAIN, link);
      const out = execFileSync(process.execPath, [link, "--version"], {
        encoding: "utf8",
      });
      expect(out.trim()).toMatch(VERSION_LINE);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
