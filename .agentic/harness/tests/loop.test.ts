import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadAgenticConfig, loadApprovals } from "../src/config.js";
import { blockedFilePath, effectiveCap, runLoop } from "../src/loop.js";
import { MockRunner } from "../src/runners/mock.js";
import { addTask, loadTasks } from "../src/tasks.js";
import {
  CLI_PATH,
  commitAll,
  existsIn,
  initGitRepo,
  makeTempDir,
  readFileIn,
  rmDir,
  writeApprovals,
  writeConfig,
  writePrompts,
} from "./helpers.js";

let dir: string;
const savedMockScript = process.env.AGENTIC_MOCK_SCRIPT;

beforeEach(() => {
  dir = makeTempDir();
  writeConfig(dir); // gates: { noop: "true" (fast) }
  writeApprovals(dir);
  writePrompts(dir);
  initGitRepo(dir);
  commitAll(dir, "initial");
});
afterEach(() => {
  rmDir(dir);
  if (savedMockScript === undefined) delete process.env.AGENTIC_MOCK_SCRIPT;
  else process.env.AGENTIC_MOCK_SCRIPT = savedMockScript;
});

/**
 * A mock agent that behaves: completes the selected task through the real
 * CLI (which runs gates and extends the chain), commits, and answers the
 * verification pass with VERDICT: pass.
 */
function honestAgentScript(verifyLine = "VERDICT: pass"): string {
  return [
    // The harness must export AGENTIC_LOOP=1 to every runner invocation
    // (build and verify) so the loop-gate Stop hook can engage.
    'if [ "$AGENTIC_LOOP" != "1" ]; then echo "AGENTIC_LOOP not set" >&2; exit 9; fi',
    // Preflight phase: prove we can write a file, then stop.
    'if [ "$AGENTIC_LOOP_PHASE" = "preflight" ]; then printf OK > "$AGENTIC_PREFLIGHT_FILE"; exit 0; fi',
    `if [ "$AGENTIC_LOOP_PHASE" = "verify" ]; then echo "${verifyLine}"; exit 0; fi`,
    `node "${CLI_PATH}" tasks start "$AGENTIC_TASK_ID" >&2`,
    'echo "work for $AGENTIC_TASK_ID" >> notes.txt',
    `node "${CLI_PATH}" tasks complete "$AGENTIC_TASK_ID" --summary "done by mock" >&2`,
    "git add -A >&2",
    'git commit -qm "complete $AGENTIC_TASK_ID"',
    'echo "iteration done"',
  ].join("\n");
}

const deps = () => ({ config: loadAgenticConfig(dir), policy: loadApprovals(dir) });

/**
 * A loop run owns exactly ONE journal file:
 * .agents/journal/<YYYYMMDD>-loop-<mode>-<hhmmss>.md — every iteration
 * appends a section to it.
 */
function readLoopJournal(mode = "build"): string {
  const journalDir = path.join(dir, ".agents", "journal");
  const files = fs.readdirSync(journalDir).filter((f) => f.endsWith(".md") && f !== "README.md");
  expect(files).toHaveLength(1);
  expect(files[0]).toMatch(new RegExp(`^\\d{8}-loop-${mode}-\\d{6}\\.md$`));
  return readFileIn(dir, path.join(".agents", "journal", files[0]!));
}

