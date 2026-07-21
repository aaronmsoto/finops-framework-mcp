import { run, shellWordSplit } from "../util.js";
import type { AgentRunner, RunnerEvent, RunnerRequest, RunnerResult } from "./types.js";

/**
 * Tolerantly parse JSONL output: each line that parses as a JSON object with
 * a string `type` becomes an event; every other non-empty line is kept as
 * `{ type: "raw", text }` so nothing an agent prints is lost.
 */
export function parseJsonlEvents(stdout: string): RunnerEvent[] {
  const events: RunnerEvent[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) && typeof (parsed as RunnerEvent).type === "string") {
        events.push(parsed as RunnerEvent);
        continue;
      }
    } catch {
      // fall through to raw
    }
    events.push({ type: "raw", text: line });
  }
  return events;
}

/** Best-effort final text: last `result` event, else last message-ish text, else last raw line. */
export function extractFinalText(events: RunnerEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.type === "result" && typeof ev.result === "string") return ev.result;
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    const text = messageText(ev);
    if (text !== null) return text;
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.type === "raw" && typeof ev.text === "string" && ev.text.trim() !== "") return ev.text;
  }
  return "";
}

function messageText(ev: RunnerEvent): string | null {
  if (typeof ev.text === "string" && ev.type !== "raw") return ev.text;
  const message = ev.message;
  if (message !== null && typeof message === "object" && !Array.isArray(message)) {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const texts = content
        .filter((b): b is Record<string, unknown> => b !== null && typeof b === "object")
        .map((b) => (typeof b.text === "string" ? b.text : ""))
        .filter((t) => t !== "");
      if (texts.length > 0) return texts.join("\n");
    }
  }
  return null;
}

export function extractUsage(events: RunnerEvent[]): Record<string, unknown> | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const usage = events[i]!.usage;
    if (usage !== null && typeof usage === "object" && !Array.isArray(usage)) return usage as Record<string, unknown>;
  }
  return undefined;
}

/** Args for the Claude Code CLI; extras appended from AGENTIC_CLAUDE_ARGS (shell-word-split). */
export function claudeArgs(prompt: string, extraArgsEnv: string | undefined): string[] {
  return ["-p", prompt, "--output-format", "stream-json", "--verbose", ...shellWordSplit(extraArgsEnv ?? "")];
}

export class ClaudeRunner implements AgentRunner {
  readonly name = "claude";

  async run(request: RunnerRequest): Promise<RunnerResult> {
    const args = claudeArgs(request.prompt, process.env.AGENTIC_CLAUDE_ARGS);
    const res = await run("claude", args, {
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
    };
  }
}
