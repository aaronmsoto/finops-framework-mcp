import fs from "node:fs";
import path from "node:path";
import type { AgenticConfig, ApprovalsPolicy } from "./config.js";
import { runGates, summarizeReport, type GatesReport } from "./gates.js";
import { appendJournalEntry } from "./journal.js";
import { addTokens, tokenTotals, ZERO_TOKENS, type AgentRunner, type RunnerResult, type TokenTotals } from "./runners/types.js";
import {
  blockTask,
  loadTasks,
  nextTask,
  revertTask,
  statusCounts,
  tryLoadTasks,
  validateChain,
  type Task,
  type TasksFile,
  type TaskStatus,
} from "./tasks.js";
import { CliError, git, gitHead, logErr, nowIso, readTextIfExists } from "./util.js";

export type LoopState = "success" | "budget_exhausted" | "blocked";
export type LoopMode = "build" | "plan";

export interface IterationRecord {
  n: number;
  taskId: string;
  taskTitle: string;
  outcome: "completed" | "failed";
  verdict: "pass" | "fail" | "skipped";
  gatesOk: boolean;
  chainOk: boolean;
  commitMade: boolean;
  durationMs: number;
  details: string[];
  /** Build + verify token usage for this iteration (zeros when the runner reports none). */
  tokens?: TokenTotals;
  /** Repo-relative path of the persisted verifier transcript, when one was written. */
  verifyEvidence?: string;
}

export interface LoopResult {
  state: LoopState;
  reason: string;
  iterations: IterationRecord[];
  durationMs: number;
  /** Cumulative token usage across every runner call in the run. */
  totalTokens: TokenTotals;
}

export interface LoopOptions {
  mode?: LoopMode;
  /** CLI flags may LOWER the approvals.yaml caps, never raise them. */
  maxIterations?: number;
  maxMinutes?: number;
  maxIterationMinutes?: number;
  maxConsecutiveFailures?: number;
  noVerify?: boolean;
  taskId?: string;
  /** Skip the one-time runner preflight probe (default: probe runs). */
  skipPreflight?: boolean;
}

export function blockedFilePath(rootDir: string): string {
  return path.join(rootDir, ".agents", "BLOCKED.md");
}

/** Heartbeat state file a running loop maintains for supervisors (`agentic status`). */
export function loopStatePath(rootDir: string): string {
  return path.join(rootDir, ".agents", ".cache", "loop-state.json");
}

export interface LoopStateFile {
  version: 1;
  pid: number;
  runId: string;
  mode: LoopMode;
  startedAt: string;
  updatedAt: string;
  /** preflight | plan | build | verify | terminal:<state> | terminal:error */
  phase: string;
  iteration: { n: number; max: number } | null;
  taskId: string | null;
  caps: { maxIterations: number; maxMinutes: number; maxIterationMinutes: number; maxConsecutiveFailures: number; maxTotalTokens: number | null };
  tokens: TokenTotals;
  consecutiveFailures: number;
}

/**
 * Commit the run's own journal file at terminal state so a finished loop
 * leaves a clean tree (previously every run ended with the journal dirty,
 * tripping stop-hooks and the next verifier's cleanliness expectations).
 * Pathspec-scoped add AND commit so nothing else — even runner-staged
 * leftovers — can ride along. Best-effort: failures warn, never change the
 * terminal state.
 */
function commitLoopJournal(rootDir: string, journalFile: string | null, state: LoopState): void {
  if (journalFile === null) return; // 0-iteration terminal: no journal file was created
  const rel = path.relative(rootDir, journalFile);
  const status = git(rootDir, ["status", "--porcelain", "--", rel]);
  if (!status.ok || status.stdout.trim() === "") return; // untouched or unknowable — nothing to do
  const add = git(rootDir, ["add", "--", rel]);
  const commit = add.ok ? git(rootDir, ["commit", "-m", `Record loop run journal (${state})`, "--", rel]) : add;
  if (commit.ok) {
    logErr(`[loop] committed run journal ${rel}`);
  } else {
    logErr(`[loop] could not commit run journal ${rel}: ${(commit.stderr || commit.stdout).trim()}`);
  }
}

/**
 * Best-effort terminal stamp for crashes: a thrown CliError must not leave
 * the state file claiming the loop is still running. Never throws.
 */
