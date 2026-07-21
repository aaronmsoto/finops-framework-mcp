import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { CliError } from "./util.js";

// ---------------------------------------------------------------------------
// agentic.config.json (mechanics)
// ---------------------------------------------------------------------------

export type GateTier = "fast" | "full";

export interface GateDef {
  /** Shell command run via `sh -c` from the repo root. Null only when optional. */
  command: string | null;
  tier: GateTier;
  optional: boolean;
  timeoutSeconds: number;
}

export interface AgenticConfig {
  preset: string;
  project: { name: string; srcDirs: string[]; testGlobs: string[] };
  /** Ordered: iteration order is declaration order in the JSON file. */
  gates: Record<string, GateDef>;
  loop: { runner: string };
  memory: { dir: string; coreBudgetLines: number; staleDays: number };
  designs: { dir: string; publishCommand?: string };
}

export const DEFAULT_DESIGNS_DIR = "docs/designs";

export const DEFAULT_GATE_TIMEOUT_SECONDS = 600;

function fail(file: string, pathExpr: string, problem: string): never {
  throw new CliError(`${file}: ${pathExpr} ${problem}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function expectString(file: string, pathExpr: string, v: unknown, opts?: { nonEmpty?: boolean }): string {
  if (typeof v !== "string") fail(file, pathExpr, `must be a string (got ${describe(v)})`);
  if (opts?.nonEmpty && v.trim() === "") fail(file, pathExpr, "must be a non-empty string");
  return v;
}

function expectStringArray(file: string, pathExpr: string, v: unknown): string[] {
  if (!Array.isArray(v)) fail(file, pathExpr, `must be an array of strings (got ${describe(v)})`);
  return v.map((item, i) => expectString(file, `${pathExpr}[${i}]`, item));
}

function expectPositiveNumber(file: string, pathExpr: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    fail(file, pathExpr, `must be a positive number (got ${describe(v)})`);
  }
  return v;
}

function describe(v: unknown): string {
  if (v === undefined) return "missing";
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  if (typeof v === "object") return "an object";
  return JSON.stringify(v);
}

export function agenticConfigPath(rootDir: string): string {
  return path.join(rootDir, "agentic.config.json");
}

export function loadAgenticConfig(rootDir: string): AgenticConfig {
  const file = agenticConfigPath(rootDir);
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw new CliError(`agentic.config.json not found at ${file} — is this an agentic repo root?`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new CliError(`agentic.config.json: invalid JSON — ${(err as Error).message}`);
  }
  return validateAgenticConfig(raw);
}

export function validateAgenticConfig(raw: unknown): AgenticConfig {
  const F = "agentic.config.json";
  if (!isRecord(raw)) fail(F, "top level", `must be an object (got ${describe(raw)})`);

  const preset = raw.preset === undefined ? "custom" : expectString(F, "preset", raw.preset, { nonEmpty: true });

  if (!isRecord(raw.project)) fail(F, "project", `must be an object with at least "name" (got ${describe(raw.project)})`);
  const name = expectString(F, "project.name", raw.project.name, { nonEmpty: true });
  const srcDirs = raw.project.srcDirs === undefined ? [] : expectStringArray(F, "project.srcDirs", raw.project.srcDirs);
  const testGlobs =
    raw.project.testGlobs === undefined ? [] : expectStringArray(F, "project.testGlobs", raw.project.testGlobs);

  if (!isRecord(raw.gates)) fail(F, "gates", `must be an object mapping gate name -> gate definition (got ${describe(raw.gates)})`);
  const gates: Record<string, GateDef> = {};
  for (const [gateName, def] of Object.entries(raw.gates)) {
    const p = `gates.${gateName}`;
    if (!isRecord(def)) fail(F, p, `must be an object (got ${describe(def)})`);
    const optional = def.optional === undefined ? false : def.optional;
    if (typeof optional !== "boolean") fail(F, `${p}.optional`, `must be a boolean (got ${describe(def.optional)})`);
    let command: string | null = null;
    if (def.command !== undefined && def.command !== null) {
      command = expectString(F, `${p}.command`, def.command, { nonEmpty: true });
    } else if (!optional) {
      fail(F, `${p}.command`, 'is required (only gates marked "optional": true may omit it)');
    }
    const tier = def.tier;
    if (tier !== "fast" && tier !== "full") {
      fail(F, `${p}.tier`, `must be "fast" or "full" (got ${describe(tier)})`);
    }
    const timeoutSeconds =
      def.timeoutSeconds === undefined
        ? DEFAULT_GATE_TIMEOUT_SECONDS
        : expectPositiveNumber(F, `${p}.timeoutSeconds`, def.timeoutSeconds);
    gates[gateName] = { command, tier, optional, timeoutSeconds };
  }

  let runner = "claude";
  if (raw.loop !== undefined) {
    if (!isRecord(raw.loop)) fail(F, "loop", `must be an object (got ${describe(raw.loop)})`);
    if (raw.loop.runner !== undefined) runner = expectString(F, "loop.runner", raw.loop.runner, { nonEmpty: true });
  }

  let memory = { dir: ".agents/memory", coreBudgetLines: 200, staleDays: 45 };
  if (raw.memory !== undefined) {
    if (!isRecord(raw.memory)) fail(F, "memory", `must be an object (got ${describe(raw.memory)})`);
    memory = {
      dir: raw.memory.dir === undefined ? memory.dir : expectString(F, "memory.dir", raw.memory.dir, { nonEmpty: true }),
      coreBudgetLines:
        raw.memory.coreBudgetLines === undefined
          ? memory.coreBudgetLines
          : expectPositiveNumber(F, "memory.coreBudgetLines", raw.memory.coreBudgetLines),
      staleDays:
        raw.memory.staleDays === undefined
          ? memory.staleDays
          : expectPositiveNumber(F, "memory.staleDays", raw.memory.staleDays),
    };
  }

  const designs: AgenticConfig["designs"] = { dir: DEFAULT_DESIGNS_DIR };
  if (raw.designs !== undefined) {
    if (!isRecord(raw.designs)) fail(F, "designs", `must be an object (got ${describe(raw.designs)})`);
    if (raw.designs.dir !== undefined) {
      designs.dir = expectString(F, "designs.dir", raw.designs.dir, { nonEmpty: true });
    }
    if (raw.designs.publishCommand !== undefined) {
      designs.publishCommand = expectString(F, "designs.publishCommand", raw.designs.publishCommand, { nonEmpty: true });
    }
  }

  return { preset, project: { name, srcDirs, testGlobs }, gates, loop: { runner }, memory, designs };
}

// ---------------------------------------------------------------------------
// approvals.yaml (owner policy)
// ---------------------------------------------------------------------------

export type ApprovalMode = "human" | "auto";
export type ForcePushMode = "never" | "human";
export type BranchingMode = "trunk" | "integration";

export interface LoopCaps {
  max_iterations: number;
  max_wall_minutes: number;
  max_consecutive_failures: number;
}

export type MergeMethod = "merge" | "squash" | "rebase";

export interface BranchingPolicy {
  /** trunk: PRs target main directly. integration: green PRs auto-merge into an integration branch; humans gate only main. */
  mode: BranchingMode;
  /** The repository's default/protected branch (the one the main-branch ruleset and human-merge gate protect). */
  default_branch: string;
  integration_branch: string;
  task_branch_prefix: string;
  /** Ruleset-enforced merge method for PRs INTO the integration branch (squash keeps dev linear, one commit per task). */
  integration_merge_method: MergeMethod;
  /** Ruleset-enforced merge method for the release PR into main (merge preserves dev history + a release point). */
  release_merge_method: MergeMethod;
}

export interface ApprovalsPolicy {
  version: 1;
  owner: string;
  approvals: {
    merge_to_main: ApprovalMode;
    deploy_production: ApprovalMode;
    release: ApprovalMode;
    force_push: ForcePushMode;
  };
  protected_paths: string[];
  commands: { ask: string[]; deny: string[] };
  loop: LoopCaps;
  branching: BranchingPolicy;
}

export const DEFAULT_LOOP_CAPS: LoopCaps = {
  max_iterations: 10,
  max_wall_minutes: 120,
  max_consecutive_failures: 3,
};

export const DEFAULT_BRANCHING: BranchingPolicy = {
  mode: "trunk",
  default_branch: "main",
  integration_branch: "dev",
  task_branch_prefix: "task/",
  integration_merge_method: "squash",
  release_merge_method: "merge",
};

const MERGE_METHODS: readonly string[] = ["merge", "squash", "rebase"];

export function approvalsPath(rootDir: string): string {
  return path.join(rootDir, "approvals.yaml");
}

export function loadApprovals(rootDir: string): ApprovalsPolicy {
  const file = approvalsPath(rootDir);
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw new CliError(
      `approvals.yaml not found at ${file} — create it (see .agentic/docs/architecture.md "approvals.yaml") or run \`agentic init\`.`,
    );
  }
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    throw new CliError(`approvals.yaml: invalid YAML — ${(err as Error).message}`);
  }
  return validateApprovals(raw);
}

