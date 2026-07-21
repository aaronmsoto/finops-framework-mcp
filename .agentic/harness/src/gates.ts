import fs from "node:fs";
import path from "node:path";
import type { AgenticConfig, GateTier } from "./config.js";
import { UsageError, ensureDir, logErr, nowIso, run } from "./util.js";

export type TierSelection = "fast" | "full" | "all";
export type GateStatus = "pass" | "fail" | "skipped";

export interface GateOutcome {
  name: string;
  tier: GateTier;
  status: GateStatus;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  note?: string;
}

export interface GatesReport {
  version: 1;
  generatedAt: string;
  tier: TierSelection;
  failFast: boolean;
  ok: boolean;
  results: GateOutcome[];
}

export interface RunGatesOptions {
  /**
   * Tier selection. "fast" (default) runs fast-tier gates only; "full" runs
   * full-tier gates only; "all" runs both tiers in declared order.
   */
  tier?: TierSelection;
  /** Explicit gate names: run exactly these (in declared order), ignoring tier. */
  names?: string[];
  /** Stop at the first hard failure instead of running everything. */
  failFast?: boolean;
  /** Suppress streamed gate output (per-gate summary lines still print). */
  quiet?: boolean;
}

export function gatesReportPath(rootDir: string): string {
  return path.join(rootDir, ".agents", ".cache", "gates-report.json");
}

/** Select gates by explicit names (declaration order) or by tier. */
export function selectGates(config: AgenticConfig, opts: RunGatesOptions): string[] {
  const declared = Object.keys(config.gates);
  if (opts.names && opts.names.length > 0) {
    for (const name of opts.names) {
      if (!(name in config.gates)) {
        throw new UsageError(`unknown gate "${name}" — gates declared in agentic.config.json: ${declared.join(", ") || "(none)"}`);
      }
    }
    return declared.filter((n) => opts.names!.includes(n));
  }
  const tier = opts.tier ?? "fast";
  if (tier === "all") return declared;
  return declared.filter((n) => config.gates[n]!.tier === tier);
}

/**
 * Run gates sequentially via `sh -c` from the repo root. Streams output to
 * stderr with a `[name]` prefix, enforces per-gate timeouts by killing the
 * process group, and writes .agents/.cache/gates-report.json.
 */
export async function runGates(rootDir: string, config: AgenticConfig, opts: RunGatesOptions = {}): Promise<GatesReport> {
  const names = selectGates(config, opts);
  const failFast = opts.failFast ?? false;
  const results: GateOutcome[] = [];
  let ok = true;

  // Locally-installed tools (vitest, eslint, tsc, prettier, ...) must resolve
  // without npx: prepend the project's and the harness's node_modules/.bin.
  const binDirs = [path.join(rootDir, "node_modules", ".bin"), path.join(rootDir, ".agentic", "harness", "node_modules", ".bin")];
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: [...binDirs, process.env.PATH ?? ""].join(path.delimiter),
  };

  for (const name of names) {
    const gate = config.gates[name]!;
    if (gate.command === null) {
      // Config validation guarantees command==null implies optional.
      logErr(`[gates] SKIP ${name} (optional gate has no command bound)`);
      results.push({ name, tier: gate.tier, status: "skipped", exitCode: null, durationMs: 0, timedOut: false, note: "optional gate has no command bound" });
      continue;
    }
    logErr(`[gates] RUN  ${name}: ${gate.command}`);
    const stream = opts.quiet ? undefined : (line: string) => logErr(`[${name}] ${line}`);
    const res = await run("sh", ["-c", gate.command], {
      cwd: rootDir,
      env: childEnv,
      timeoutMs: gate.timeoutSeconds * 1000,
      onStdoutLine: stream,
      onStderrLine: stream,
    });
    const pass = !res.timedOut && res.exitCode === 0;
    // An optional gate whose command is not installed (sh exit 127: command
    // not found) is a placeholder, not a failure — skip it with a notice so
    // fresh projects pass the fast tier before every tool is installed.
    if (!pass && !res.timedOut && res.exitCode === 127 && gate.optional) {
      const note = `optional gate '${name}': command not found — install the tool or remove the gate`;
      logErr(`[gates] SKIP ${name} (${note})`);
      results.push({ name, tier: gate.tier, status: "skipped", exitCode: res.exitCode, durationMs: res.durationMs, timedOut: false, note });
      continue;
    }
    const outcome: GateOutcome = {
      name,
      tier: gate.tier,
      status: pass ? "pass" : "fail",
      exitCode: res.exitCode,
      durationMs: res.durationMs,
      timedOut: res.timedOut,
    };
    if (res.timedOut) outcome.note = `timed out after ${gate.timeoutSeconds}s (process group killed)`;
    results.push(outcome);
    logErr(`[gates] ${pass ? "PASS" : "FAIL"} ${name} (${res.durationMs}ms${res.timedOut ? ", timeout" : ""})`);
    if (!pass) {
      ok = false;
      if (failFast) break;
    }
  }

  const report: GatesReport = {
    version: 1,
    generatedAt: nowIso(),
    tier: opts.names && opts.names.length > 0 ? (opts.tier ?? "all") : (opts.tier ?? "fast"),
    failFast,
    ok,
    results,
  };
  const reportPath = gatesReportPath(rootDir);
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  return report;
}

export function summarizeReport(report: GatesReport): string {
  const parts = report.results.map((r) => `${r.name}=${r.status}`);
  return `${report.ok ? "PASS" : "FAIL"} (${parts.join(", ") || "no gates selected"})`;
}