function markLoopStateError(rootDir: string, message: string): void {
  try {
    const file = loopStatePath(rootDir);
    const existing = readTextIfExists(file);
    if (existing === null) return; // failed before the first heartbeat — nothing to correct
    const state = JSON.parse(existing) as LoopStateFile;
    if (state.pid !== process.pid) return; // stale file from another run — leave it alone
    state.phase = "terminal:error";
    state.updatedAt = nowIso();
    fs.writeFileSync(file, `${JSON.stringify({ ...state, error: message }, null, 2)}\n`);
  } catch {
    // observability only — never mask the original error
  }
}

function promptPath(rootDir: string, name: string): string {
  return path.join(rootDir, ".agents", "prompts", name);
}

function readPrompt(rootDir: string, name: string): string {
  const file = promptPath(rootDir, name);
  const text = readTextIfExists(file);
  if (text === null) {
    throw new CliError(
      `missing loop prompt ${path.relative(rootDir, file)} — the loop composes its prompt from that file. Restore it from the template.`,
    );
  }
  return text;
}

/** Name which budget killed a timed-out runner so the failure is diagnosable. */
function timeoutDetail(appliedMs: number, iterCapMs: number): string {
  return appliedMs >= iterCapMs
    ? `runner timed out (killed at the per-iteration cap, ${iterCapMs / 60_000} minute(s))`
    : "runner timed out (killed at the wall-clock budget)";
}

/** LOCAL-time HHMMSS: keeps parallel same-day runs writing distinct journal files. */
function timeOfDayStamp(date = new Date()): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, "0")).join("");
}

/** Clamp a CLI-provided cap to the policy cap: flags lower, never raise. */
export function effectiveCap(policyCap: number, cliValue: number | undefined, label: string): number {
  if (cliValue === undefined) return policyCap;
  if (cliValue <= 0) throw new CliError(`--${label} must be a positive number.`);
  if (cliValue > policyCap) {
    logErr(`[loop] --${label} ${cliValue} exceeds the approvals.yaml cap ${policyCap} — using ${policyCap} (flags may lower caps, never raise them).`);
    return policyCap;
  }
  return cliValue;
}

function taskFooter(task: Task): string {
  const lines = [
    "",
    "---",
    "SELECTED TASK (assigned by the harness — do exactly this one):",
    `- id: ${task.id}`,
    `- title: ${task.title}`,
    ...(task.spec ? [`- spec: ${task.spec}`] : []),
    "- acceptance criteria:",
    ...task.acceptance.map((a) => `  - ${a}`),
    "",
  ];
  return lines.join("\n");
}

/**
 * Short generated footer for plan mode: the plan.md preamble goes through
 * verbatim; this only adds the current pending-task count and the files
 * under .agents/specs/ so the initializer knows what is already on the board.
 */
function planFooter(rootDir: string, pendingCount: number): string {
  let specs: string[] = [];
  try {
    specs = fs
      .readdirSync(path.join(rootDir, ".agents", "specs"))
      .filter((f) => !f.startsWith("."))
      .sort();
  } catch {
    // no specs directory — nothing to list
  }
  return [
    "",
    "---",
    "PLANNING CONTEXT (generated by the harness):",
    `- pending tasks right now: ${pendingCount}`,
    `- files under .agents/specs/: ${specs.join(", ") || "(none)"}`,
    "",
  ].join("\n");
}

function verifyFooter(task: Task): string {
  return [
    "",
    "---",
    "TASK UNDER VERIFICATION:",
    "```json",
    JSON.stringify({ id: task.id, title: task.title, acceptance: task.acceptance, evidence: task.evidence }, null, 2),
    "```",
    "",
    "End your reply with a single line: VERDICT: pass  — or —  VERDICT: fail",
    "",
  ].join("\n");
}

function snapshotStatuses(file: TasksFile): Map<string, TaskStatus> {
  return new Map(file.tasks.map((t) => [t.id, t.status]));
}

function movedTasks(before: Map<string, TaskStatus>, after: TasksFile): string[] {
  const moved: string[] = [];
  for (const t of after.tasks) {
    const prev = before.get(t.id);
    if (prev === undefined || prev !== t.status) moved.push(t.id);
  }
  return moved;
}

function selectTask(file: TasksFile, taskId: string | undefined): Task | null {
  if (taskId !== undefined) {
    const task = file.tasks.find((t) => t.id === taskId);
    if (!task) throw new CliError(`--task ${taskId}: no such task.`);
    if (task.status === "pending" || task.status === "in_progress") return task;
    return null; // done: nothing left to do for this task (blocked targets terminate earlier)
  }
  return nextTask(file);
}

