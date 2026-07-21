import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BRANCHING, loadAgenticConfig } from "../src/config.js";
import { countCallsites, resolveDefaultBase, runIntegrity } from "../src/integrity.js";
import { commitAll, gitInTemp, initGitRepo, makeTempDir, rmDir, writeConfig, writeFileIn } from "./helpers.js";

// Focus-marker fixtures are built by concatenation so this test file never
// contains the literal markers (the real repo's own integrity gate scans
// added lines in changed files, including this one).
const ONLY_MARKER = ".on" + "ly(";
const FIT_MARKER = "f" + "it(";
const FDESCRIBE_MARKER = "fdesc" + "ribe(";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
  writeConfig(dir); // testGlobs: tests/**, srcDirs: src
  initGitRepo(dir);
  writeFileIn(dir, "src/impl.ts", "export const x = 1;\n");
  writeFileIn(dir, "tests/a.test.ts", 'it("one", () => {});\nit("two", () => {});\n');
  commitAll(dir, "base state");
  // Work happens on a branch; integrity compares against the "main" base.
  const res = gitInTemp(dir, ["checkout", "-q", "-b", "work"]);
  expect(res.status).toBe(0);
});
afterEach(() => {
  rmDir(dir);
});

const config = () => loadAgenticConfig(dir);

describe("resolveDefaultBase", () => {
  // The temp repo has no remote, so nothing resolves and the resolver returns
  // its primary candidate — which asserts the branch SELECTION (mode-driven)
  // without needing a live origin.
  it("targets origin/<integration_branch> in integration mode", () => {
    const base = resolveDefaultBase(dir, { ...DEFAULT_BRANCHING, mode: "integration", integration_branch: "dev" });
    expect(base).toBe("origin/dev");
  });

  it("targets origin/<default_branch> in trunk mode, honoring a non-main default", () => {
    expect(resolveDefaultBase(dir, { ...DEFAULT_BRANCHING, mode: "trunk", default_branch: "master" })).toBe("origin/master");
    expect(resolveDefaultBase(dir, { ...DEFAULT_BRANCHING, mode: "trunk" })).toBe("origin/main");
  });

  it("feeds the integrity skip notice so it names the real target branch, not origin/main", () => {
    const base = resolveDefaultBase(dir, { ...DEFAULT_BRANCHING, mode: "integration", integration_branch: "dev" });
    const result = runIntegrity(dir, config(), { base });
    expect(result.status).toBe("skipped");
    expect(result.notice).toContain("origin/dev");
  });
});

