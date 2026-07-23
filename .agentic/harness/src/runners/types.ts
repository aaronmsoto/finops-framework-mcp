export interface RunnerRequest {
  prompt: string;
  cwd: string;
  /** Hard wall for this invocation; the loop passes its remaining budget. */
  timeoutMs: number;
  /** Extra environment for the agent process (e.g. AGENTIC_TASK_ID). */
  extraEnv?: Record<string, string>;
}

export interface RunnerEvent {
  type: string;
  [key: string]: unknown;
}

export interface RunnerResult {
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  /** Best-effort final assistant text (last result/message, or raw stdout). */
  finalText: string;
  events: RunnerEvent[];
  usage?: Record<string, unknown>;
  /** Raw stderr from the runner process; CLI-level failures often land only here. */
  stderr?: string;
}

export interface AgentRunner {
  readonly name: string;
  run(request: RunnerRequest): Promise<RunnerResult>;
}
