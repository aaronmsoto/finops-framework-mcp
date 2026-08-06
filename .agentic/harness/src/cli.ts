#!/usr/bin/env node
// The `agentic` CLI. Exit codes: 0 success, 1 failure, 2 usage error.
// `--json` on any command emits machine-readable output to stdout; all
// human-facing logging goes to stderr.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkApprovals, compileApprovals } from "./approvals.js";
import {
  loadAgenticConfig,
  loadApprovals,
  type AgenticConfig,
  type AiAttributionMode,
  type BranchingMode,
} from "./config.js";
import { designCheck, designNew, designPublish } from "./designs.js";
import { gatesReportPath, runGates, summarizeReport, type TierSelection } from "./gates.js";
import { runInit, initNextSteps, LICENSE_CHOICES, type InitOptions, type LicenseChoice } from "./init.js";
import { isInteractive, promptInitOptions, ttyWizardIO } from "./wizard.js";
import { runIntegrity, resolveDefaultBase } from "./integrity.js";
import { journalTail } from "./journal.js";
import { loopStatePath, runLoop, type LoopMode } from "./loop.js";
import { lintMemory, memorySessionBanner, memorySummary } from "./memory.js";
import { ClaudeRunner } from "./runners/claude.js";
import { CopilotRunner } from "./runners/copilot.js";
import { MockRunner } from "./runners/mock.js";
import type { AgentRunner } from "./runners/types.js";
import { DEFAULT_PORT, startServer } from "./serve.js";
import {
  addTask,
  blockTask,
  commitTaskRecord,
  completeTask,
  loadTasks,
  nextTask,
  startTask,
  statusCounts,
  tryLoadTasks,
  validateChain,
} from "./tasks.js";
import { CliError, UsageError, findRepoRoot, git, installPipeErrorHandlers, logErr, logOut, readTextIfExists } from "./util.js";
import { runVerify } from "./verify.js";

// ---------------------------------------------------------------------------
// Hand-rolled argv parsing
// ---------------------------------------------------------------------------

type FlagKind = "string" | "boolean" | "list";

interface ParsedArgs {
  positionals: string[];
  strings: Record<string, string | undefined>;
  booleans: Record<string, boolean>;
  lists: Record<string, string[]>;
}

function parseArgs(args: string[], spec: Record<string, FlagKind>): ParsedArgs {
  const out: ParsedArgs = { positionals: [], strings: {}, booleans: {}, lists: {} };
  for (const [flag, kind] of Object.entries(spec)) {
    if (kind === "boolean") out.booleans[flag] = false;
    if (kind === "list") out.lists[flag] = [];
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) {
      out.positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
    const kind = spec[name];
    if (kind === undefined) throw new UsageError(`unknown flag --${name}. Run \`agentic --help\` for usage.`);
    if (kind === "boolean") {
      if (eq >= 0) throw new UsageError(`--${name} takes no value.`);
      out.booleans[name] = true;
      continue;
    }
    let value: string;
    if (eq >= 0) {
      value = arg.slice(eq + 1);
    } else {
      const next = args[++i];
      if (next === undefined) throw new UsageError(`--${name} requires a value.`);
      value = next;
    }
    if (kind === "list") out.lists[name]!.push(value);
    else out.strings[name] = value;
  }
  return out;
}

function requireString(parsed: ParsedArgs, flag: string, command: string): string {
  const v = parsed.strings[flag];
  if (v === undefined || v === "") throw new UsageError(`${command} requires --${flag}. Run \`agentic ${command} --help\`.`);
  return v;
}

function parsePositiveInt(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new UsageError(`--${flag} must be a positive integer (got "${value}").`);
  return n;
}