export function validateApprovals(raw: unknown): ApprovalsPolicy {
  const F = "approvals.yaml";
  if (!isRecord(raw)) fail(F, "top level", `must be a mapping (got ${describe(raw)})`);

  if (raw.version !== 1) fail(F, "version", `must be 1 (got ${describe(raw.version)})`);
  const owner = expectString(F, "owner", raw.owner, { nonEmpty: true });

  const approvals = {
    merge_to_main: "human" as ApprovalMode,
    deploy_production: "human" as ApprovalMode,
    release: "human" as ApprovalMode,
    force_push: "never" as ForcePushMode,
  };
  if (raw.approvals !== undefined) {
    if (!isRecord(raw.approvals)) fail(F, "approvals", `must be a mapping (got ${describe(raw.approvals)})`);
    for (const key of ["merge_to_main", "deploy_production", "release"] as const) {
      const v = raw.approvals[key];
      if (v !== undefined) {
        if (v !== "human" && v !== "auto") fail(F, `approvals.${key}`, `must be "human" or "auto" (got ${describe(v)})`);
        approvals[key] = v;
      }
    }
    const fp = raw.approvals.force_push;
    if (fp !== undefined) {
      if (fp !== "never" && fp !== "human") fail(F, "approvals.force_push", `must be "never" or "human" (got ${describe(fp)})`);
      approvals.force_push = fp;
    }
  }

  const protected_paths =
    raw.protected_paths === undefined ? [] : expectStringArray(F, "protected_paths", raw.protected_paths);

  const commands = { ask: [] as string[], deny: [] as string[] };
  if (raw.commands !== undefined) {
    if (!isRecord(raw.commands)) fail(F, "commands", `must be a mapping (got ${describe(raw.commands)})`);
    if (raw.commands.ask !== undefined) commands.ask = expectStringArray(F, "commands.ask", raw.commands.ask);
    if (raw.commands.deny !== undefined) commands.deny = expectStringArray(F, "commands.deny", raw.commands.deny);
  }

  const loop: LoopCaps = { ...DEFAULT_LOOP_CAPS };
  if (raw.loop !== undefined) {
    if (!isRecord(raw.loop)) fail(F, "loop", `must be a mapping (got ${describe(raw.loop)})`);
    for (const key of ["max_iterations", "max_wall_minutes", "max_consecutive_failures"] as const) {
      const v = raw.loop[key];
      if (v !== undefined) {
        if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) {
          fail(F, `loop.${key}`, `must be a positive integer (got ${describe(v)})`);
        }
        loop[key] = v;
      }
    }
  }

  const branching: BranchingPolicy = { ...DEFAULT_BRANCHING };
  if (raw.branching !== undefined) {
    if (!isRecord(raw.branching)) fail(F, "branching", `must be a mapping (got ${describe(raw.branching)})`);
    const mode = raw.branching.mode;
    if (mode !== undefined) {
      if (mode !== "trunk" && mode !== "integration") {
        fail(F, "branching.mode", `must be "trunk" or "integration" (got ${describe(mode)})`);
      }
      branching.mode = mode;
    }
    if (raw.branching.default_branch !== undefined) {
      branching.default_branch = expectString(F, "branching.default_branch", raw.branching.default_branch, {
        nonEmpty: true,
      });
    }
    if (raw.branching.integration_branch !== undefined) {
      branching.integration_branch = expectString(F, "branching.integration_branch", raw.branching.integration_branch, {
        nonEmpty: true,
      });
    }
    for (const key of ["integration_merge_method", "release_merge_method"] as const) {
      const v = raw.branching[key];
      if (v !== undefined) {
        if (typeof v !== "string" || !MERGE_METHODS.includes(v)) {
          throw new CliError(`${F}: branching.${key} must be one of ${MERGE_METHODS.join("/")} (got ${JSON.stringify(v)}).`);
        }
        branching[key] = v as MergeMethod;
      }
    }
    if (raw.branching.task_branch_prefix !== undefined) {
      branching.task_branch_prefix = expectString(F, "branching.task_branch_prefix", raw.branching.task_branch_prefix, {
        nonEmpty: true,
      });
    }
  }

  return { version: 1, owner, approvals, protected_paths, commands, loop, branching };
}
