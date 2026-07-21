import type { AgenticConfig } from "./config.js";
import { runGates, summarizeReport } from "./gates.js";
import { findTask, loadTasks, validateChain } from "./tasks.js";
import { git } from "./util.js";

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface VerifyResult {
  ok: boolean;
  checks: VerifyCheck[];
}

/**
 * Deterministic verification, used by CI and the loop's terminal check:
 * fast gates green + hash chain valid + working tree committed + every done
 * task carries evidence (and every task has acceptance criteria).
 */
export async function runVerify(rootDir: string, config: AgenticConfig, opts: { taskId?: string } = {}): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];

  const gates = await runGates(rootDir, config, { tier: "fast" });
  checks.push({ name: "gates-fast", ok: gates.ok, detail: summarizeReport(gates) });

  const tasksFile = loadTasks(rootDir);
  const chain = validateChain(tasksFile);
  checks.push({ name: "chain-valid", ok: chain.ok, detail: chain.ok ? "hash chain verified" : chain.errors.join("; ") });

  const status = git(rootDir, ["status", "--porcelain"]);
  if (!status.ok) {
    checks.push({ name: "working-tree-clean", ok: false, detail: "not a git repository (or git failed) — verification requires committed work" });
  } else {
    const dirty = status.stdout.trim();
    checks.push({
      name: "working-tree-clean",
      ok: dirty === "",
      detail: dirty === "" ? "no uncommitted changes" : `uncommitted changes:\n${dirty}`,
    });
  }

  const missingEvidence = tasksFile.tasks.filter((t) => t.status === "done" && (t.evidence === null || t.hash === null));
  checks.push({
    name: "done-tasks-have-evidence",
    ok: missingEvidence.length === 0,
    detail: missingEvidence.length === 0 ? "all done tasks carry evidence" : `missing evidence: ${missingEvidence.map((t) => t.id).join(", ")}`,
  });

  const missingAcceptance = tasksFile.tasks.filter((t) => t.acceptance.length === 0);
  checks.push({
    name: "acceptance-criteria-present",
    ok: missingAcceptance.length === 0,
    detail: missingAcceptance.length === 0 ? "every task has acceptance criteria" : `missing acceptance: ${missingAcceptance.map((t) => t.id).join(", ")}`,
  });

  if (opts.taskId !== undefined) {
    const task = findTask(tasksFile, opts.taskId);
    const done = task.status === "done" && task.evidence !== null;
    checks.push({
      name: `task-${opts.taskId}-done`,
      ok: done,
      detail: done ? `done at ${task.evidence!.completedAt} (commit ${task.evidence!.commit})` : `status is ${task.status}`,
    });
  }

  return { ok: checks.every((c) => c.ok), checks };
}
