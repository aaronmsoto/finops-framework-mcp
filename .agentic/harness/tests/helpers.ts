// Hermetic test helpers: every test operates on a throwaway directory under
// os.tmpdir(), never on the real repository.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CLI_PATH = path.join(HARNESS_ROOT, "dist", "cli.js");

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentic-harness-test-"));
}

export function rmDir(dir: string): void {
  // Retry + tolerate residue: a commit inside the temp repo can leave a
  // short-lived git child touching .git/objects during teardown (seen as
  // ENOTEMPTY on CI); the dir lives under os.tmpdir() so leftovers are safe.
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // best-effort cleanup only
  }
}

/**
 * process.env with every AGENTIC_* variable removed. Host-exported harness
 * controls (AGENTIC_SKIP_GATES, AGENTIC_MOCK_SCRIPT, AGENTIC_CLAUDE_ARGS,
 * AGENTIC_COPILOT_ARGS, AGENTIC_LOOP, ...) must never leak into hermetic
 * test subprocesses — tests pass their own overrides explicitly.
 */
export function hermeticEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("AGENTIC_")) env[key] = value;
  }
  return env;
}

export function sh(cwd: string, command: string, args: string[], env?: Record<string, string>): { status: number | null; stdout: string; stderr: string } {
  const res = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...hermeticEnv(), ...env },
  });
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

export function gitInTemp(dir: string, args: string[], env?: Record<string, string>): { status: number | null; stdout: string; stderr: string } {
  return sh(dir, "git", args, env);
}

export function initGitRepo(dir: string): void {
  // Mirror the real repo's .gitignore: gate reports are scratch, not state.
  fs.writeFileSync(path.join(dir, ".gitignore"), ".agents/.cache/\n");
  for (const args of [
    ["init", "-q", "-b", "main"],
    ["config", "user.email", "test@example.com"],
    ["config", "user.name", "Harness Test"],
    ["config", "commit.gpgsign", "false"],
    // No detached background gc/maintenance in throwaway repos: it races
    // teardown's rmSync (ENOTEMPTY on .git/objects — flaked on CI).
    ["config", "gc.auto", "0"],
    ["config", "gc.autodetach", "false"],
    ["config", "maintenance.auto", "false"],
  ]) {
    const res = gitInTemp(dir, args);
    if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
  }
}

export function commitAll(dir: string, message: string, env?: Record<string, string>): void {
  let res = gitInTemp(dir, ["add", "-A"], env);
  if (res.status !== 0) throw new Error(`git add failed: ${res.stderr}`);
  res = gitInTemp(dir, ["commit", "-q", "--allow-empty", "-m", message], env);
  if (res.status !== 0) throw new Error(`git commit failed: ${res.stderr}`);
}

export interface TempConfigOverrides {
  gates?: Record<string, unknown>;
  project?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  loop?: Record<string, unknown>;
  designs?: Record<string, unknown>;
  preset?: string;
}

export function writeConfig(dir: string, overrides: TempConfigOverrides = {}): void {
  const config = {
    preset: overrides.preset ?? "self",
    project: overrides.project ?? { name: "temp-project", srcDirs: ["src"], testGlobs: ["tests/**"] },
    gates: overrides.gates ?? { noop: { command: "true", tier: "fast" } },
    loop: overrides.loop ?? { runner: "mock" },
    memory: overrides.memory ?? { dir: ".agents/memory", coreBudgetLines: 200, staleDays: 45 },
    // designs stays absent by default: existing suites double as coverage for
    // the section being optional.
    ...(overrides.designs !== undefined ? { designs: overrides.designs } : {}),
  };
  fs.writeFileSync(path.join(dir, "agentic.config.json"), JSON.stringify(config, null, 2) + "\n");
}

export function writeApprovals(
  dir: string,
  opts: {
    maxIterations?: number;
    maxWallMinutes?: number;
    maxConsecutiveFailures?: number;
    /** Emitted only when provided, so key-absence stays covered by every other suite. */
    maxTotalTokens?: number;
    maxIterationMinutes?: number;
  } = {},
): void {
  const text = [
    "version: 1",
    'owner: "@tester"',
    "approvals:",
    "  merge_to_main: human",
    "  deploy_production: human",
    "  release: human",
    "  force_push: never",
    "protected_paths:",
    '  - "tests/**"',
    "commands:",
    "  ask:",
    '    - "Bash(gh pr merge*)"',
    "  deny:",
    '    - "Bash(git push --force*)"',
    "loop:",
    `  max_iterations: ${opts.maxIterations ?? 10}`,
    `  max_wall_minutes: ${opts.maxWallMinutes ?? 10}`,
    `  max_consecutive_failures: ${opts.maxConsecutiveFailures ?? 3}`,
    ...(opts.maxTotalTokens !== undefined ? [`  max_total_tokens: ${opts.maxTotalTokens}`] : []),
    ...(opts.maxIterationMinutes !== undefined ? [`  max_iteration_minutes: ${opts.maxIterationMinutes}`] : []),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(dir, "approvals.yaml"), text);
}

export function writePrompts(dir: string): void {
  const promptsDir = path.join(dir, ".agents", "prompts");
  fs.mkdirSync(promptsDir, { recursive: true });
  fs.writeFileSync(path.join(promptsDir, "build.md"), "# build preamble\nDo one task.\n");
  fs.writeFileSync(path.join(promptsDir, "plan.md"), "# plan preamble\nPlan one task.\n");
  fs.writeFileSync(path.join(promptsDir, "verify.md"), "# verify preamble\nVerify the task.\n");
}

export function writeFileIn(dir: string, relPath: string, content: string): void {
  const abs = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

export function readFileIn(dir: string, relPath: string): string {
  return fs.readFileSync(path.join(dir, relPath), "utf8");
}

export function existsIn(dir: string, relPath: string): boolean {
  return fs.existsSync(path.join(dir, relPath));
}

/** Run the built CLI (dist/cli.js) inside a temp repo. */
export function runCli(dir: string, args: string[], env?: Record<string, string>): { status: number | null; stdout: string; stderr: string } {
  return sh(dir, process.execPath, [CLI_PATH, ...args], env);
}