/**
 * The supervised autonomous loop (refined Ralph pattern). Caps come from
 * approvals.yaml; a fresh runner process is spawned per iteration; the
 * harness independently re-checks gates, chain, and commits after each one.
 */
const PREFLIGHT_TIMEOUT_MS = 120_000;

/**
 * Last N non-empty lines of what the runner actually said (stderr first —
 * CLI-level refusals land there — then finalText, then raw events), so a
 * preflight failure message carries the real cause instead of only an exit
 * code. Lines are truncated to keep CliError messages bounded.
 */
export function runnerOutputTail(res: RunnerResult, maxLines = 10): string {
  let combined = `${res.stderr ?? ""}\n${res.finalText}`;
  if (combined.trim() === "") {
    combined = res.events
      .map((ev) => (typeof ev.text === "string" ? ev.text : ""))
      .join("\n");
  }
  const lines = combined
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .slice(-maxLines)
    .map((line) => (line.length > 200 ? `${line.slice(0, 200)}…` : line));
  if (lines.length === 0) return "";
  return `\nrunner output (last ${lines.length} line(s)):\n  ${lines.join("\n  ")}`;
}

/**
 * Persist the verifier's transcript so a rubber-stamping verifier is
 * distinguishable from a rigorous one after the fact. Files live under the
 * gitignored .agents/.cache/verify/; the journal carries the path plus a
 * short excerpt as the durable trace. Never throws — evidence is best-effort
 * and must not fail an otherwise-judged iteration.
 */
function writeVerifyEvidence(
  rootDir: string,
  taskId: string,
  iteration: number,
  verdict: string,
  res: RunnerResult,
): string | null {
  try {
    const dir = path.join(rootDir, ".agents", ".cache", "verify");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${taskId}-${Date.now()}.md`);
    const lines = [
      `# Verifier evidence — ${taskId} (iteration ${iteration})`,
      "",
      `- verdict: ${verdict}`,
      `- recorded: ${nowIso()}`,
      `- exit code: ${res.exitCode ?? "null"}`,
      `- duration: ${res.durationMs}ms`,
      `- timed out: ${res.timedOut}`,
      `- usage: ${res.usage !== undefined ? JSON.stringify(res.usage) : "(none reported)"}`,
      "",
      "## Verifier transcript (finalText, verbatim)",
      "",
      res.finalText.trim() === "" ? "(empty)" : res.finalText,
      "",
    ];
    fs.writeFileSync(file, lines.join("\n"));
    return path.relative(rootDir, file);
  } catch (err) {
    logErr(`[loop] could not persist verifier evidence for ${taskId}: ${(err as Error).message}`);
    return null;
  }
}

/** Known-cause hints appended to preflight failures (currently: root refusal → IS_SANDBOX=1). */
export function preflightHint(runner: AgentRunner, res: RunnerResult): string {
  const output = `${res.stderr ?? ""}\n${res.finalText}`;
  const rootRefusal = /--dangerously-skip-permissions[^\n]*(root|sudo)/i.test(output);
  const claudeAsRoot = runner.name === "claude" && typeof process.getuid === "function" && process.getuid() === 0;
  if (rootRefusal || claudeAsRoot) {
    return `\nHint: the Claude CLI refuses --dangerously-skip-permissions as root — set IS_SANDBOX=1 in the environment for containerized root runs (see .agentic/docs/operations.md, "Headless container profile").`;
  }
  return "";
}

/**
 * One-time, before the first iteration: prove the runner can actually make a
 * file edit in this environment, so a dead runner (missing CLI, untrusted
 * workspace, a permission mode that denies edits in headless `-p`) fails fast
 * with guidance instead of burning `max_consecutive_failures` identical "no
 * new commit" iterations. Writes a gitignored sentinel via the agent and
 * checks it appeared; throws CliError (never a pseudo terminal state) on
 * failure. The mock runner receives the target path in AGENTIC_PREFLIGHT_FILE.
 */
