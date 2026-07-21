import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadAgenticConfig } from "../src/config.js";
import {
  GENESIS,
  addTask,
  blockTask,
  commitTaskRecord,
  completeTask,
  computeTaskHash,
  loadTasks,
  nextTask,
  revertTask,
  saveTasks,
  startTask,
  tasksPath,
  validateChain,
} from "../src/tasks.js";
import { commitAll, initGitRepo, makeTempDir, rmDir, writeConfig, writeFileIn } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
  writeConfig(dir); // gates: { noop: "true" (fast) } — completion gates pass quickly
  initGitRepo(dir);
  commitAll(dir, "initial");
});
afterEach(() => {
  rmDir(dir);
});

const config = () => loadAgenticConfig(dir);

describe("tasks add / next / start", () => {
  it("creates tasks.json on first add and assigns monotonic ids", () => {
    const t1 = addTask(dir, { title: "first", acceptance: ["a"] });
    const t2 = addTask(dir, { title: "second", acceptance: ["b"], spec: ".agents/specs/x.md" });
    expect(t1.id).toBe("T-001");
    expect(t2.id).toBe("T-002");
    expect(t2.spec).toBe(".agents/specs/x.md");
    const file = loadTasks(dir);
    expect(file.chainHead).toBe(GENESIS);
    expect(file.tasks).toHaveLength(2);
  });

  it("requires a title and at least one acceptance criterion", () => {
    expect(() => addTask(dir, { title: " ", acceptance: ["a"] })).toThrowError(/title must not be empty/);
    expect(() => addTask(dir, { title: "x", acceptance: [] })).toThrowError(/at least one non-empty --acceptance/);
  });

  it("selects the first pending task in file order and starts it", () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    addTask(dir, { title: "two", acceptance: ["a"] });
    expect(nextTask(loadTasks(dir))!.id).toBe("T-001");
    startTask(dir, "T-001");
    expect(loadTasks(dir).tasks[0]!.status).toBe("in_progress");
    expect(nextTask(loadTasks(dir))!.id).toBe("T-002");
    expect(() => startTask(dir, "T-999")).toThrowError(/no task with id "T-999"/);
  });
});

describe("tasks complete + hash chain", () => {
  it("completes a task: runs fast gates, records evidence, extends the chain", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    const done = await completeTask(dir, config(), "T-001", "did the thing", { quietGates: true });
    expect(done.status).toBe("done");
    expect(done.evidence).toMatchObject({ gates: "pass", summary: "did the thing", verifiedBy: "gates" });
    expect(done.evidence!.commit).toMatch(/^[0-9a-f]{40}$/);
    const file = loadTasks(dir);
    expect(file.chainHead).toBe(done.hash);
    expect(done.hash).toBe(computeTaskHash(GENESIS, "T-001", done.evidence));
    expect(validateChain(file)).toEqual({ ok: true, errors: [] });
  });

  it("refuses to complete when fast gates fail", async () => {
    writeConfig(dir, { gates: { broken: { command: "false", tier: "fast" } } });
    addTask(dir, { title: "one", acceptance: ["a"] });
    await expect(completeTask(dir, config(), "T-001", "nope", { quietGates: true })).rejects.toThrowError(/fast gates failed/);
    expect(loadTasks(dir).tasks[0]!.status).toBe("pending");
  });

  it("AGENTIC_SKIP_GATES=1 skips gates (tests only) even when gates would fail", async () => {
    writeConfig(dir, { gates: { broken: { command: "false", tier: "fast" } } });
    addTask(dir, { title: "one", acceptance: ["a"] });
    process.env.AGENTIC_SKIP_GATES = "1";
    try {
      const done = await completeTask(dir, config(), "T-001", "skipped gates");
      expect(done.status).toBe("done");
    } finally {
      delete process.env.AGENTIC_SKIP_GATES;
    }
  });

  it("chains multiple completions in completion order", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    addTask(dir, { title: "two", acceptance: ["a"] });
    const d1 = await completeTask(dir, config(), "T-001", "s1", { quietGates: true });
    const d2 = await completeTask(dir, config(), "T-002", "s2", { quietGates: true });
    expect(d2.hash).toBe(computeTaskHash(d1.hash!, "T-002", d2.evidence));
    expect(validateChain(loadTasks(dir)).ok).toBe(true);
  });
});