/** For minute-scale caps that legitimately accept fractions (e.g. 0.5 = 30s). */
function parsePositiveNumber(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new UsageError(`--${flag} must be a positive number (got "${value}").`);
  return n;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `agentic — harness for agentic software projects

Usage: agentic <command> [options]

Commands:
  init --name <n> --preset <p> --owner <@handle> [--runner claude|copilot]
       [--branching trunk|integration] [--license mit|apache-2.0|proprietary|keep]
       [--license-holder "<legal name>"] [--fresh]
        Adapt the template for a new project: apply preset gate bindings and
        preset-shipped files, set the owner and branching mode, seed the
        onboarding tasks, reset memory/journal, compile approvals. --license
        rewrites (mit/apache-2.0, holder required) or removes (proprietary)
        the root LICENSE; default keep leaves it untouched with a reminder.
        On a terminal, missing flags are prompted for interactively with
        defaults; non-interactive runs require explicit flags.
  gates [--tier fast|full|all] [--fail-fast] [name ...]
        Run named gates from agentic.config.json in declared order.
        Tier selection: --tier fast (default) runs fast-tier gates only;
        --tier full runs full-tier gates only; --tier all runs both.
        Explicit gate names run exactly those gates, ignoring tier.
        Default reports every failure; --fail-fast stops at the first.
  loop [--mode build|plan] [--runner claude|copilot|mock] [--max-iterations N]
       [--max-minutes M] [--max-iteration-minutes M] [--max-consecutive-failures N]
       [--no-verify] [--skip-preflight] [--task <id>]
        Supervised autonomous loop. Caps come from approvals.yaml; flags may
        lower them, never raise them. --max-iteration-minutes bounds a single
        runner call (fractions allowed); a fired timeout fails that iteration,
        not the run. Without --max-iterations the budget defaults to
        min(pending tasks + 2, policy cap). A one-time preflight probes that
        the runner can edit files (skip with --skip-preflight).
  tasks <list|next|add|start|complete|block|validate>
        Manage .agents/tasks.json (hash-chained).
        add --title <t> --acceptance <c> [--acceptance <c> ...] [--spec <path>]
        start <id> | block <id> | complete <id> --summary "..." [--commit]
        complete --commit additionally commits .agents/tasks.json
        ("Record <id> completion") so the chain state is never left dangling.
  verify [--task <id>]
        Deterministic verification: fast gates + chain valid + clean tree +
        evidence on every done task.
  approvals compile|check
        Regenerate (or drift-check) the enforcement surfaces from approvals.yaml.
  memory lint|show [--session-start]
        Enforce memory budgets/staleness; print the memory bank.
  serve [--port <n>] [--dir <path>]
        Private preview server for design docs and specs, bound strictly to
        127.0.0.1 (never exposed). Default dir is the repo root; default port
        ${DEFAULT_PORT}; --port 0 picks a free ephemeral port. Ctrl-C to stop.
  design <new|check|publish>
        Self-contained HTML design docs (designs.dir, default docs/designs).
        new <slug> [--title "..."]  scaffold <slug>.html from TEMPLATE.html
                                    (+ .agents/specs/<slug>.md when the spec
                                    template exists).
        check                       validate every design doc: balanced HTML,
                                    zero external resources/network JS, live
                                    relative links. Warnings exit 0.
        publish <slug-or-path>      run designs.publishCommand with
                                    DESIGN_FILE/DESIGN_SLUG in the env.
  integrity [--base <ref>] [--strict]
        Anti-gaming diff checks vs. --base (default origin/main).
  status
        One-screen summary: tasks, last gates report, journal tail, loop caps.

Global options:
  --json    Machine-readable output on stdout.
  --help    Show this help.

Exit codes: 0 success, 1 failure, 2 usage error.
`;

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

function makeRunner(name: string): AgentRunner {
  switch (name) {
    case "claude":
      return new ClaudeRunner();
    case "copilot":
      return new CopilotRunner();
    case "mock":
      return new MockRunner();
    default:
      throw new UsageError(`unknown runner "${name}" — expected claude, copilot, or mock.`);
  }
}

async function cmdGates(root: string, config: AgenticConfig, args: string[], json: boolean): Promise<number> {
  const parsed = parseArgs(args, { tier: "string", "fail-fast": "boolean" });
  const tier = parsed.strings.tier ?? "fast";
  if (tier !== "fast" && tier !== "full" && tier !== "all") {
    throw new UsageError(`--tier must be fast, full, or all (got "${tier}").`);
  }
  const report = await runGates(root, config, {
    tier: tier as TierSelection,
    names: parsed.positionals,
    failFast: parsed.booleans["fail-fast"],
  });
  if (json) logOut(JSON.stringify(report, null, 2));
  else logOut(`gates: ${summarizeReport(report)} — report at .agents/.cache/gates-report.json`);
  return report.ok ? 0 : 1;
}

async function cmdTasks(root: string, config: AgenticConfig, args: string[], json: boolean): Promise<number> {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list": {
      const file = loadTasks(root);
      if (json) logOut(JSON.stringify(file, null, 2));
      else {
        logOut(`chainHead: ${file.chainHead}`);
        for (const t of file.tasks) logOut(`  ${t.id} [${t.status}] ${t.title}`);
        if (file.tasks.length === 0) logOut("  (no tasks — add one with `agentic tasks add`)");
      }
      return 0;
    }
    case "next": {
      const task = nextTask(loadTasks(root));
      if (json) logOut(JSON.stringify(task, null, 2));
      else if (task === null) logOut("No pending tasks.");
      else logOut(`${task.id} — ${task.title}\nacceptance:\n${task.acceptance.map((a) => `  - ${a}`).join("\n")}`);
      return 0;
    }
    case "add": {
      const parsed = parseArgs(rest, { title: "string", acceptance: "list", spec: "string" });
      if (parsed.lists.acceptance!.length === 0) {
        throw new UsageError("tasks add requires at least one --acceptance criterion.");
      }
      const task = addTask(root, {
        title: requireString(parsed, "title", "tasks add"),
        acceptance: parsed.lists.acceptance!,
        ...(parsed.strings.spec !== undefined ? { spec: parsed.strings.spec } : {}),
      });
      if (json) logOut(JSON.stringify(task, null, 2));
      else logOut(`added ${task.id} — ${task.title}`);
      return 0;
    }
    case "start": {
      const id = rest[0];
      if (id === undefined) throw new UsageError("tasks start requires a task id.");
      const task = startTask(root, id);
      if (json) logOut(JSON.stringify(task, null, 2));
      else logOut(`${task.id} is now ${task.status}`);
      return 0;
    }
    case "complete": {
      const parsed = parseArgs(rest, { summary: "string", commit: "boolean" });
      const id = parsed.positionals[0];
      if (id === undefined) throw new UsageError("tasks complete requires a task id.");
      const task = await completeTask(root, config, id, requireString(parsed, "summary", "tasks complete"));
      if (parsed.booleans.commit) {
        const res = commitTaskRecord(root, task.id);
        if (res.committed) logErr(`[tasks] committed .agents/tasks.json — "Record ${task.id} completion"`);
        else logErr(`[tasks] --commit: ${res.notice}`);
      }
      if (json) logOut(JSON.stringify(task, null, 2));
      else logOut(`${task.id} completed — chain extended (${task.hash}).`);
      return 0;
    }
    case "block": {
      const parsed = parseArgs(rest, { reason: "string" });
      const id = parsed.positionals[0];
      if (id === undefined) throw new UsageError("tasks block requires a task id.");
      const task = blockTask(root, id);
      if (parsed.strings.reason !== undefined) logErr(`[tasks] ${id} blocked: ${parsed.strings.reason}`);
      if (json) logOut(JSON.stringify(task, null, 2));
      else logOut(`${task.id} is now blocked`);
      return 0;
    }
    case "validate": {
      const result = validateChain(loadTasks(root));
      if (json) logOut(JSON.stringify(result, null, 2));
      else if (result.ok) logOut("task chain valid");
      else {
        logOut("task chain INVALID:");
        for (const e of result.errors) logOut(`  - ${e}`);
      }
      return result.ok ? 0 : 1;
    }
    default:
      throw new UsageError(`tasks: unknown subcommand "${sub ?? ""}" — expected list|next|add|start|complete|block|validate.`);
  }
}

