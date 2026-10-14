import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CURRICULUM_FILE, loadCurriculumOverlay } from "./curriculum.js";

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
function dirWith(content: string | null): string {
  const d = mkdtempSync(join(tmpdir(), "tk-cur-"));
  dirs.push(d);
  if (content !== null) writeFileSync(join(d, CURRICULUM_FILE), content);
  return d;
}

const valid = {
  kind: "cert-prep-curriculum",
  official: false,
  imported_at: "2026-09-25T00:00:00Z",
  modules: [],
  glossary: [],
  numbers: [],
};

describe("loadCurriculumOverlay", () => {
  it("loads a valid overlay", () => {
    expect(loadCurriculumOverlay(dirWith(JSON.stringify(valid))).official).toBe(
      false,
    );
  });
  it("explains how to build a missing overlay", () => {
    expect(() => loadCurriculumOverlay(dirWith(null))).toThrow(
      /import-curriculum/,
    );
  });
  it("rejects an overlay that claims to be official", () => {
    expect(() =>
      loadCurriculumOverlay(
        dirWith(JSON.stringify({ ...valid, official: true })),
      ),
    ).toThrow(/invalid/);
  });
});
