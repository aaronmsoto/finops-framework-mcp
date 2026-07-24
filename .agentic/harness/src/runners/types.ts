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

/**
 * Normalized token counts from a runner's usage object. `total` sums ALL
 * fields: with the Claude CLI most input arrives as cache reads, so
 * input+output alone would undercount real work by 10-50x.
 */
export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  total: number;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

export function tokenTotals(usage?: Record<string, unknown>): TokenTotals {
  const input = num(usage?.input_tokens);
  const output = num(usage?.output_tokens);
  const cacheRead = num(usage?.cache_read_input_tokens);
  const cacheCreation = num(usage?.cache_creation_input_tokens);
  return { input, output, cacheRead, cacheCreation, total: input + output + cacheRead + cacheCreation };
}

export function addTokens(a: TokenTotals, b: TokenTotals): TokenTotals {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheCreation: a.cacheCreation + b.cacheCreation,
    total: a.total + b.total,
  };
}

export const ZERO_TOKENS: TokenTotals = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, total: 0 };