async function runPreflight(rootDir: string, runner: AgentRunner, remainingMs: number): Promise<void> {
  const sentinel = path.join(rootDir, ".agents", ".cache", `preflight-${Date.now()}-${process.pid}`);
  fs.mkdirSync(path.dirname(sentinel), { recursive: true });
  fs.rmSync(sentinel, { force: true });
  const prompt =
    `Preflight check: create the file at the path in the AGENTIC_PREFLIGHT_FILE environment variable ` +
    `(${sentinel}) containing exactly the text OK, then stop. Do nothing else.`;
  let res;
  let wrote: boolean;
  try {
    res = await runner.run({
      prompt,
      cwd: rootDir,
      timeoutMs: Math.max(1, Math.min(remainingMs, PREFLIGHT_TIMEOUT_MS)),
      extraEnv: { AGENTIC_LOOP: "1", AGENTIC_LOOP_PHASE: "preflight", AGENTIC_PREFLIGHT_FILE: sentinel },
    });
    wrote = fs.existsSync(sentinel); // capture BEFORE cleanup
  } finally {
    // best-effort: sentinel is gitignored, but never leave it behind
    fs.rmSync(sentinel, { force: true });
  }
  const fix = `Fix the environment or rerun with --skip-preflight.`;
  const detail = runnerOutputTail(res) + preflightHint(runner, res);
  if (res.timedOut) {
    throw new CliError(`preflight: the ${runner.name} runner did not respond within ${Math.round(PREFLIGHT_TIMEOUT_MS / 1000)}s — it may be hung or awaiting interactive auth/login. ${fix}${detail}`);
  }
  if (res.exitCode === 127) {
    throw new CliError(`preflight: the ${runner.name} CLI was not found on PATH — install it (or fix PATH) before running the loop. ${fix}${detail}`);
  }
  if (res.exitCode !== 0) {
    throw new CliError(`preflight: the ${runner.name} runner exited ${res.exitCode ?? "null"} on a trivial edit — check it is logged in and authorized. ${fix}${detail}`);
  }
  if (!wrote) {
    throw new CliError(
      `preflight: the ${runner.name} runner ran but did not create the sentinel file — the workspace is likely not trusted, or the permission mode denies edits in headless (-p) mode. Trust the workspace once interactively, pass a permission mode via AGENTIC_${runner.name === "copilot" ? "COPILOT" : "CLAUDE"}_ARGS, or rerun with --skip-preflight.${detail}`,
    );
  }
  logErr(`[loop] preflight: ${runner.name} runner can edit files — proceeding.`);
}

export async function runLoop(
  rootDir: string,
  config: AgenticConfig,
  policy: ApprovalsPolicy,
  runner: AgentRunner,
  opts: LoopOptions = {},
): Promise<LoopResult> {
  try {
    return await runLoopInner(rootDir, config, policy, runner, opts);
  } catch (err) {
    markLoopStateError(rootDir, (err as Error).message);
    throw err;
  }
}

