import fs from "node:fs";
import path from "node:path";
import { run, shellWordSplit } from "../util.js";
import { extractFinalText, extractUsage, parseJsonlEvents } from "./claude.js";
import type { AgentRunner, RunnerRequest, RunnerResult } from "./types.js";

/**
 * Args for the Copilot CLI; extras appended from AGENTIC_COPILOT_ARGS (shell-word-split).
 * Note: `--output-format json` (JSONL) IS a documented Copilot CLI flag — verified
 * against the official docs during fact-checking (the copilot-cli dimension report's
 * "no structured output" claim is stale; see .agentic/docs/research/research-synthesis.md,
 * "Corrections & uncertainties" item 1).
 */
export function copilotArgs(prompt: string, extraArgsEnv: string | undefined): string[] {
  return ["-p", prompt, "--output-format", "json", "-s", "--no-ask-user", ...shellWordSplit(extraArgsEnv ?? "")];
}

/** Prefer the generated guarded wrapper (repo policy carrier) when it exists. */
export function copilotCommand(rootDir: string): string {
  const wrapper = path.join(rootDir, "scripts", "copilot.sh");
  return fs.existsSync(wrapper) ? wrapper : "copilot";
}

export class CopilotRunner implements AgentRunner {
  readonly name = "copilot";

  async run(request: RunnerRequest): Promise<RunnerResult> {
    const command = copilotCommand(request.cwd);
    const args = copilotArgs(request.prompt, process.env.AGENTIC_COPILOT_ARGS);
    const res = await run(command, args, {
      cwd: request.cwd,
      env: { ...process.env, ...request.extraEnv },
      timeoutMs: request.timeoutMs,
    });
    const events = parseJsonlEvents(res.stdout);
    return {
      exitCode: res.exitCode,
      durationMs: res.durationMs,
      timedOut: res.timedOut,
      finalText: extractFinalText(events),
      events,
      usage: extractUsage(events),
      stderr: res.stderr,
    };
  }
}