describe("loop terminal states (mock runner, hermetic)", () => {
  it("reaches success: completes every task, verifies, journals, exits green", async () => {
    addTask(dir, { title: "first task", acceptance: ["does a thing"] });
    addTask(dir, { title: "second task", acceptance: ["does another"] });
    process.env.AGENTIC_MOCK_SCRIPT = honestAgentScript();

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), {});

    expect(result.state).toBe("success");
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations.every((r) => r.outcome === "completed")).toBe(true);
    expect(result.iterations.every((r) => r.verdict === "pass")).toBe(true);
    expect(result.iterations.every((r) => r.commitMade && r.gatesOk && r.chainOk)).toBe(true);

    const tasks = loadTasks(dir);
    expect(tasks.tasks.map((t) => t.status)).toEqual(["done", "done"]);
    expect(tasks.tasks.every((t) => t.evidence !== null && t.hash !== null)).toBe(true);

    const journal = readLoopJournal();
    expect(journal).toContain("loop iteration 1 — T-001 completed");
    expect(journal).toContain("loop iteration 2 — T-002 completed");
    expect(existsIn(dir, ".agents/BLOCKED.md")).toBe(false);
  });

  it("reaches budget_exhausted: max_iterations 1 with 2 tasks pending", async () => {
    addTask(dir, { title: "first", acceptance: ["a"] });
    addTask(dir, { title: "second", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = honestAgentScript();

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { maxIterations: 1 });

    expect(result.state).toBe("budget_exhausted");
    expect(result.reason).toMatch(/iteration cap reached \(1\)/);
    expect(result.iterations).toHaveLength(1);
    const tasks = loadTasks(dir);
    expect(tasks.tasks.map((t) => t.status)).toEqual(["done", "pending"]);
  });

  it("reaches blocked: an agent that never completes a task trips max_consecutive_failures and writes BLOCKED.md", async () => {
    writeApprovals(dir, { maxConsecutiveFailures: 2 });
    addTask(dir, { title: "stubborn task", acceptance: ["never happens"] });
    process.env.AGENTIC_MOCK_SCRIPT = 'echo "I did nothing useful"';

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { skipPreflight: true });

    expect(result.state).toBe("blocked");
    expect(result.reason).toMatch(/2 consecutive failed iterations/);
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations.every((r) => r.outcome === "failed")).toBe(true);
    expect(result.iterations[0]!.details.join(" ")).toMatch(/no new commit/);
    expect(result.iterations[0]!.details.join(" ")).toMatch(/was not completed/);

    expect(loadTasks(dir).tasks[0]!.status).toBe("blocked");
    expect(fs.existsSync(blockedFilePath(dir))).toBe(true);
    const blocked = readFileIn(dir, ".agents/BLOCKED.md");
    expect(blocked).toContain("# LOOP BLOCKED");
    expect(blocked).toContain("stubborn task");
    expect(blocked).toContain("## Last errors");
    expect(blocked).toContain("## Last gate report");
    expect(blocked).toContain("noop: pass");

    const journal = readLoopJournal();
    expect(journal).toContain("loop iteration 1 — T-001 failed");
    expect(journal).toContain("loop iteration 2 — T-001 failed");
  });

  it("verification VERDICT: fail reverts the task to pending and counts as a failed iteration", async () => {
    writeApprovals(dir, { maxConsecutiveFailures: 1 });
    addTask(dir, { title: "rejected work", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = honestAgentScript("VERDICT: fail");

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), {});

    expect(result.state).toBe("blocked");
    expect(result.iterations[0]!.verdict).toBe("fail");
    expect(result.iterations[0]!.details.join(" ")).toMatch(/VERDICT: fail/);
    expect(result.iterations[0]!.details.join(" ")).toMatch(/reverted T-001 to pending/);
    const tasks = loadTasks(dir);
    expect(tasks.chainHead).toBe("genesis"); // chain entry was popped safely
    expect(tasks.tasks[0]!.status).toBe("blocked"); // then marked blocked at the cap
  });

  it("--no-verify skips the verification pass", async () => {
    addTask(dir, { title: "unverified", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = honestAgentScript("VERDICT: fail"); // would fail verification if it ran

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { noVerify: true });

    expect(result.state).toBe("success");
    expect(result.iterations[0]!.verdict).toBe("skipped");
  });

  it("succeeds immediately when no tasks are pending and gates are green", async () => {
    addTask(dir, { title: "already handled elsewhere", acceptance: ["a"] });
    process.env.AGENTIC_SKIP_GATES = "1";
    try {
      const { completeTask } = await import("../src/tasks.js");
      await completeTask(dir, loadAgenticConfig(dir), "T-001", "pre-done");
    } finally {
      delete process.env.AGENTIC_SKIP_GATES;
    }
    process.env.AGENTIC_MOCK_SCRIPT = "echo never invoked";
    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { skipPreflight: true });
    expect(result.state).toBe("success");
    expect(result.iterations).toHaveLength(0);
  });

  it("a missing VERDICT line is treated as a verification failure", async () => {
    writeApprovals(dir, { maxConsecutiveFailures: 1 });
    addTask(dir, { title: "mumbling verifier", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = honestAgentScript("looks plausible to me");

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), {});
    expect(result.state).toBe("blocked");
    expect(result.iterations[0]!.details.join(" ")).toMatch(/no VERDICT line/);
  });
});