async function cmdLoop(root: string, config: AgenticConfig, args: string[], json: boolean): Promise<number> {
  const parsed = parseArgs(args, {
    mode: "string",
    runner: "string",
    "max-iterations": "string",
    "max-minutes": "string",
    "max-iteration-minutes": "string",
    "max-consecutive-failures": "string",
    "no-verify": "boolean",
    "skip-preflight": "boolean",
    task: "string",
  });
  const mode = parsed.strings.mode ?? "build";
  if (mode !== "build" && mode !== "plan") throw new UsageError(`--mode must be build or plan (got "${mode}").`);
  const runner = makeRunner(parsed.strings.runner ?? config.loop.runner);
  const policy = loadApprovals(root);
  const result = await runLoop(root, config, policy, runner, {
    mode: mode as LoopMode,
    maxIterations: parsePositiveInt(parsed.strings["max-iterations"], "max-iterations"),
    maxMinutes: parsePositiveInt(parsed.strings["max-minutes"], "max-minutes"),
    maxIterationMinutes: parsePositiveNumber(parsed.strings["max-iteration-minutes"], "max-iteration-minutes"),
    maxConsecutiveFailures: parsePositiveInt(parsed.strings["max-consecutive-failures"], "max-consecutive-failures"),
    noVerify: parsed.booleans["no-verify"],
    skipPreflight: parsed.booleans["skip-preflight"],
    taskId: parsed.strings.task,
  });
  if (json) logOut(JSON.stringify(result, null, 2));
  else {
    const tokens = result.totalTokens.total > 0 ? `, ${result.totalTokens.total} tokens` : "";
    logOut(`loop: ${result.state} — ${result.reason} (${result.iterations.length} iteration(s), ${Math.round(result.durationMs / 1000)}s${tokens})`);
  }
  return result.state === "success" ? 0 : 1;
}

