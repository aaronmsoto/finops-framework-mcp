import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runValidate } from "./validate-cli.js";

const DATA_DIR = join(import.meta.dirname, "../../../data/focus");
const SAMPLE_CSV = join(
  import.meta.dirname,
  "fixtures/samples/1.0/focus_sample.csv",
);

describe("runValidate (CLI)", () => {
  it("exits 0 and reports 0 errors for the official 1.0 sample", () => {
    const logs: string[] = [];
    const code = runValidate({
      dataDir: DATA_DIR,
      version: "1.0",
      csvPath: SAMPLE_CSV,
      log: (m) => logs.push(m),
    });
    expect(code).toBe(0);
    expect(logs.some((l) => /0 errors/.test(l))).toBe(true);
  });

  it("exits 1 for an unknown version", () => {
    const logs: string[] = [];
    const code = runValidate({
      dataDir: DATA_DIR,
      version: "9.9",
      csvPath: SAMPLE_CSV,
      log: (m) => logs.push(m),
    });
    expect(code).toBe(1);
    expect(logs.some((l) => /unknown version/.test(l))).toBe(true);
  });
});
