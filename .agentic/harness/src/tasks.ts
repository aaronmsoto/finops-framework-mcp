import fs from "node:fs";
import path from "node:path";
import type { AgenticConfig } from "./config.js";
import { runGates, summarizeReport } from "./gates.js";
import { CliError, canonicalJson, ensureDir, git, gitHead, logErr, nowIso, sha256Hex } from "./util.js";

export type TaskStatus = "pending" | "in_progress" | "done" | "blocked";

export interface TaskEvidence {
  gates: "pass";
  summary: string;
  commit: string;
  verifiedBy: "gates" | "reviewer" | "human";
  completedAt: string;
}

export interface Task {
  id: string;
  title: string;
  spec?: string;
  acceptance: string[];
  status: TaskStatus;
  evidence: TaskEvidence | null;
  hash: string | null;
}

export interface TasksFile {
  version: 1;
  chainHead: string;
  tasks: Task[];
}

export const GENESIS = "genesis";

export function tasksPath(rootDir: string): string {
  return path.join(rootDir, ".agents", "tasks.json");
}

export function emptyTasksFile(): TasksFile {
  return { version: 1, chainHead: GENESIS, tasks: [] };
}

/** Load .agents/tasks.json, or null when the file does not exist. */
export function tryLoadTasks(rootDir: string): TasksFile | null {
  const file = tasksPath(rootDir);
  if (!fs.existsSync(file)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new CliError(`.agents/tasks.json: invalid JSON — ${(err as Error).message}`);
  }
  return validateTasksShape(raw);
}

export function loadTasks(rootDir: string): TasksFile {
  const file = tryLoadTasks(rootDir);
  if (file === null) {
    throw new CliError(
      `.agents/tasks.json not found under ${rootDir} — run \`agentic init\` or \`agentic tasks add\` to create it.`,
    );
  }
  return file;
}

export function saveTasks(rootDir: string, file: TasksFile): void {
  const p = tasksPath(rootDir);
  ensureDir(path.dirname(p));
  // Temp-file + rename so a killed process (loop timeouts SIGKILL the group)
  // can never leave a torn tasks.json (necessity-review B2-soundness-4).
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(file, null, 2) + "\n");
  fs.renameSync(tmp, p);
}

const TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "done", "blocked"];

function validateTasksShape(raw: unknown): TasksFile {
  const F = ".agents/tasks.json";
  const err = (msg: string): never => {
    throw new CliError(`${F}: ${msg}`);
  };
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) err("top level must be an object");
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) err(`version must be 1 (got ${JSON.stringify(obj.version)})`);
  if (typeof obj.chainHead !== "string" || obj.chainHead === "") err("chainHead must be a non-empty string");
  if (!Array.isArray(obj.tasks)) err("tasks must be an array");
  const tasks: Task[] = (obj.tasks as unknown[]).map((t, i) => {
    if (t === null || typeof t !== "object" || Array.isArray(t)) err(`tasks[${i}] must be an object`);
    const task = t as Record<string, unknown>;
    if (typeof task.id !== "string" || task.id === "") err(`tasks[${i}].id must be a non-empty string`);
    if (typeof task.title !== "string" || task.title === "") err(`tasks[${i}].title must be a non-empty string`);
    if (task.spec !== undefined && typeof task.spec !== "string") err(`tasks[${i}].spec must be a string when present`);
    if (!Array.isArray(task.acceptance) || task.acceptance.length === 0 || !task.acceptance.every((a) => typeof a === "string")) {
      err(`tasks[${i}].acceptance must be a non-empty array of strings`);
    }
    if (!TASK_STATUSES.includes(task.status as TaskStatus)) {
      err(`tasks[${i}].status must be one of ${TASK_STATUSES.join("|")} (got ${JSON.stringify(task.status)})`);
    }
    if (task.hash !== null && typeof task.hash !== "string") err(`tasks[${i}].hash must be null or a string`);
    if (task.evidence !== null && (typeof task.evidence !== "object" || Array.isArray(task.evidence))) {
      err(`tasks[${i}].evidence must be null or an object`);
    }
    return {
      id: task.id as string,
      title: task.title as string,
      ...(task.spec !== undefined ? { spec: task.spec as string } : {}),
      acceptance: task.acceptance as string[],
      status: task.status as TaskStatus,
      evidence: task.evidence as TaskEvidence | null,
      hash: task.hash as string | null,
    };
  });
  return { version: 1, chainHead: obj.chainHead as string, tasks };
}

