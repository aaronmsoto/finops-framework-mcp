import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Error carrying a CLI exit code: 1 = failure, 2 = usage error. */
export class CliError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

/** Usage error — always exits 2. */
export class UsageError extends CliError {
  constructor(message: string) {
    super(message, 2);
    this.name = "UsageError";
  }
}

/**
 * Walk up from startDir to find the repo root (the directory containing
 * agentic.config.json). Every module takes an explicit rootDir; the CLI
 * resolves it exactly once via this function.
 */
export function findRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, "agentic.config.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new CliError(
        `Not inside an agentic repository: no agentic.config.json found walking up from ${startDir}.\n` +
          `Run this command from a repository created with agentic-starter-repo, or create agentic.config.json at the repo root.`,
      );
    }
    dir = parent;
  }
}

/** JSON.stringify with recursively sorted object keys (canonical form for hashing). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) out[key] = sortValue(record[key]);
    return out;
  }
  return value;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Swallow EPIPE on stdout/stderr so piping into an early-closing reader
 * (`agentic status | head -3`) exits cleanly instead of crashing. A closed
 * stdout means the consumer has everything it wants: exit 0 quietly.
 * Installed once at CLI startup.
 */
export function installPipeErrorHandlers(): void {
  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(0);
    throw err;
  });
  process.stderr.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code !== "EPIPE") throw err;
  });
}

/** Human-facing log line -> stderr (data belongs on stdout). */
export function logErr(message: string): void {
  process.stderr.write(message + "\n");
}

/** Data / final summaries -> stdout. */
export function logOut(message: string): void {
  process.stdout.write(message + "\n");
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function readTextIfExists(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const lines = text.split("\n");
  // A trailing newline does not add a line.
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.length;
}

/**
 * POSIX-ish shell word splitting for env-provided extra args
 * (AGENTIC_CLAUDE_ARGS / AGENTIC_COPILOT_ARGS). Supports single quotes,
 * double quotes, and backslash escapes; no expansion of any kind.
 */
export function shellWordSplit(input: string): string[] {
  const words: string[] = [];
  let current = "";
  let hasWord = false;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (inSingle) {
      if (ch === "'") inSingle = false;
      else current += ch;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      else if (ch === "\\" && i + 1 < input.length && '"\\$`'.includes(input[i + 1]!)) current += input[++i];
      else current += ch;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      hasWord = true;
    } else if (ch === '"') {
      inDouble = true;
      hasWord = true;
    } else if (ch === "\\" && i + 1 < input.length) {
      current += input[++i];
      hasWord = true;
    } else if (/\s/.test(ch)) {
      if (hasWord) {
        words.push(current);
        current = "";
        hasWord = false;
      }
    } else {
      current += ch;
      hasWord = true;
    }
  }
  if (hasWord) words.push(current);
  return words;
}

export interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/** Run git synchronously in rootDir. Never throws; check .ok. */
export function git(rootDir: string, args: string[], env?: NodeJS.ProcessEnv): GitResult {
  const res = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    env: env ? { ...process.env, ...env } : process.env,
  });
  return {
    ok: res.status === 0,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    exitCode: res.status,
  };
}

/** Current HEAD commit sha, or null when unavailable (not a repo / no commits). */
export function gitHead(rootDir: string): string | null {
  const res = git(rootDir, ["rev-parse", "HEAD"]);
  return res.ok ? res.stdout.trim() : null;
}

export interface RunOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
}

export interface RunResult {
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}

function makeLineSplitter(onLine: (line: string) => void): { push: (chunk: Buffer) => void; flush: () => void } {
  let buffer = "";
  return {
    push(chunk: Buffer): void {
      buffer += chunk.toString("utf8");
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        onLine(buffer.slice(0, idx).replace(/\r$/, ""));
        buffer = buffer.slice(idx + 1);
      }
    },
    flush(): void {
      if (buffer.length > 0) {
        onLine(buffer.replace(/\r$/, ""));
        buffer = "";
      }
    },
  };
}

/**
 * Spawn a child process in its own process group, stream its output line by
 * line, and kill the whole group if timeoutMs elapses.
 */
export function run(command: string, args: string[], opts: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let timedOut = false;
    let stdout = "";
    let stderr = "";

    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true, // own process group, so a timeout kill reaps grandchildren too
    });

    const outSplit = makeLineSplitter((line) => {
      stdout += line + "\n";
      opts.onStdoutLine?.(line);
    });
    const errSplit = makeLineSplitter((line) => {
      stderr += line + "\n";
      opts.onStderrLine?.(line);
    });
    child.stdout?.on("data", (c: Buffer) => outSplit.push(c));
    child.stderr?.on("data", (c: Buffer) => errSplit.push(c));

    let timer: NodeJS.Timeout | null = null;
    if (opts.timeoutMs !== undefined && opts.timeoutMs > 0 && Number.isFinite(opts.timeoutMs)) {
      timer = setTimeout(() => {
        timedOut = true;
        killProcessGroup(child.pid);
      }, opts.timeoutMs);
    }

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      stderr += `failed to spawn ${command}: ${err.message}\n`;
      opts.onStderrLine?.(`failed to spawn ${command}: ${err.message}`);
      resolve({ exitCode: 127, timedOut, durationMs: Date.now() - started, stdout, stderr });
    });

    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      outSplit.flush();
      errSplit.flush();
      resolve({
        exitCode: code ?? (signal ? 1 : null),
        timedOut,
        durationMs: Date.now() - started,
        stdout,
        stderr,
      });
    });
  });
}

function killProcessGroup(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
}

/**
 * Convert a glob (supports **, *, ?) into a RegExp anchored to the whole
 * repo-relative path. Used for project.testGlobs matching.
 */
export function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]!;
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
        if (glob[i + 1] === "/") i++; // "**/" also matches zero directories
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(ch)) {
      out += "\\" + ch;
    } else {
      out += ch;
    }
  }
  return new RegExp(`^${out}$`);
}

export function matchesAnyGlob(relPath: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(relPath));
}