async function cmdVerify(root: string, config: AgenticConfig, args: string[], json: boolean): Promise<number> {
  const parsed = parseArgs(args, { task: "string" });
  const result = await runVerify(root, config, { taskId: parsed.strings.task });
  if (json) logOut(JSON.stringify(result, null, 2));
  else {
    for (const c of result.checks) logOut(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
    logOut(result.ok ? "verify: all checks passed" : "verify: FAILED");
  }
  return result.ok ? 0 : 1;
}

function cmdApprovals(root: string, args: string[], json: boolean): number {
  const sub = args[0];
  const policy = loadApprovals(root);
  if (sub === "compile") {
    const written = compileApprovals(root, policy);
    if (json) logOut(JSON.stringify({ written }, null, 2));
    else logOut(`approvals compiled:\n${written.map((w) => `  ${w}`).join("\n")}`);
    return 0;
  }
  if (sub === "check") {
    const report = checkApprovals(root, policy);
    if (json) logOut(JSON.stringify(report, null, 2));
    else if (report.ok) logOut("approvals: no drift — generated surfaces match approvals.yaml");
    else {
      logOut("approvals: DRIFT detected — run `agentic approvals compile` and commit the result:");
      for (const d of report.drifted) logOut(`  ${d.path} (${d.reason})`);
    }
    return report.ok ? 0 : 1;
  }
  throw new UsageError(`approvals: unknown subcommand "${sub ?? ""}" — expected compile or check.`);
}

function cmdMemory(root: string, config: AgenticConfig, args: string[], json: boolean): number {
  const sub = args[0];
  if (sub === "lint") {
    const result = lintMemory(root, config);
    if (json) logOut(JSON.stringify(result, null, 2));
    else {
      for (const w of result.warnings) logOut(`WARN ${w}`);
      for (const f of result.failures) logOut(`FAIL ${f}`);
      logOut(result.failures.length === 0 ? `memory lint: ok (${result.warnings.length} warning(s))` : "memory lint: FAILED");
    }
    return result.failures.length === 0 ? 0 : 1;
  }
  if (sub === "show") {
    const parsed = parseArgs(args.slice(1), { "session-start": "boolean" });
    logOut(parsed.booleans["session-start"] ? memorySessionBanner(root, config) : memorySummary(root, config));
    return 0;
  }
  throw new UsageError(`memory: unknown subcommand "${sub ?? ""}" — expected lint or show.`);
}

function cmdIntegrity(root: string, config: AgenticConfig, args: string[], json: boolean): number {
  const parsed = parseArgs(args, { base: "string", strict: "boolean" });
  // Default base is derived from branching policy (integration branch in
  // integration mode, else default_branch), not the constant origin/main.
  let base = parsed.strings.base;
  // Owner policy: whether AI-attribution markers are allowed in commit
  // messages. Unreadable approvals.yaml falls back to the strict default.
  let aiAttribution: AiAttributionMode = "forbid";
  try {
    const policy = loadApprovals(root);
    if (base === undefined) base = resolveDefaultBase(root, policy.branching);
    aiAttribution = policy.ai_attribution;
  } catch {
    // approvals.yaml missing/invalid: fall through to runIntegrity's defaults.
  }
  const result = runIntegrity(root, config, { base, aiAttribution });
  const strict = parsed.booleans.strict;
  const failures = strict ? [...result.failures, ...result.warnings] : result.failures;
  const warnings = strict ? [] : result.warnings;
  if (json) {
    logOut(JSON.stringify({ status: result.status, base: result.base, strict, failures, warnings, notice: result.notice ?? null }, null, 2));
  } else {
    if (result.notice !== undefined) logOut(result.notice);
    for (const w of warnings) logOut(`WARN ${w}`);
    for (const f of failures) logOut(`FAIL ${f}`);
    if (result.status === "checked") {
      logOut(failures.length === 0 ? `integrity: ok vs ${result.base} (${warnings.length} warning(s))` : `integrity: FAILED vs ${result.base}`);
    }
  }
  return failures.length === 0 ? 0 : 1;
}

/** Human-readable loop line from the heartbeat state file, or null when none exists. */
export function describeLoopState(root: string): { line: string; state: Record<string, unknown> } | null {
  const text = readTextIfExists(loopStatePath(root));
  if (text === null) return null;
  let state: Record<string, unknown>;
  try {
    state = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { line: "loop: state file unreadable (malformed JSON)", state: {} };
  }
  const phase = typeof state.phase === "string" ? state.phase : "?";
  const updatedAt = typeof state.updatedAt === "string" ? state.updatedAt : null;
  const pid = typeof state.pid === "number" ? state.pid : null;
  const iter = state.iteration as { n?: number; max?: number } | null;
  const taskId = typeof state.taskId === "string" ? state.taskId : null;
  const ageSec = updatedAt !== null ? Math.max(0, Math.round((Date.now() - Date.parse(updatedAt)) / 1000)) : null;
  const age = ageSec !== null ? `${ageSec}s ago` : "unknown age";
  if (phase.startsWith("terminal:")) {
    return { line: `loop: last run ${phase.slice("terminal:".length)} at ${updatedAt ?? "?"}`, state };
  }
  let alive = false;
  if (pid !== null) {
    try {
      process.kill(pid, 0);
      alive = true;
    } catch (err) {
      alive = (err as NodeJS.ErrnoException).code === "EPERM"; // exists, not ours
    }
  }
  const where = `${iter && typeof iter.n === "number" ? `iteration ${iter.n}/${iter.max ?? "?"}` : "starting"}${taskId !== null ? ` on ${taskId}` : ""} (${phase}, ${age})`;
  if (alive) return { line: `loop: RUNNING ${where}`, state };
  return { line: `loop: STALE — pid ${pid ?? "?"} not alive; last seen ${where} (crashed or killed)`, state };
}

function cmdStatus(root: string, config: AgenticConfig, json: boolean): number {
  const tasksFile = tryLoadTasks(root);
  const counts = tasksFile ? statusCounts(tasksFile) : null;
  const reportText = readTextIfExists(gatesReportPath(root));
  let gates: unknown = null;
  try {
    gates = reportText !== null ? JSON.parse(reportText) : null;
  } catch {
    gates = null;
  }
  let caps: unknown = null;
  let integrityBase: { ref: string; resolves: boolean } | null = null;
  try {
    const policy = loadApprovals(root);
    caps = policy.loop;
    const ref = resolveDefaultBase(root, policy.branching);
    integrityBase = { ref, resolves: git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).ok };
  } catch {
    caps = null;
  }
  const tail = journalTail(root, 1);
  const loopState = describeLoopState(root);
  if (json) {
    logOut(
      JSON.stringify(
        { project: config.project.name, tasks: counts, lastGatesReport: gates, loopCaps: caps, integrityBase, loopState: loopState?.state ?? null, lastJournalEntry: tail[0] ?? null },
        null,
        2,
      ),
    );
    return 0;
  }
  logOut(`project: ${config.project.name} (preset: ${config.preset})`);
  if (loopState !== null) logOut(loopState.line);
  logOut(counts ? `tasks: ${counts.pending} pending, ${counts.in_progress} in progress, ${counts.done} done, ${counts.blocked} blocked` : "tasks: no .agents/tasks.json yet");
  if (gates !== null && typeof gates === "object") {
    const g = gates as { generatedAt?: string; ok?: boolean; results?: Array<{ name: string; status: string }> };
    logOut(`last gates report (${g.generatedAt ?? "?"}): ${g.ok ? "PASS" : "FAIL"} — ${(g.results ?? []).map((r) => `${r.name}=${r.status}`).join(", ")}`);
  } else {
    logOut("last gates report: none (run `agentic gates`)");
  }
  if (caps !== null && typeof caps === "object") {
    const c = caps as Record<string, number>;
    logOut(`loop caps: ${c.max_iterations} iterations, ${c.max_wall_minutes} wall minutes, ${c.max_consecutive_failures} consecutive failures`);
  } else {
    logOut("loop caps: approvals.yaml missing or invalid");
  }
  if (integrityBase !== null) {
    logOut(
      integrityBase.resolves
        ? `integrity base: ${integrityBase.ref}`
        : `integrity base: ${integrityBase.ref} — UNRESOLVABLE, anti-gaming diff will skip locally (fetch it or set branching.default_branch)`,
    );
  }
  logOut(tail.length > 0 ? `journal tail:\n${tail[0]!.split("\n").map((l) => `  ${l}`).join("\n")}` : "journal: empty");
  if (fs.existsSync(path.join(root, ".agents", "BLOCKED.md"))) {
    logOut("NOTE: .agents/BLOCKED.md exists — the last loop run ended blocked.");
  }
  return 0;
}

