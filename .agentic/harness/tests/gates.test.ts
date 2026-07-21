import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadAgenticConfig } from "../src/config.js";
import { gatesReportPath, runGates, selectGates } from "../src/gates.js";
import { UsageError } from "../src/util.js";
import { makeTempDir, rmDir, writeConfig } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
});
afterEach(() => {
  rmDir(dir);
});

function configWithGates(gates: Record<string, unknown>) {
  writeConfig(dir, { gates });
  return loadAgenticConfig(dir);
}

describe("gate execution", () => {
  it("passes and fails gates with real exit codes, in declared order", async () => {
    const config = configWithGates({
      ok: { command: "echo hello", tier: "fast" },
      broken: { command: "exit 3", tier: "fast" },
      after: { command: "true", tier: "fast" },
    });
    const report = await runGates(dir, config, { quiet: true });
    expect(report.ok).toBe(false);
    expect(report.results.map((r) => [r.name, r.status])).toEqual([
      ["ok", "pass"],
      ["broken", "fail"],
      ["after", "pass"], // default mode runs everything and reports all failures
    ]);
    expect(report.results[1]!.exitCode).toBe(3);
  });

  it("--fail-fast stops at the first failure", async () => {
    const config = configWithGates({
      broken: { command: "false", tier: "fast" },
      never: { command: "true", tier: "fast" },
    });
    const report = await runGates(dir, config, { failFast: true, quiet: true });
    expect(report.ok).toBe(false);
    expect(report.results).toHaveLength(1);
  });

  it("kills a gate that exceeds timeoutSeconds and marks it failed", async () => {
    const config = configWithGates({ slow: { command: "sleep 30", tier: "fast", timeoutSeconds: 1 } });
    const started = Date.now();
    const report = await runGates(dir, config, { quiet: true });
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(report.ok).toBe(false);
    expect(report.results[0]!.timedOut).toBe(true);
    expect(report.results[0]!.status).toBe("fail");
    expect(report.results[0]!.note).toMatch(/timed out after 1s/);
  });

  it("skips optional gates without a command, with a notice in the report", async () => {
    const config = configWithGates({ coverage: { tier: "fast", optional: true } });
    const report = await runGates(dir, config, { quiet: true });
    expect(report.ok).toBe(true);
    expect(report.results[0]!.status).toBe("skipped");
    expect(report.results[0]!.note).toMatch(/no command bound/);
  });

  it("skips an optional gate whose command is not installed (exit 127), with a notice", async () => {
    const config = configWithGates({
      coverage: { command: "agentic-test-no-such-tool-xyz --version", tier: "fast", optional: true },
      required: { command: "agentic-test-no-such-tool-xyz --version", tier: "fast" },
      optionalRealFailure: { command: "exit 3", tier: "fast", optional: true },
    });
    const report = await runGates(dir, config, { quiet: true });
    const byName = Object.fromEntries(report.results.map((r) => [r.name, r]));
    // optional + 127 -> SKIP with the install-or-remove notice
    expect(byName.coverage!.status).toBe("skipped");
    expect(byName.coverage!.note).toBe("optional gate 'coverage': command not found — install the tool or remove the gate");
    // 127 on a NON-optional gate is still a hard failure
    expect(byName.required!.status).toBe("fail");
    // an optional gate whose command exists but fails is still a failure
    expect(byName.optionalRealFailure!.status).toBe("fail");
    expect(report.ok).toBe(false);
  });

  it("an optional 127 alone leaves the report green", async () => {
    const config = configWithGates({
      ok: { command: "true", tier: "fast" },
      coverage: { command: "agentic-test-no-such-tool-xyz", tier: "fast", optional: true },
    });
    const report = await runGates(dir, config, { quiet: true });
    expect(report.ok).toBe(true);
    expect(report.results.map((r) => r.status)).toEqual(["pass", "skipped"]);
  });

  it("filters by tier: fast (default) | full | all", async () => {
    const config = configWithGates({
      a: { command: "true", tier: "fast" },
      b: { command: "true", tier: "full" },
      c: { command: "true", tier: "fast" },
    });
    expect(selectGates(config, {})).toEqual(["a", "c"]);
    expect(selectGates(config, { tier: "full" })).toEqual(["b"]);
    expect(selectGates(config, { tier: "all" })).toEqual(["a", "b", "c"]);
  });

  it("runs explicitly named gates regardless of tier, and rejects unknown names", async () => {
    const config = configWithGates({
      a: { command: "true", tier: "fast" },
      b: { command: "true", tier: "full" },
    });
    expect(selectGates(config, { names: ["b"] })).toEqual(["b"]);
    expect(() => selectGates(config, { names: ["nope"] })).toThrowError(UsageError);
  });

  it("resolves gate commands from <root>/node_modules/.bin and <root>/.agentic/harness/node_modules/.bin without npx", async () => {
    // The tools exist ONLY in the fake local bin dirs — never on the host PATH.
    const writeTool = (relDir: string, name: string): void => {
      const abs = path.join(dir, relDir);
      fs.mkdirSync(abs, { recursive: true });
      const tool = path.join(abs, name);
      fs.writeFileSync(tool, `#!/bin/sh\necho ${name}-ran\n`);
      fs.chmodSync(tool, 0o755);
    };
    writeTool("node_modules/.bin", "agentic-test-local-tool");
    writeTool(".agentic/harness/node_modules/.bin", "agentic-test-harness-tool");
    const config = configWithGates({
      local: { command: "agentic-test-local-tool", tier: "fast" },
      harness: { command: "agentic-test-harness-tool", tier: "fast" },
    });
    const report = await runGates(dir, config, { quiet: true });
    expect(report.ok).toBe(true);
    expect(report.results.map((r) => r.status)).toEqual(["pass", "pass"]);
  });

  it("writes .agents/.cache/gates-report.json (creating directories)", async () => {
    const config = configWithGates({ ok: { command: "true", tier: "fast" } });
    await runGates(dir, config, { quiet: true });
    const report = JSON.parse(fs.readFileSync(gatesReportPath(dir), "utf8"));
    expect(report.ok).toBe(true);
    expect(report.results[0].name).toBe("ok");
    expect(fs.existsSync(path.join(dir, ".agents", ".cache"))).toBe(true);
  });
});