describe("loop preflight probe", () => {
  it("throws actionable guidance when the runner cannot write a file, before any iteration or journal", async () => {
    addTask(dir, { title: "would-be work", acceptance: ["a"] });
    // A runner that runs (exit 0) but never creates the sentinel — the exact
    // symptom of an untrusted workspace / edit-denying permission mode.
    process.env.AGENTIC_MOCK_SCRIPT = 'echo "I cannot edit files"';

    const { config, policy } = deps();
    await expect(runLoop(dir, config, policy, new MockRunner(), {})).rejects.toThrowError(/preflight:.*did not create the sentinel/);

    // Failed before the loop: no journal file written, task untouched.
    const journalDir = path.join(dir, ".agents", "journal");
    const journalFiles = fs.existsSync(journalDir)
      ? fs.readdirSync(journalDir).filter((f) => f.endsWith(".md") && f !== "README.md")
      : [];
    expect(journalFiles).toHaveLength(0);
    expect(loadTasks(dir).tasks[0]!.status).toBe("pending");
  });

  it("surfaces a missing CLI (exit 127) distinctly", async () => {
    addTask(dir, { title: "t", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = "exit 127";
    const { config, policy } = deps();
    await expect(runLoop(dir, config, policy, new MockRunner(), {})).rejects.toThrowError(/preflight:.*not found on PATH/);
  });

  it("--skip-preflight bypasses the probe entirely", async () => {
    addTask(dir, { title: "real work", acceptance: ["a"] });
    // Records whether preflight ran; behaves honestly for build/verify.
    const marker = path.join(dir, ".agents", ".cache", "preflight-ran");
    process.env.AGENTIC_MOCK_SCRIPT = [
      `if [ "$AGENTIC_LOOP_PHASE" = "preflight" ]; then touch "${marker}"; printf OK > "$AGENTIC_PREFLIGHT_FILE"; exit 0; fi`,
      honestAgentScript(),
    ].join("\n");

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { skipPreflight: true });
    expect(result.state).toBe("success");
    expect(fs.existsSync(marker)).toBe(false); // probe never invoked
  });
});

describe("plan mode (single iteration, no task selection, no verifier)", () => {
  it("succeeds when the planner adds tasks: pending count increases, chain valid, nothing started", async () => {
    // One pre-existing pending task proves "strictly increased", not "non-zero".
    addTask(dir, { title: "already on the board", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = [
      'if [ "$AGENTIC_LOOP" != "1" ]; then echo "AGENTIC_LOOP not set" >&2; exit 9; fi',
      'if [ "$AGENTIC_LOOP_PHASE" != "plan" ]; then echo "unexpected phase" >&2; exit 9; fi',
      `node "${CLI_PATH}" tasks add --title "planned one" --acceptance "criterion 1" >&2`,
      `node "${CLI_PATH}" tasks add --title "planned two" --acceptance "criterion 2" >&2`,
      'echo "plan recorded"',
    ].join("\n");

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { mode: "plan", skipPreflight: true });

    expect(result.state).toBe("success");
    expect(result.reason).toMatch(/added 2 pending task\(s\)/);
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0]!.taskId).toBe("(plan)");
    expect(result.iterations[0]!.outcome).toBe("completed");
    expect(result.iterations[0]!.verdict).toBe("skipped"); // verifier pass never runs in plan mode

    const tasks = loadTasks(dir);
    expect(tasks.tasks).toHaveLength(3);
    expect(tasks.tasks.every((t) => t.status === "pending")).toBe(true); // nothing selected or started
    const journal = readLoopJournal("plan");
    expect(journal).toContain("loop plan iteration — completed");
    expect(journal).toContain("pendingTasks: 1 -> 3");
    expect(existsIn(dir, ".agents/BLOCKED.md")).toBe(false);
  });

  it("blocks (without BLOCKED.md or blocked tasks) when the planner adds nothing", async () => {
    addTask(dir, { title: "untouched", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = 'echo "I planned nothing"';

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { mode: "plan", skipPreflight: true });

    expect(result.state).toBe("blocked");
    expect(result.reason).toMatch(/pending task count did not increase \(1 -> 1\)/);
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0]!.outcome).toBe("failed");
    expect(existsIn(dir, ".agents/BLOCKED.md")).toBe(false); // plan mode never writes BLOCKED.md
    expect(loadTasks(dir).tasks[0]!.status).toBe("pending"); // ...and never marks tasks blocked
    expect(readLoopJournal("plan")).toContain("loop plan iteration — failed");
  });
});

describe("loop --task targeting", () => {
  it("terminates blocked (not success) when the targeted task is blocked", async () => {
    addTask(dir, { title: "stuck", acceptance: ["a"] });
    const { blockTask } = await import("../src/tasks.js");
    blockTask(dir, "T-001");
    process.env.AGENTIC_MOCK_SCRIPT = "echo never invoked";

    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { taskId: "T-001", skipPreflight: true });

    expect(result.state).toBe("blocked");
    expect(result.reason).toMatch(/tasks start T-001/);
    expect(result.iterations).toHaveLength(0);
  });

  it("keeps the finished/success behavior for a done target", async () => {
    addTask(dir, { title: "done already", acceptance: ["a"] });
    process.env.AGENTIC_SKIP_GATES = "1";
    try {
      const { completeTask } = await import("../src/tasks.js");
      await completeTask(dir, loadAgenticConfig(dir), "T-001", "pre-done");
    } finally {
      delete process.env.AGENTIC_SKIP_GATES;
    }
    process.env.AGENTIC_MOCK_SCRIPT = "echo never invoked";
    const { config, policy } = deps();
    const result = await runLoop(dir, config, policy, new MockRunner(), { taskId: "T-001", skipPreflight: true });
    expect(result.state).toBe("success");
    expect(result.reason).toMatch(/task T-001 finished/);
  });
});

describe("loop caps", () => {
  it("CLI flags may lower approvals.yaml caps but never raise them", () => {
    expect(effectiveCap(10, undefined, "max-iterations")).toBe(10);
    expect(effectiveCap(10, 3, "max-iterations")).toBe(3);
    expect(effectiveCap(10, 50, "max-iterations")).toBe(10); // clamped down to the policy cap
  });

  it("fails with an actionable error when a loop prompt file is missing", async () => {
    fs.rmSync(path.join(dir, ".agents", "prompts", "build.md"));
    addTask(dir, { title: "t", acceptance: ["a"] });
    process.env.AGENTIC_MOCK_SCRIPT = "true";
    const { config, policy } = deps();
    await expect(runLoop(dir, config, policy, new MockRunner(), {})).rejects.toThrowError(/missing loop prompt .agents\/prompts\/build\.md/);
  });
});