async function cmdInit(root: string, args: string[]): Promise<number> {
  const parsed = parseArgs(args, {
    name: "string",
    preset: "string",
    owner: "string",
    runner: "string",
    branching: "string",
    fresh: "boolean",
    license: "string",
    "license-holder": "string",
  });
  const runner = parsed.strings.runner;
  if (runner !== undefined && runner !== "claude" && runner !== "copilot") {
    throw new UsageError(`--runner must be claude or copilot (got "${runner}").`);
  }
  const branchingRaw = parsed.strings.branching;
  if (branchingRaw !== undefined && branchingRaw !== "trunk" && branchingRaw !== "integration") {
    throw new UsageError(`--branching must be trunk or integration (got "${branchingRaw}").`);
  }
  const branching = branchingRaw as BranchingMode | undefined;
  const licenseRaw = parsed.strings.license;
  if (licenseRaw !== undefined && !(LICENSE_CHOICES as readonly string[]).includes(licenseRaw)) {
    throw new UsageError(`--license must be one of ${LICENSE_CHOICES.join(", ")} (got "${licenseRaw}").`);
  }
  const license = licenseRaw as LicenseChoice | undefined;
  const licenseHolder = parsed.strings["license-holder"];
  const partial = {
    ...(parsed.strings.name !== undefined ? { name: parsed.strings.name } : {}),
    ...(parsed.strings.preset !== undefined ? { preset: parsed.strings.preset } : {}),
    ...(parsed.strings.owner !== undefined ? { owner: parsed.strings.owner } : {}),
    ...(runner !== undefined ? { runner } : {}),
    ...(branching !== undefined ? { branching } : {}),
    ...(license !== undefined ? { license } : {}),
    ...(licenseHolder !== undefined ? { licenseHolder } : {}),
    fresh: parsed.booleans.fresh,
  };
  const missingRequired = parsed.strings.name === undefined || parsed.strings.preset === undefined || parsed.strings.owner === undefined;
  const missingHolder = (license === "mit" || license === "apache-2.0") && (licenseHolder === undefined || licenseHolder.trim() === "");
  let opts: InitOptions;
  if ((missingRequired || missingHolder) && isInteractive()) {
    // A human without full flags gets the wizard; agents/CI (non-TTY) never do.
    opts = await promptInitOptions(root, partial, ttyWizardIO());
  } else {
    if (missingHolder) throw new UsageError(`--license ${license} requires --license-holder "<legal name>".`);
    opts = {
      ...partial,
      name: requireString(parsed, "name", "init"),
      preset: requireString(parsed, "preset", "init"),
      owner: requireString(parsed, "owner", "init"),
    };
  }
  const result = await runInit(root, opts);
  logOut(initNextSteps(opts, result.setup));
  return 0;
}