describe("integrity", () => {
  it("prints a notice and reports skipped when the base is unresolvable", () => {
    const result = runIntegrity(dir, config(), { base: "origin/main" });
    expect(result.status).toBe("skipped");
    expect(result.notice).toMatch(/unresolvable/);
    expect(result.failures).toEqual([]);
  });

  it("is clean when nothing changed", () => {
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.status).toBe("checked");
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("fails on a deleted test file (committed or not)", () => {
    fs.rmSync(path.join(dir, "tests", "a.test.ts"));
    const uncommitted = runIntegrity(dir, config(), { base: "main" });
    expect(uncommitted.failures.some((f) => f.includes("deleted test file: tests/a.test.ts"))).toBe(true);
    commitAll(dir, "delete the test");
    const committed = runIntegrity(dir, config(), { base: "main" });
    expect(committed.failures.some((f) => f.includes("deleted test file: tests/a.test.ts"))).toBe(true);
  });

  it("fails on a deleted test file with a non-ASCII name (git would C-quote it without -z)", () => {
    // The file must exist at the comparison base, so commit it on main first.
    gitInTemp(dir, ["checkout", "-q", "main"]);
    writeFileIn(dir, "tests/ütf.test.js", 'it("umlaut", () => {});\n');
    commitAll(dir, "add non-ascii test file");
    gitInTemp(dir, ["checkout", "-q", "-b", "work-unicode"]);

    fs.rmSync(path.join(dir, "tests", "ütf.test.js"));
    const uncommitted = runIntegrity(dir, config(), { base: "main" });
    expect(uncommitted.failures.some((f) => f.includes("deleted test file: tests/ütf.test.js"))).toBe(true);
    commitAll(dir, "delete non-ascii test file");
    const committed = runIntegrity(dir, config(), { base: "main" });
    expect(committed.failures.some((f) => f.includes("deleted test file: tests/ütf.test.js"))).toBe(true);
  });

  it("fails on added focus markers in changed test files only — src and docs mentions are inert", () => {
    writeFileIn(
      dir,
      "tests/a.test.ts",
      `it("one", () => {});\nit("two", () => {});\nit${ONLY_MARKER}"focused", () => {});\n${FDESCRIBE_MARKER}"suite", () => {});\n`,
    );
    // Markers outside testGlobs must NOT fail: no runner honors them there,
    // and docs legitimately mention the marker syntax when describing this gate.
    writeFileIn(dir, "src/impl.ts", `export const x = 1;\n// ${FIT_MARKER} and ${FDESCRIBE_MARKER} in src\n`);
    writeFileIn(dir, "README.md", `Focus markers like ${ONLY_MARKER}) are rejected by the integrity gate.\n`);
    commitAll(dir, "add focus markers");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.failures.some((f) => f.includes("focus marker .only") && f.includes("tests/a.test.ts"))).toBe(true);
    expect(result.failures.some((f) => f.includes("focus marker fdescribe") && f.includes("tests/a.test.ts"))).toBe(true);
    expect(result.failures.some((f) => f.includes("src/impl.ts"))).toBe(false);
    expect(result.failures.some((f) => f.includes("README.md"))).toBe(false);
  });

  it("warns on a decreased test-callsite count (strict turns it into a failure at the CLI layer)", () => {
    writeFileIn(dir, "tests/a.test.ts", 'it("one", () => {});\n'); // 2 -> 1
    commitAll(dir, "drop a test");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.failures).toEqual([]);
    expect(result.warnings.some((w) => w.includes("test callsite count decreased") && w.includes("2 -> 1"))).toBe(true);
  });

  it("does not warn when tests grow", () => {
    writeFileIn(dir, "tests/a.test.ts", 'it("one", () => {});\nit("two", () => {});\ntest("three", () => {});\n');
    commitAll(dir, "add a test");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.warnings).toEqual([]);
  });

  it("fails on AI-attribution markers in new commit messages; human co-authors pass", () => {
    writeFileIn(dir, "src/feature.ts", "export const y = 2;\n");
    commitAll(
      dir,
      "Add feature\n\nCo-Authored-By: Cl" + "aude Fable 5 <noreply@anthropic.com>\nCl" + "aude-Session: https://example.invalid/session_x",
    );
    writeFileIn(dir, "src/other.ts", "export const z = 3;\n");
    commitAll(dir, "Add other feature\n\nCo-Authored-By: Jane Doe <jane@example.com>");
    const result = runIntegrity(dir, config(), { base: "main" });
    const attributionFailures = result.failures.filter((f) => f.includes("AI-attribution marker"));
    expect(attributionFailures).toHaveLength(1);
    expect(attributionFailures[0]).toMatch(/Add feature|Co-Authored-By/i);
    expect(result.failures.some((f) => f.includes("Jane Doe"))).toBe(false);
  });

  it("fails when a journal file that exists at the base is modified or deleted", () => {
    gitInTemp(dir, ["checkout", "-q", "main"]);
    writeFileIn(dir, ".agents/journal/2026-07-01-alpha.md", "# session alpha\n");
    writeFileIn(dir, ".agents/journal/2026-07-02-beta.md", "# session beta\n");
    commitAll(dir, "add journal history");
    gitInTemp(dir, ["checkout", "-q", "-b", "work-journal"]);

    writeFileIn(dir, ".agents/journal/2026-07-01-alpha.md", "# session alpha\nrewritten by another session\n");
    fs.rmSync(path.join(dir, ".agents", "journal", "2026-07-02-beta.md"));
    commitAll(dir, "tamper with journal history");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.failures.some((f) => f.includes("journal file .agents/journal/2026-07-01-alpha.md was modified/deleted"))).toBe(true);
    expect(result.failures.some((f) => f.includes("journal file .agents/journal/2026-07-02-beta.md was modified/deleted"))).toBe(true);
  });

  it("allows adding a new journal file and editing the journal README", () => {
    gitInTemp(dir, ["checkout", "-q", "main"]);
    writeFileIn(dir, ".agents/journal/README.md", "# Journal convention\n");
    commitAll(dir, "add journal README");
    gitInTemp(dir, ["checkout", "-q", "-b", "work-journal-ok"]);

    writeFileIn(dir, ".agents/journal/2026-07-19-mine.md", "# my session\n");
    writeFileIn(dir, ".agents/journal/README.md", "# Journal convention\nclarified\n");
    commitAll(dir, "own session file plus README clarification");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.failures).toEqual([]);
  });

  it("fails when lines are removed from decisions.md; pure appends pass", () => {
    gitInTemp(dir, ["checkout", "-q", "main"]);
    writeFileIn(dir, ".agents/memory/decisions.md", "# Decisions\n\n- 2026-07-01: use X\n");
    commitAll(dir, "add decision log");
    gitInTemp(dir, ["checkout", "-q", "-b", "work-decisions"]);

    // Removing a recorded decision (uncommitted counts too) -> fail.
    writeFileIn(dir, ".agents/memory/decisions.md", "# Decisions\n\n- 2026-07-19: use Y\n");
    const removed = runIntegrity(dir, config(), { base: "main" });
    expect(removed.failures.some((f) => f.includes("decisions.md lines were removed"))).toBe(true);

    // Pure append -> clean.
    writeFileIn(dir, ".agents/memory/decisions.md", "# Decisions\n\n- 2026-07-01: use X\n- 2026-07-19: supersede X with Y\n");
    const appended = runIntegrity(dir, config(), { base: "main" });
    expect(appended.failures).toEqual([]);
  });

  it("warns on commit subjects over 72 chars, exempting merge commits", () => {
    const longSubject = "Add " + "x".repeat(80) + " support";
    writeFileIn(dir, "src/long.ts", "export const a = 1;\n");
    commitAll(dir, longSubject + "\n\nBody explains why.");
    writeFileIn(dir, "src/merge.ts", "export const b = 2;\n");
    commitAll(dir, "Merge branch 'feature/" + "y".repeat(80) + "' into work");
    writeFileIn(dir, "src/short.ts", "export const c = 3;\n");
    commitAll(dir, "Short subject under the limit");
    const result = runIntegrity(dir, config(), { base: "main" });
    const subjectWarnings = result.warnings.filter((w) => w.includes("(max 72)"));
    expect(subjectWarnings).toHaveLength(1);
    expect(subjectWarnings[0]).toContain(`subject is ${longSubject.length} chars (max 72)`);
    expect(subjectWarnings[0]).toContain(`"${longSubject.slice(0, 50)}..."`);
  });

  it("warns when a diff mixes implementation with tests or policy files", () => {
    writeFileIn(dir, "src/impl.ts", "export const x = 2;\n");
    writeFileIn(dir, "tests/a.test.ts", 'it("one", () => {});\nit("two", () => {});\nit("extra", () => {});\n');
    commitAll(dir, "impl + test in one diff");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.warnings.some((w) => w.includes("mixes implementation"))).toBe(true);
  });

  it("does not flag an implementation-only diff", () => {
    writeFileIn(dir, "src/impl.ts", "export const x = 3;\n");
    commitAll(dir, "impl only");
    const result = runIntegrity(dir, config(), { base: "main" });
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("counts it(, test(, and def test_ callsites", () => {
    expect(countCallsites('it("a"); test("b"); it ("c");')).toBe(3);
    expect(countCallsites("def test_alpha():\n    pass\n")).toBe(1);
    expect(countCallsites("profit(); attest();")).toBe(0);
  });
});