async function runLoopInner(
  rootDir: string,
  config: AgenticConfig,
  policy: ApprovalsPolicy,
  runner: AgentRunner,
  opts: LoopOptions = {},
): Promise<LoopResult> {
  const mode: LoopMode = opts.mode ?? "build";
  let maxIterations = effectiveCap(policy.loop.max_iterations, opts.maxIterations, "max-iterations");
  const maxMinutes = effectiveCap(policy.loop.max_wall_minutes, opts.maxMinutes, "max-minutes");
  const maxConsecutiveFailures = effectiveCap(
    policy.loop.max_consecutive_failures,
    opts.maxConsecutiveFailures,
    "max-consecutive-failures",
  );
  const iterCapMs = effectiveCap(policy.loop.max_iteration_minutes, opts.maxIterationMinutes, "max-iteration-minutes") * 60_000;

  // Without an explicit --max-iterations, size the run to its queue instead
  // of the raw policy ceiling: pending + 2 leaves headroom for one retry and
  // the final no-work pass, and a small queue no longer inherits a 10-round
  // failure budget.
  if (mode === "build" && opts.maxIterations === undefined) {
    const pendingNow = (() => {
      const file = tryLoadTasks(rootDir);
      return file === null ? 0 : statusCounts(file).pending + statusCounts(file).in_progress;
    })();
    const derived = Math.min(pendingNow + 2, policy.loop.max_iterations);
    if (derived < maxIterations) {
      logErr(`[loop] iteration budget defaulted to ${derived} (pending tasks ${pendingNow} + 2, policy cap ${policy.loop.max_iterations}) — pass --max-iterations to override.`);
      maxIterations = derived;
    }
  }

  if (runner.name === "mock") {
    logErr(
      '[loop] mock contract: your script must (build phase) make a commit and run `tasks complete "$AGENTIC_TASK_ID"`; (verify phase, AGENTIC_LOOP_PHASE=verify) print `VERDICT: pass|fail`.',
    );
  }

  const basePrompt = readPrompt(rootDir, mode === "plan" ? "plan.md" : "build.md");
  const verifyPrompt = mode === "plan" || opts.noVerify ? null : readPrompt(rootDir, "verify.md");

  const started = Date.now();
  const records: IterationRecord[] = [];
  let consecutiveFailures = 0;
  let lastGates: GatesReport | null = null;
  const maxTotalTokens = policy.loop.max_total_tokens;
  let runTokens = ZERO_TOKENS;

  const fmtTokens = (t: TokenTotals): string =>
    `in=${t.input} out=${t.output} cacheRead=${t.cacheRead} cacheCreation=${t.cacheCreation} total=${t.total}`;

  // The journal slug doubles as the run id in the heartbeat file — computed
  // before preflight so even a preflight-failed run is identifiable.
  const journalSlug = `loop-${mode}-${timeOfDayStamp()}`;

  // Heartbeat: overwrite the state file on every phase transition so
  // `agentic status` can tell a live loop (fresh updatedAt + alive pid)
  // from a crashed or finished one. Best-effort; never fails the loop.
  const heartbeat = (phase: string, iteration: { n: number; max: number } | null = null, taskId: string | null = null): void => {
    const state: LoopStateFile = {
      version: 1,
      pid: process.pid,
      runId: journalSlug,
      mode,
      startedAt: new Date(started).toISOString(),
      updatedAt: nowIso(),
      phase,
      iteration,
      taskId,
      caps: {
        maxIterations,
        maxMinutes,
        maxIterationMinutes: iterCapMs / 60_000,
        maxConsecutiveFailures,
        maxTotalTokens,
      },
      tokens: runTokens,
      consecutiveFailures,
    };
    try {
      const file = loopStatePath(rootDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
    } catch (err) {
      logErr(`[loop] could not write heartbeat state: ${(err as Error).message}`);
    }
  };

  // One-time preflight before any iteration or journal file is created, so a
  // dead runner fails fast with guidance (throws CliError) instead of burning
  // the consecutive-failure budget on identical "no new commit" iterations.
  // A preflight CliError surfaces as terminal:error via the runLoop wrapper.
  if (!opts.skipPreflight) {
    heartbeat("preflight");
    await runPreflight(rootDir, runner, maxMinutes * 60_000);
  }

  // This run owns ONE journal file (.agents/journal/<date>-loop-<mode>-<hhmmss>.md);
  // every iteration appends a section to it.
  let journalFile: string | null = null;
  const journal = (title: string, fields: Record<string, string>): void => {
    journalFile = appendJournalEntry(rootDir, {
      slug: journalSlug,
      title,
      lines: Object.entries(fields).map(([key, value]) => `- ${key}: ${value.replace(/\n/g, " / ")}`),
    });
  };

  const finish = (state: LoopState, reason: string): LoopResult => {
    heartbeat(`terminal:${state}`);
    commitLoopJournal(rootDir, journalFile, state);
    logErr(`[loop] terminal state: ${state} — ${reason}`);
    return { state, reason, iterations: records, durationMs: Date.now() - started, totalTokens: runTokens };
  };

  // Plan mode: exactly ONE iteration. The initializer adds tasks through
  // `tasks add`; no task is selected or started and the verifier pass is
  // skipped. Success = pending task count strictly increased AND the chain
  // still validates. Failure terminates `blocked` WITHOUT writing BLOCKED.md
  // or marking any task blocked — there is no failing task to blame.
  if (mode === "plan") {
    const before = tryLoadTasks(rootDir);
    const pendingBefore = before === null ? 0 : statusCounts(before).pending;
    logErr(`[loop] plan iteration (runner: ${runner.name}, ${pendingBefore} pending task(s), ${maxMinutes} minute budget)`);
    heartbeat("plan", { n: 1, max: 1 });
    const iterStarted = Date.now();
    const preHead = gitHead(rootDir);

    const planTimeoutMs = Math.min(maxMinutes * 60_000, iterCapMs);
    const runRes = await runner.run({
      prompt: basePrompt + planFooter(rootDir, pendingBefore),
      cwd: rootDir,
      timeoutMs: planTimeoutMs,
      extraEnv: { AGENTIC_LOOP: "1", AGENTIC_LOOP_PHASE: "plan" },
    });

    const planTokens = tokenTotals(runRes.usage);
    runTokens = addTokens(runTokens, planTokens);
    const details: string[] = [];
    if (runRes.timedOut) details.push(timeoutDetail(planTimeoutMs, iterCapMs));
    if (runRes.exitCode !== 0) details.push(`runner exited with code ${runRes.exitCode}`);
    const after = tryLoadTasks(rootDir);
    const pendingAfter = after === null ? 0 : statusCounts(after).pending;
    const chain = after === null ? { ok: true, errors: [] } : validateChain(after);
    if (pendingAfter <= pendingBefore) {
      details.push(
        `pending task count did not increase (${pendingBefore} -> ${pendingAfter}) — a plan iteration must add tasks via \`agentic tasks add\``,
      );
    }
    if (!chain.ok) details.push(`task chain invalid: ${chain.errors.join("; ")}`);

    const postHead = gitHead(rootDir);
    const ok = details.length === 0;
    const record: IterationRecord = {
      n: 1,
      taskId: "(plan)",
      taskTitle: "plan iteration — decompose work into tasks",
      outcome: ok ? "completed" : "failed",
      verdict: "skipped",
      gatesOk: true, // gates are not part of plan-mode success criteria
      chainOk: chain.ok,
      commitMade: preHead !== null && postHead !== null && preHead !== postHead,
      durationMs: Date.now() - iterStarted,
      details,
      tokens: planTokens,
    };
    records.push(record);
    journal(`loop plan iteration — ${record.outcome}`, {
      mode: "plan",
      pendingTasks: `${pendingBefore} -> ${pendingAfter}`,
      chain: chain.ok ? "valid" : `INVALID: ${chain.errors.join("; ")}`,
      tokens: fmtTokens(planTokens),
      duration: `${record.durationMs}ms`,
      ...(details.length > 0 ? { details: details.join(" | ") } : {}),
    });
    if (ok) {
      return finish("success", `plan iteration added ${pendingAfter - pendingBefore} pending task(s) (${pendingBefore} -> ${pendingAfter}), chain valid`);
    }
    return finish("blocked", `plan iteration failed: ${details.join(" | ")}`);
  }

  for (let n = 1; ; n++) {
    const tasksFile = loadTasks(rootDir);

    // A --task target that is blocked is not "finished": tell the operator
    // how to put it back in play instead of reporting a hollow success.
    if (opts.taskId !== undefined) {
      const target = tasksFile.tasks.find((t) => t.id === opts.taskId);
      if (!target) throw new CliError(`--task ${opts.taskId}: no such task.`);
      if (target.status === "blocked") {
        return finish(
          "blocked",
          `task ${opts.taskId} is blocked — resolve the blocker, restart it with \`agentic tasks start ${opts.taskId}\`, then re-run the loop`,
        );
      }
    }

    const task = selectTask(tasksFile, opts.taskId);

    if (task === null) {
      // Nothing left to work: terminal success requires green gates + valid chain.
      const gates = await runGates(rootDir, config, { tier: "fast" });
      const chain = validateChain(loadTasks(rootDir));
      const scope = opts.taskId !== undefined ? `task ${opts.taskId} finished` : "no pending tasks";
      if (gates.ok && chain.ok) return finish("success", `${scope}, gates green, chain valid`);
      const reason = `${scope}, but ${gates.ok ? "" : `gates failed: ${summarizeReport(gates)}`}${!gates.ok && !chain.ok ? "; " : ""}${chain.ok ? "" : `chain invalid: ${chain.errors.join("; ")}`}`;
      writeBlockedMd(rootDir, null, records, gates, chain.errors, maxConsecutiveFailures, reason);
      return finish("blocked", reason);
    }

    if (n > maxIterations) {
      return finish("budget_exhausted", `iteration cap reached (${maxIterations}) with work remaining (next: ${task.id})`);
    }
    const remainingMs = maxMinutes * 60_000 - (Date.now() - started);
    if (remainingMs <= 0) {
      return finish("budget_exhausted", `wall-clock cap reached (${maxMinutes} minutes) with work remaining (next: ${task.id})`);
    }

    logErr(`[loop] iteration ${n}/${maxIterations}: ${task.id} — ${task.title} (runner: ${runner.name}, ${Math.round(remainingMs / 1000)}s budget left)`);
    heartbeat("build", { n, max: maxIterations }, task.id);
    const iterStarted = Date.now();
    const preHead = gitHead(rootDir);
    const preStatuses = snapshotStatuses(tasksFile);

    // Fresh runner process per iteration — never resume a session. The
    // timeout is the smaller of the remaining wall budget and the
    // per-iteration cap, so one hung task cannot eat the whole run.
    const buildTimeoutMs = Math.min(remainingMs, iterCapMs);
    const runRes = await runner.run({
      prompt: basePrompt + taskFooter(task),
      cwd: rootDir,
      timeoutMs: buildTimeoutMs,
      extraEnv: { AGENTIC_LOOP: "1", AGENTIC_TASK_ID: task.id, AGENTIC_LOOP_PHASE: "build" },
    });

    let iterTokens = tokenTotals(runRes.usage);

    // Independent checks — agent claims are ignored; only these count.
    const details: string[] = [];
    if (runRes.timedOut) details.push(timeoutDetail(buildTimeoutMs, iterCapMs));
    if (runRes.exitCode !== 0) details.push(`runner exited with code ${runRes.exitCode}`);

    const gates = await runGates(rootDir, config, { tier: "fast" });
    lastGates = gates;
    const after = loadTasks(rootDir);
    const chain = validateChain(after);
    const postHead = gitHead(rootDir);
    const commitMade = preHead !== null && postHead !== null && preHead !== postHead;
    const moved = movedTasks(preStatuses, after);
    const taskAfter = after.tasks.find((t) => t.id === task.id);
    const completed = taskAfter?.status === "done";

    if (!gates.ok) details.push(`gates failed: ${summarizeReport(gates)}`);
    if (!chain.ok) details.push(`task chain invalid: ${chain.errors.join("; ")}`);
    if (!commitMade) details.push("no new commit was created (one commit per task is required)");
    if (!completed) details.push(`task ${task.id} was not completed (status: ${taskAfter?.status ?? "missing"})`);
    if (moved.length !== 1 || moved[0] !== task.id) {
      details.push(`expected exactly one task to move (${task.id}); moved: ${moved.join(", ") || "none"}`);
    }

    let ok = details.length === 0;
    let verdict: IterationRecord["verdict"] = "skipped";
    let verifyEvidence: string | null = null;
    let verifyExcerpt: string | null = null;

    if (ok && verifyPrompt !== null && taskAfter !== undefined) {
      const verifyRemainingMs = Math.max(1_000, Math.min(maxMinutes * 60_000 - (Date.now() - started), iterCapMs));
      logErr(`[loop] verification pass for ${task.id} (independent fresh runner)`);
      heartbeat("verify", { n, max: maxIterations }, task.id);
      const verifyRes = await runner.run({
        prompt: verifyPrompt + verifyFooter(taskAfter),
        cwd: rootDir,
        timeoutMs: verifyRemainingMs,
        extraEnv: { AGENTIC_LOOP: "1", AGENTIC_TASK_ID: task.id, AGENTIC_LOOP_PHASE: "verify" },
      });
      iterTokens = addTokens(iterTokens, tokenTotals(verifyRes.usage));
      const match = /^VERDICT:\s*(pass|fail)/im.exec(verifyRes.finalText);
      if (match && match[1]!.toLowerCase() === "pass") {
        verdict = "pass";
      } else {
        verdict = "fail";
        ok = false;
        details.push(match ? "verifier returned VERDICT: fail" : "verifier output had no VERDICT line (treated as fail)");
      }
      verifyEvidence = writeVerifyEvidence(rootDir, task.id, n, verdict, verifyRes);
      verifyExcerpt = verifyRes.finalText.slice(0, 500);
    }

    // A completion that failed independent checks is not a completion:
    // pop the chain entry and put the task back in play.
    if (!ok && completed && chain.ok) {
      try {
        revertTask(rootDir, task.id);
        details.push(`reverted ${task.id} to pending`);
      } catch (err) {
        details.push(`could not revert ${task.id}: ${(err as Error).message}`);
      }
    }

    runTokens = addTokens(runTokens, iterTokens);
    const record: IterationRecord = {
      n,
      taskId: task.id,
      taskTitle: task.title,
      outcome: ok ? "completed" : "failed",
      verdict,
      gatesOk: gates.ok,
      chainOk: chain.ok,
      commitMade,
      durationMs: Date.now() - iterStarted,
      details,
      tokens: iterTokens,
      ...(verifyEvidence !== null ? { verifyEvidence } : {}),
    };
    records.push(record);
    journal(`loop iteration ${n} — ${task.id} ${record.outcome}`, {
      task: `${task.id} — ${task.title}`,
      outcome: record.outcome,
      gates: summarizeReport(gates),
      chain: chain.ok ? "valid" : `INVALID: ${chain.errors.join("; ")}`,
      commit: commitMade ? `yes (${postHead})` : "no",
      verification: verdict,
      ...(verifyEvidence !== null ? { verifyEvidence } : {}),
      ...(verifyExcerpt !== null && verifyExcerpt.trim() !== "" ? { verifyExcerpt } : {}),
      tokens: `${fmtTokens(iterTokens)} (run total ${runTokens.total})`,
      duration: `${record.durationMs}ms`,
      ...(details.length > 0 ? { details: details.join(" | ") } : {}),
    });
    logErr(`[loop] iteration ${n} ${record.outcome}${details.length > 0 ? ` — ${details.join(" | ")}` : ""}`);

    if (ok) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      if (consecutiveFailures >= maxConsecutiveFailures) {
        try {
          const current = loadTasks(rootDir);
          const t = current.tasks.find((x) => x.id === task.id);
          if (t && t.status !== "done" && t.status !== "blocked") blockTask(rootDir, task.id);
        } catch (err) {
          logErr(`[loop] could not mark ${task.id} blocked: ${(err as Error).message}`);
        }
        const reason = `${consecutiveFailures} consecutive failed iterations (cap: ${maxConsecutiveFailures}) on ${task.id}`;
        writeBlockedMd(rootDir, task, records, lastGates, chain.ok ? [] : chain.errors, maxConsecutiveFailures, reason);
        return finish("blocked", reason);
      }
    }
    // Third hard cap, checked after failure handling so `blocked` wins when
    // both trip: budget_exhausted is resumable, a block needs human eyes.
    // With nothing left pending the loop is allowed to finish normally —
    // the next pass reports success/blocked on its own merits.
    if (maxTotalTokens !== null && runTokens.total > maxTotalTokens) {
      const pendingLeft = statusCounts(loadTasks(rootDir)).pending;
      if (pendingLeft > 0) {
        return finish("budget_exhausted", `token cap reached (${runTokens.total} > ${maxTotalTokens} total tokens) with ${pendingLeft} task(s) remaining`);
      }
      logErr(`[loop] token cap reached (${runTokens.total} > ${maxTotalTokens}) after the final task — finishing normally.`);
    }
  }
}

