import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadAgenticConfig } from "../src/config.js";
import { lintMemory, memorySessionBanner } from "../src/memory.js";
import { appendJournalEntry } from "../src/journal.js";
import { commitAll, initGitRepo, makeTempDir, rmDir, writeConfig, writeFileIn } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
});
afterEach(() => {
  rmDir(dir);
});

function setupMemory(opts: { budget?: number; staleDays?: number; memoryLines?: number } = {}): void {
  writeConfig(dir, { memory: { dir: ".agents/memory", coreBudgetLines: opts.budget ?? 10, staleDays: opts.staleDays ?? 45 } });
  const lines = opts.memoryLines ?? 5;
  writeFileIn(dir, ".agents/memory/MEMORY.md", Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join("\n") + "\n");
  writeFileIn(dir, ".agents/memory/activeContext.md", "# active\n");
}

describe("memory lint", () => {
  it("passes within budget with no git history required", () => {
    setupMemory();
    const result = lintMemory(dir, loadAgenticConfig(dir));
    expect(result.failures).toEqual([]);
  });

  it("fails when MEMORY.md exceeds coreBudgetLines", () => {
    setupMemory({ budget: 10, memoryLines: 11 });
    const result = lintMemory(dir, loadAgenticConfig(dir));
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatch(/11 lines — over the 10-line core budget/);
  });

  it("fails cleanly (no crash) when the memory bank is missing", () => {
    writeConfig(dir);
    const result = lintMemory(dir, loadAgenticConfig(dir));
    expect(result.failures[0]).toMatch(/MEMORY\.md not found — the memory bank is not initialized/);
  });

  it("warns (exit-0 semantics) when AGENTS.md is over 170 lines", () => {
    setupMemory();
    writeFileIn(dir, "AGENTS.md", Array.from({ length: 171 }, () => "x").join("\n") + "\n");
    const result = lintMemory(dir, loadAgenticConfig(dir));
    expect(result.failures).toEqual([]);
    expect(result.warnings.some((w) => w.includes("AGENTS.md is 171 lines"))).toBe(true);
  });

  it("warns when activeContext.md is stale while the repo kept moving", () => {
    setupMemory({ staleDays: 45 });
    initGitRepo(dir);
    const old = "2020-01-01T12:00:00Z";
    commitAll(dir, "old commit incl. activeContext", { GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old });
    writeFileIn(dir, "src/newer.txt", "later work\n");
    commitAll(dir, "recent commit without touching activeContext");
    const result = lintMemory(dir, loadAgenticConfig(dir));
    expect(result.failures).toEqual([]);
    expect(result.warnings.some((w) => w.includes("activeContext.md is stale"))).toBe(true);
  });

  it("does not warn when activeContext.md moved with the repo", () => {
    setupMemory({ staleDays: 45 });
    initGitRepo(dir);
    commitAll(dir, "everything current");
    const result = lintMemory(dir, loadAgenticConfig(dir));
    expect(result.warnings.filter((w) => w.includes("stale"))).toEqual([]);
  });
});

describe("memory show --session-start", () => {
  it("prints MEMORY.md + activeContext.md + last 3 journal entries with section markers", () => {
    setupMemory();
    // Four distinct session files (one per slug); the banner tails the newest three.
    for (let i = 1; i <= 4; i++) appendJournalEntry(dir, { slug: `session-${i}`, title: `entry ${i}`, lines: [`- note: n${i}`] });
    const banner = memorySessionBanner(dir, loadAgenticConfig(dir));
    expect(banner).toContain("===== .agents/memory/MEMORY.md =====");
    expect(banner).toContain("line 1");
    expect(banner).toContain("===== .agents/memory/activeContext.md =====");
    expect(banner).toContain("===== .agents/journal/ (last 3 entries) =====");
    expect(banner).not.toContain("entry 1"); // only the last 3
    expect(banner).toContain("entry 2");
    expect(banner).toContain("entry 4");
  });

  it("marks missing files instead of crashing", () => {
    writeConfig(dir);
    const banner = memorySessionBanner(dir, loadAgenticConfig(dir));
    expect(banner).toContain("(missing)");
    expect(banner).toContain("(no journal entries)");
  });
});
