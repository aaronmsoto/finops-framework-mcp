import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeArgs, extractFinalText, parseJsonlEvents } from "../src/runners/claude.js";
import { copilotArgs, copilotCommand } from "../src/runners/copilot.js";
import { MockRunner } from "../src/runners/mock.js";
import { addTokens, tokenTotals, ZERO_TOKENS } from "../src/runners/types.js";
import { shellWordSplit } from "../src/util.js";
import { makeTempDir, rmDir, writeFileIn } from "./helpers.js";

describe("JSONL event parsing", () => {
  it("parses JSON lines into events and keeps non-JSON lines as raw", () => {
    const events = parseJsonlEvents(
      ['{"type":"system","subtype":"init"}', "plain progress line", '{"type":"result","result":"final answer"}', "", "[1,2]"].join("\n"),
    );
    expect(events.map((e) => e.type)).toEqual(["system", "raw", "result", "raw"]);
    expect(events[1]!.text).toBe("plain progress line");
  });

  it("finalText prefers the last result event, then message text, then raw", () => {
    expect(extractFinalText(parseJsonlEvents('{"type":"result","result":"A"}\n{"type":"result","result":"B"}'))).toBe("B");
    expect(
      extractFinalText(parseJsonlEvents('{"type":"assistant","message":{"content":[{"type":"text","text":"from message"}]}}')),
    ).toBe("from message");
    expect(extractFinalText(parseJsonlEvents("just raw output"))).toBe("just raw output");
    expect(extractFinalText([])).toBe("");
  });
});

describe("runner argument construction", () => {
  it("claude: -p prompt with stream-json output plus AGENTIC_CLAUDE_ARGS split shell-style", () => {
    expect(claudeArgs("do it", undefined)).toEqual(["-p", "do it", "--output-format", "stream-json", "--verbose"]);
    expect(claudeArgs("p", `--model opus --append-system-prompt "be very careful"`)).toEqual([
      "-p",
      "p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--model",
      "opus",
      "--append-system-prompt",
      "be very careful",
    ]);
  });

  it("copilot: guarded wrapper flags plus AGENTIC_COPILOT_ARGS", () => {
    expect(copilotArgs("p", "--extra 'a b'")).toEqual(["-p", "p", "--output-format", "json", "-s", "--no-ask-user", "--extra", "a b"]);
  });

  it("copilot: prefers scripts/copilot.sh from the repo root when present", () => {
    const dir = makeTempDir();
    try {
      expect(copilotCommand(dir)).toBe("copilot");
      writeFileIn(dir, "scripts/copilot.sh", "#!/usr/bin/env bash\n");
      expect(copilotCommand(dir)).toBe(path.join(dir, "scripts", "copilot.sh"));
    } finally {
      rmDir(dir);
    }
  });

  it("shellWordSplit handles quotes and escapes", () => {
    expect(shellWordSplit("")).toEqual([]);
    expect(shellWordSplit("a  b")).toEqual(["a", "b"]);
    expect(shellWordSplit(`--flag "two words" 'single \\ quoted' esc\\ aped`)).toEqual([
      "--flag",
      "two words",
      "single \\ quoted",
      "esc aped",
    ]);
  });
});

describe("mock runner", () => {
  let dir: string;
  const saved = process.env.AGENTIC_MOCK_SCRIPT;
  beforeEach(() => {
    dir = makeTempDir();
  });
  afterEach(() => {
    rmDir(dir);
    if (saved === undefined) delete process.env.AGENTIC_MOCK_SCRIPT;
    else process.env.AGENTIC_MOCK_SCRIPT = saved;
  });

  it("runs AGENTIC_MOCK_SCRIPT in the repo root with the task id in the env; stdout is finalText", async () => {
    process.env.AGENTIC_MOCK_SCRIPT = 'echo "task=$AGENTIC_TASK_ID in $(basename "$PWD")"';
    const result = await new MockRunner().run({ prompt: "ignored", cwd: dir, timeoutMs: 10_000, extraEnv: { AGENTIC_TASK_ID: "T-042" } });
    expect(result.exitCode).toBe(0);
    expect(result.finalText).toContain("task=T-042");
    expect(result.finalText).toContain(path.basename(dir));
  });

  it("parses the last AGENTIC_MOCK_USAGE marker into usage; malformed markers are ignored", async () => {
    process.env.AGENTIC_MOCK_SCRIPT = [
      'echo "AGENTIC_MOCK_USAGE: {not json}"',
      'echo "AGENTIC_MOCK_USAGE: {\\"input_tokens\\": 10, \\"output_tokens\\": 80, \\"cache_read_input_tokens\\": 900}"',
      'echo "done"',
    ].join("\n");
    const result = await new MockRunner().run({ prompt: "p", cwd: dir, timeoutMs: 10_000 });
    expect(result.usage).toEqual({ input_tokens: 10, output_tokens: 80, cache_read_input_tokens: 900 });
    expect(result.finalText).toContain("done");
  });

  it("returns undefined usage when no marker is printed", async () => {
    process.env.AGENTIC_MOCK_SCRIPT = 'echo "no marker here"';
    const result = await new MockRunner().run({ prompt: "p", cwd: dir, timeoutMs: 10_000 });
    expect(result.usage).toBeUndefined();
  });

  it("exposes the script's stderr on the result", async () => {
    process.env.AGENTIC_MOCK_SCRIPT = 'echo "visible output"; echo "hidden cause" >&2';
    const result = await new MockRunner().run({ prompt: "p", cwd: dir, timeoutMs: 10_000 });
    expect(result.finalText).toContain("visible output");
    expect(result.stderr).toContain("hidden cause");
  });

  it("enforces timeoutMs by killing the process group", async () => {
    process.env.AGENTIC_MOCK_SCRIPT = "sleep 30";
    const started = Date.now();
    const result = await new MockRunner().run({ prompt: "p", cwd: dir, timeoutMs: 500 });
    expect(result.timedOut).toBe(true);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("fails clearly when AGENTIC_MOCK_SCRIPT is unset", async () => {
    delete process.env.AGENTIC_MOCK_SCRIPT;
    await expect(new MockRunner().run({ prompt: "p", cwd: dir, timeoutMs: 1000 })).rejects.toThrowError(/AGENTIC_MOCK_SCRIPT/);
  });
});

describe("token totals", () => {
  it("maps all four claude usage fields and sums them into total", () => {
    const t = tokenTotals({ input_tokens: 10, output_tokens: 80, cache_read_input_tokens: 900, cache_creation_input_tokens: 7 });
    expect(t).toEqual({ input: 10, output: 80, cacheRead: 900, cacheCreation: 7, total: 997 });
  });

  it("treats missing, negative, and non-numeric fields as zero", () => {
    expect(tokenTotals(undefined)).toEqual(ZERO_TOKENS);
    expect(tokenTotals({ input_tokens: -5, output_tokens: "x" }).total).toBe(0);
  });

  it("addTokens sums field-wise", () => {
    const a = tokenTotals({ input_tokens: 1, output_tokens: 2 });
    const b = tokenTotals({ input_tokens: 3, cache_read_input_tokens: 4 });
    expect(addTokens(a, b)).toEqual({ input: 4, output: 2, cacheRead: 4, cacheCreation: 0, total: 10 });
  });
});