/** sha256 over (prevHash + id + canonical-JSON(evidence)) — the chain link. */
export function computeTaskHash(prevHash: string, id: string, evidence: TaskEvidence | null): string {
  return sha256Hex(prevHash + id + canonicalJson(evidence));
}

export function findTask(file: TasksFile, id: string): Task {
  const task = file.tasks.find((t) => t.id === id);
  if (!task) {
    throw new CliError(`no task with id "${id}" — run \`agentic tasks list\` to see known tasks.`);
  }
  return task;
}

/** First pending task in file order, or null. */
export function nextTask(file: TasksFile): Task | null {
  return file.tasks.find((t) => t.status === "pending") ?? null;
}

export interface AddTaskInput {
  title: string;
  acceptance: string[];
  spec?: string;
}

export function addTask(rootDir: string, input: AddTaskInput): Task {
  if (input.title.trim() === "") throw new CliError("task title must not be empty");
  if (input.acceptance.length === 0 || input.acceptance.some((a) => a.trim() === "")) {
    throw new CliError("at least one non-empty --acceptance criterion is required");
  }
  const file = tryLoadTasks(rootDir) ?? emptyTasksFile();
  let max = 0;
  for (const t of file.tasks) {
    const m = /^T-(\d+)$/.exec(t.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const task: Task = {
    id: `T-${String(max + 1).padStart(3, "0")}`,
    title: input.title,
    ...(input.spec !== undefined ? { spec: input.spec } : {}),
    acceptance: input.acceptance,
    status: "pending",
    evidence: null,
    hash: null,
  };
  file.tasks.push(task);
  saveTasks(rootDir, file);
  return task;
}

export function startTask(rootDir: string, id: string): Task {
  const file = loadTasks(rootDir);
  const task = findTask(file, id);
  if (task.status === "in_progress") return task; // idempotent
  // Blocked tasks are restartable: `tasks start` is the documented recovery
  // path after a blocker is resolved (moving blocked -> in_progress).
  if (task.status !== "pending" && task.status !== "blocked") {
    throw new CliError(`task ${id} is ${task.status} — only pending or blocked tasks can be started.`);
  }
  task.status = "in_progress";
  saveTasks(rootDir, file);
  return task;
}

export function blockTask(rootDir: string, id: string): Task {
  const file = loadTasks(rootDir);
  const task = findTask(file, id);
  if (task.status === "done") {
    throw new CliError(`task ${id} is already done — completed tasks cannot be blocked.`);
  }
  task.status = "blocked";
  saveTasks(rootDir, file);
  return task;
}

export interface CompleteOptions {
  quietGates?: boolean;
}

/**
 * Complete a task: run fast gates first (skippable ONLY via
 * AGENTIC_SKIP_GATES=1, intended for tests — logged loudly), then extend the
 * hash chain with the evidence record.
 */
export async function completeTask(
  rootDir: string,
  config: AgenticConfig,
  id: string,
  summary: string,
  opts: CompleteOptions = {},
): Promise<Task> {
  if (summary.trim() === "") throw new CliError("--summary must not be empty: describe what was done and how it was verified.");
  const file = loadTasks(rootDir);
  const task = findTask(file, id);
  if (task.status === "done") throw new CliError(`task ${id} is already done.`);
  if (task.status === "blocked") throw new CliError(`task ${id} is blocked — unblock it (tasks start) before completing.`);

  if (process.env.AGENTIC_SKIP_GATES === "1") {
    logErr("!!! AGENTIC_SKIP_GATES=1 — SKIPPING GATES for tasks complete. This is for tests only; never ship a task this way.");
  } else {
    const report = await runGates(rootDir, config, { tier: "fast", quiet: opts.quietGates });
    if (!report.ok) {
      throw new CliError(`refusing to complete ${id}: fast gates failed — ${summarizeReport(report)}. Fix the failures and retry.`);
    }
  }

  const status = git(rootDir, ["status", "--porcelain"]);
  if (status.ok && status.stdout.trim() !== "") {
    logErr(`[tasks] warning: working tree has uncommitted changes — the loop's independent check expects one commit per task.`);
  }

  const head = gitHead(rootDir);
  if (head === null) {
    logErr(`[tasks] warning: could not resolve HEAD (not a git repo or no commits) — recording commit "unknown".`);
  }

  const evidence: TaskEvidence = {
    gates: "pass",
    summary,
    commit: head ?? "unknown",
    verifiedBy: "gates",
    completedAt: nowIso(),
  };
  task.evidence = evidence;
  task.hash = computeTaskHash(file.chainHead, task.id, evidence);
  task.status = "done";
  file.chainHead = task.hash;
  saveTasks(rootDir, file);
  return task;
}

/**
 * `tasks complete --commit`: after the chain is extended, commit
 * .agents/tasks.json so the chain state never dangles uncommitted after the
 * work commit. Runs from the repo root. No-op (with a notice) when
 * .agents/tasks.json is unchanged in git terms; throws a clear error when
 * git fails.
 */
export function commitTaskRecord(rootDir: string, id: string): { committed: boolean; notice?: string } {
  const rel = ".agents/tasks.json";
  const status = git(rootDir, ["status", "--porcelain", "--", rel]);
  if (!status.ok) throw new CliError(`--commit: git status failed — ${status.stderr.trim() || "not a git repository?"}`);
  if (status.stdout.trim() === "") {
    return { committed: false, notice: `${rel} is unchanged in git terms — nothing to commit.` };
  }
  const add = git(rootDir, ["add", rel]);
  if (!add.ok) throw new CliError(`--commit: git add ${rel} failed — ${add.stderr.trim()}`);
  const commit = git(rootDir, ["commit", "-m", `Record ${id} completion`]);
  if (!commit.ok) throw new CliError(`--commit: git commit failed — ${(commit.stderr.trim() || commit.stdout.trim()) || `exit ${commit.exitCode}`}`);
  return { committed: true };
}

export interface ChainValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Re-verify the hash chain. Reconstructs completion order independently of
 * file order: starting from "genesis", repeatedly finds the done task whose
 * stored hash matches sha256(prev + id + evidence). Any hand-edited status,
 * evidence, or hash breaks reconstruction.
 */
export function validateChain(file: TasksFile): ChainValidation {
  const errors: string[] = [];

  for (const task of file.tasks) {
    if (task.status === "done") {
      if (task.evidence === null) errors.push(`task ${task.id} is done but has no evidence`);
      if (task.hash === null) errors.push(`task ${task.id} is done but has no chain hash`);
    } else {
      if (task.hash !== null) errors.push(`task ${task.id} is ${task.status} but carries a chain hash`);
      if (task.evidence !== null) errors.push(`task ${task.id} is ${task.status} but carries evidence`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const order = chainOrder(file);
  if (order === null) {
    errors.push(
      "chain broken: could not reconstruct a completion order from the stored hashes — a done task was edited by hand or its hash does not link to the chain",
    );
    return { ok: false, errors };
  }
  const head = order.length === 0 ? GENESIS : order[order.length - 1]!.hash!;
  if (head !== file.chainHead) {
    errors.push(`chainHead mismatch: expected ${head}, found ${file.chainHead}`);
  }
  return { ok: errors.length === 0, errors };
}

/** Done tasks in verified completion order, or null when the chain is broken. */
export function chainOrder(file: TasksFile): Task[] | null {
  const remaining = file.tasks.filter((t) => t.status === "done");
  const order: Task[] = [];
  let prev = GENESIS;
  while (remaining.length > 0) {
    const idx = remaining.findIndex((t) => t.hash === computeTaskHash(prev, t.id, t.evidence));
    if (idx === -1) return null;
    const [task] = remaining.splice(idx, 1);
    order.push(task!);
    prev = task!.hash!;
  }
  return order;
}

/**
 * Safely pop the newest chain entry: revert a completed task back to pending
 * (used by the loop when independent verification fails). Only the task at
 * the chain head can be reverted.
 */
export function revertTask(rootDir: string, id: string): Task {
  const file = loadTasks(rootDir);
  const task = findTask(file, id);
  if (task.status !== "done") throw new CliError(`task ${id} is ${task.status}, not done — nothing to revert.`);
  if (task.hash !== file.chainHead) {
    throw new CliError(`task ${id} is not the chain head — only the most recently completed task can be reverted.`);
  }
  const order = chainOrder(file);
  if (order === null) {
    throw new CliError("cannot revert: the hash chain is broken — run `agentic tasks validate` and repair tasks.json first.");
  }
  const prevHash = order.length >= 2 ? order[order.length - 2]!.hash! : GENESIS;
  task.status = "pending";
  task.evidence = null;
  task.hash = null;
  file.chainHead = prevHash;
  saveTasks(rootDir, file);
  return task;
}

export function statusCounts(file: TasksFile): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { pending: 0, in_progress: 0, done: 0, blocked: 0 };
  for (const t of file.tasks) counts[t.status]++;
  return counts;
}