function writeBlockedMd(
  rootDir: string,
  task: Task | null,
  records: IterationRecord[],
  gates: GatesReport | null,
  chainErrors: string[],
  cap: number,
  reason: string,
): void {
  const lines: string[] = [
    "# LOOP BLOCKED",
    "",
    `Written by \`agentic loop\` at ${nowIso()}. Delete this file after resolving the blocker.`,
    "",
    `**Reason:** ${reason}`,
    "",
  ];
  if (task !== null) {
    lines.push("## Failing task", "", `- id: ${task.id}`, `- title: ${task.title}`, "- acceptance criteria:", ...task.acceptance.map((a) => `  - ${a}`), "");
  }
  const failed = records.filter((r) => r.outcome === "failed");
  lines.push("## Last errors", "");
  if (failed.length === 0) lines.push("(no failed iterations recorded)");
  for (const r of failed.slice(-cap)) {
    lines.push(`- iteration ${r.n} (${r.taskId}): ${r.details.join(" | ") || "failed"}`);
  }
  lines.push("", "## Last gate report", "");
  if (gates === null) {
    lines.push("(gates were not run)");
  } else {
    for (const g of gates.results) {
      lines.push(`- ${g.name}: ${g.status}${g.exitCode !== null ? ` (exit ${g.exitCode})` : ""}${g.timedOut ? " [timeout]" : ""} — ${g.durationMs}ms`);
    }
  }
  if (chainErrors.length > 0) {
    lines.push("", "## Chain errors", "", ...chainErrors.map((e) => `- ${e}`));
  }
  lines.push("");
  fs.mkdirSync(path.dirname(blockedFilePath(rootDir)), { recursive: true });
  fs.writeFileSync(blockedFilePath(rootDir), lines.join("\n"));
}
