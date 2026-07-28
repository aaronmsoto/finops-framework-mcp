import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runGenerate } from "./generate-cli.js";

const DATA_DIR = join(import.meta.dirname, "../../../data/focus");

let tmpDir: string | undefined;
afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
});

describe("runGenerate (CLI)", () => {
  it("writes a deterministic CSV for the default version (1.2)", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "focus-generate-"));
    const outPath = join(tmpDir, "out.csv");
    const logs: string[] = [];
    const code = runGenerate({
      dataDir: DATA_DIR,
      version: "1.2",
      rows: 10,
      seed: 1,
      outPath,
      log: (m) => logs.push(m),
    });
    expect(code).toBe(0);
    expect(logs.some((l) => /wrote .*out\.csv/.test(l))).toBe(true);
    const csv = readFileSync(outPath, "utf8");
    expect(csv.split("\n").filter(Boolean).length).toBe(11); // header + 10 rows
  });

  it("is byte-identical across two runs with the same seed", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "focus-generate-"));
    const outA = join(tmpDir, "a.csv");
    const outB = join(tmpDir, "b.csv");
    runGenerate({
      dataDir: DATA_DIR,
      version: "1.0",
      rows: 10,
      seed: 99,
      outPath: outA,
      log: () => {},
    });
    runGenerate({
      dataDir: DATA_DIR,
      version: "1.0",
      rows: 10,
      seed: 99,
      outPath: outB,
      log: () => {},
    });
    expect(readFileSync(outA, "utf8")).toBe(readFileSync(outB, "utf8"));
  });

  it("exits 1 for an unknown version", () => {
    const logs: string[] = [];
    const code = runGenerate({
      dataDir: DATA_DIR,
      version: "9.9",
      rows: 10,
      seed: 1,
      log: (m) => logs.push(m),
    });
    expect(code).toBe(1);
    expect(logs.some((l) => /unknown version/.test(l))).toBe(true);
  });
});