async function cmdServe(root: string, args: string[]): Promise<number> {
  const parsed = parseArgs(args, { port: "string", dir: "string" });
  let port = DEFAULT_PORT;
  if (parsed.strings.port !== undefined) {
    const n = Number(parsed.strings.port);
    if (!Number.isInteger(n) || n < 0 || n > 65535) {
      throw new UsageError(`--port must be an integer between 0 and 65535 (got "${parsed.strings.port}").`);
    }
    port = n;
  }
  const dir = parsed.strings.dir === undefined ? root : path.resolve(root, parsed.strings.dir);
  const handle = await startServer(dir, port);
  logErr(`serving ${dir} at ${handle.url}`);
  process.on("SIGINT", () => {
    handle.server.close();
    process.exit(0);
  });
  // Runs until killed; resolves only if the server closes on its own.
  await new Promise<void>((resolve) => handle.server.once("close", resolve));
  return 0;
}

async function cmdDesign(root: string, config: AgenticConfig, args: string[], json: boolean): Promise<number> {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "new": {
      const parsed = parseArgs(rest, { title: "string" });
      const slug = parsed.positionals[0];
      if (slug === undefined) throw new UsageError("design new requires a slug (lowercase letters, digits, hyphens).");
      const result = designNew(root, config, slug, parsed.strings.title);
      if (json) logOut(JSON.stringify(result, null, 2));
      else {
        logOut(`created ${result.design}`);
        if (result.spec !== null) logOut(`created ${result.spec}`);
        logOut(
          [
            "Next steps:",
            `  1. Fill in the design: ${result.design}`,
            "  2. Validate it: agentic design check",
            `  3. View it: agentic serve  ->  http://127.0.0.1:${DEFAULT_PORT}/${result.design}`,
          ].join("\n"),
        );
      }
      return 0;
    }
    case "check": {
      const result = designCheck(root, config);
      if (json) {
        logOut(JSON.stringify({ files: result.files, failures: result.failures, warnings: result.warnings, notice: result.notice ?? null }, null, 2));
      } else {
        if (result.notice !== undefined) logOut(result.notice);
        for (const w of result.warnings) logOut(`WARN ${w}`);
        for (const f of result.failures) logOut(`FAIL ${f}`);
        logOut(
          result.failures.length === 0
            ? `design check: ok (${result.files.length} file(s), ${result.warnings.length} warning(s))`
            : "design check: FAILED",
        );
      }
      return result.failures.length === 0 ? 0 : 1;
    }
    case "publish": {
      const parsed = parseArgs(rest, {});
      const target = parsed.positionals[0];
      if (target === undefined) throw new UsageError("design publish requires a slug or a path to a design file.");
      return designPublish(root, config, target);
    }
    default:
      throw new UsageError(`design: unknown subcommand "${sub ?? ""}" — expected new|check|publish.`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  let json = false;
  for (let i = args.length - 1; i >= 0; i--) {
    if (args[i] === "--json") {
      json = true;
      args.splice(i, 1);
    } else if (args[i] === "--help" || args[i] === "-h") {
      logOut(HELP);
      return 0;
    }
  }
  const command = args.shift();
  if (command === undefined) {
    logErr(HELP);
    return 2;
  }

  const root = findRepoRoot(process.cwd());

  switch (command) {
    case "init":
      return cmdInit(root, args);
    case "gates":
      return cmdGates(root, loadAgenticConfig(root), args, json);
    case "loop":
      return cmdLoop(root, loadAgenticConfig(root), args, json);
    case "tasks":
      return cmdTasks(root, loadAgenticConfig(root), args, json);
    case "verify":
      return cmdVerify(root, loadAgenticConfig(root), args, json);
    case "approvals":
      return cmdApprovals(root, args, json);
    case "memory":
      return cmdMemory(root, loadAgenticConfig(root), args, json);
    case "serve":
      return cmdServe(root, args);
    case "design":
      return cmdDesign(root, loadAgenticConfig(root), args, json);
    case "integrity":
      return cmdIntegrity(root, loadAgenticConfig(root), args, json);
    case "status":
      return cmdStatus(root, loadAgenticConfig(root), json);
    default:
      throw new UsageError(`unknown command "${command}". Run \`agentic --help\` for usage.`);
  }
}

/**
 * Entry guard: run main only when this module IS the invoked script. Both
 * sides are realpath'd so symlinked invocation paths (e.g. a symlinked dist/)
 * still compare equal — Node resolves the module URL through symlinks while
 * argv[1] keeps the logical path. If realpath resolution throws, fail OPEN
 * (run main): a CLI entry point that silently no-ops with exit 0 is worse
 * than a redundant run.
 */
function isDirectRun(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return true;
  }
}
if (isDirectRun()) {
  installPipeErrorHandlers();
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      if (err instanceof CliError) {
        logErr(`agentic: ${err.message}`);
        process.exitCode = err.exitCode;
      } else {
        logErr(`agentic: unexpected error — ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
        process.exitCode = 1;
      }
    });
}