describe("tamper detection", () => {
  it("detects a status hand-flipped to done", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    const file = loadTasks(dir);
    file.tasks[0]!.status = "done"; // silent flip, no gates, no chain entry
    saveTasks(dir, file);
    const result = validateChain(loadTasks(dir));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/done but has no evidence/);
  });

  it("detects edited evidence (hash no longer links)", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    await completeTask(dir, config(), "T-001", "honest summary", { quietGates: true });
    const file = loadTasks(dir);
    file.tasks[0]!.evidence!.summary = "revised history";
    saveTasks(dir, file);
    const result = validateChain(loadTasks(dir));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/chain broken/);
  });

  it("detects a tampered chainHead", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    await completeTask(dir, config(), "T-001", "s", { quietGates: true });
    const file = loadTasks(dir);
    file.chainHead = "0".repeat(64);
    saveTasks(dir, file);
    expect(validateChain(loadTasks(dir)).errors.join("\n")).toMatch(/chainHead mismatch/);
  });

  it("rejects a structurally invalid tasks.json with a clear message", () => {
    writeFileIn(dir, ".agents/tasks.json", JSON.stringify({ version: 1, chainHead: GENESIS, tasks: [{ id: "T-001" }] }));
    expect(() => loadTasks(dir)).toThrowError(/tasks\[0\]\.title/);
    fs.rmSync(tasksPath(dir));
    expect(() => loadTasks(dir)).toThrowError(/tasks\.json not found/);
  });
});

describe("block and revert", () => {
  it("blocks a task and refuses to block a done one", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    blockTask(dir, "T-001");
    expect(loadTasks(dir).tasks[0]!.status).toBe("blocked");
    const file = loadTasks(dir);
    file.tasks[0]!.status = "pending";
    saveTasks(dir, file);
    await completeTask(dir, config(), "T-001", "s", { quietGates: true });
    expect(() => blockTask(dir, "T-001")).toThrowError(/already done/);
  });

  it("restarts a blocked task: blocked -> start -> in_progress -> complete", async () => {
    addTask(dir, { title: "recoverable", acceptance: ["a"] });
    blockTask(dir, "T-001");
    expect(loadTasks(dir).tasks[0]!.status).toBe("blocked");

    const restarted = startTask(dir, "T-001");
    expect(restarted.status).toBe("in_progress");

    const done = await completeTask(dir, config(), "T-001", "recovered and finished", { quietGates: true });
    expect(done.status).toBe("done");
    expect(validateChain(loadTasks(dir)).ok).toBe(true);

    // Done tasks still cannot be (re)started.
    expect(() => startTask(dir, "T-001")).toThrowError(/only pending or blocked tasks can be started/);
  });

  it("revert pops only the chain-head entry and restores the previous head", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    addTask(dir, { title: "two", acceptance: ["a"] });
    const d1 = await completeTask(dir, config(), "T-001", "s1", { quietGates: true });
    await completeTask(dir, config(), "T-002", "s2", { quietGates: true });

    expect(() => revertTask(dir, "T-001")).toThrowError(/not the chain head/);

    const reverted = revertTask(dir, "T-002");
    expect(reverted.status).toBe("pending");
    expect(reverted.evidence).toBeNull();
    expect(reverted.hash).toBeNull();
    const file = loadTasks(dir);
    expect(file.chainHead).toBe(d1.hash);
    expect(validateChain(file).ok).toBe(true);

    revertTask(dir, "T-001");
    expect(loadTasks(dir).chainHead).toBe(GENESIS);
  });
});

describe("commitTaskRecord (tasks complete --commit)", () => {
  it("no-ops with a notice when .agents/tasks.json is unchanged in git terms", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    await completeTask(dir, config(), "T-001", "done", { quietGates: true });
    commitAll(dir, "everything committed"); // tasks.json now clean
    const res = commitTaskRecord(dir, "T-001");
    expect(res.committed).toBe(false);
    expect(res.notice).toMatch(/unchanged in git terms — nothing to commit/);
  });

  it("commits the record when tasks.json changed, and throws a clear error outside a git repo", async () => {
    addTask(dir, { title: "one", acceptance: ["a"] });
    await completeTask(dir, config(), "T-001", "done", { quietGates: true });
    const res = commitTaskRecord(dir, "T-001");
    expect(res.committed).toBe(true);

    const bare = makeTempDir(); // not a git repository
    try {
      writeConfig(bare);
      addTask(bare, { title: "x", acceptance: ["a"] });
      expect(() => commitTaskRecord(bare, "T-001")).toThrowError(/--commit: git status failed/);
    } finally {
      rmDir(bare);
    }
  });
});
