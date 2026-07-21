import { CliError, run } from "../util.js";
import type { AgentRunner, RunnerRequest, RunnerResult } from "./types.js";

/**
 * Mock runner for tests and dry runs: executes $AGENTIC_MOCK_SCRIPT via
 * `sh -c` with cwd = repo root, simulating the agent's file edits. The
 * script sees the selected task id as $AGENTIC_TASK_ID and — when driven by
 * the loop — the phase as $AGENTIC_LOOP_PHASE ("build" or "verify"), so one
 * script can serve both passes. Stdout becomes finalText.
 */
export class MockRunner implements AgentRunner {
  readonly name = "mock";

  async run(request: RunnerRequest): Promise<RunnerResult> {
    const script = process.env.AGENTIC_MOCK_SCRIPT;
    if (script === undefined || script.trim() === "") {
      throw new CliError("the mock runner requires AGENTIC_MOCK_SCRIPT to be set to a shell script body.");
    }
    const res = await run("sh", ["-c", script], {
      cwd: request.cwd,
      env: { ...process.env, ...request.extraEnv },
      timeoutMs: request.timeoutMs,
    });
    return {
      exitCode: res.exitCode,
      durationMs: res.durationMs,
      timedOut: res.timedOut,
      finalText: res.stdout,
      events: [{ type: "raw", text: res.stdout }],
    };
  }
}
