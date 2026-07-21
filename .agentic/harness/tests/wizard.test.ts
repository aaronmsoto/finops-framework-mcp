// Interactive init wizard: prompt sequencing, defaults, validation retries,
// and the guarantee that provided flags are never re-asked. Uses an injected
// WizardIO — the TTY gate itself is exercised via runCli in init.test.ts
// (spawned children have no TTY, so headless runs must error, not prompt).
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promptInitOptions, type WizardIO } from "../src/wizard.js";
import { makeTempDir, rmDir, writeFileIn } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
  writeFileIn(dir, ".agentic/presets/typescript.json", "{}\n");
  writeFileIn(dir, ".agentic/presets/python.json", "{}\n");
});
afterEach(() => {
  rmDir(dir);
});

function scriptedIO(answers: string[]): WizardIO & { asked: string[]; closed: boolean } {
  const io = {
    asked: [] as string[],
    closed: false,
    ask(question: string): Promise<string> {
      io.asked.push(question);
      const next = answers.shift();
      if (next === undefined) throw new Error(`wizard asked more questions than scripted: ${question}`);
      return Promise.resolve(next);
    },
    close(): void {
      io.closed = true;
    },
  };
  return io;
}

describe("promptInitOptions", () => {
  it("accepts defaults on empty input: directory name, typescript, trunk, claude, keep", async () => {
    const io = scriptedIO(["", "", "@me", "", "", ""]);
    const opts = await promptInitOptions(dir, { fresh: false }, io);
    expect(opts.name).toBe(path.basename(dir));
    expect(opts.preset).toBe("typescript");
    expect(opts.owner).toBe("@me");
    expect(opts.branching).toBe("trunk");
    expect(opts.runner).toBe("claude");
    expect(opts.license).toBe("keep");
    expect(opts.licenseHolder).toBeUndefined();
    expect(io.closed).toBe(true);
  });

  it("prepends @ to a bare owner handle and asks for a holder only when the license needs one", async () => {
    const io = scriptedIO(["proj", "python", "me", "integration", "copilot", "mit", "Jane Q. Owner"]);
    const opts = await promptInitOptions(dir, { fresh: false }, io);
    expect(opts.owner).toBe("@me");
    expect(opts.license).toBe("mit");
    expect(opts.licenseHolder).toBe("Jane Q. Owner");
    expect(io.asked.some((q) => q.includes("Copyright holder"))).toBe(true);
  });

  it("re-asks on invalid input instead of failing", async () => {
    const io = scriptedIO(["", "not-a-preset", "typescript", "@me", "nope", "trunk", "", ""]);
    const opts = await promptInitOptions(dir, { fresh: false }, io);
    expect(opts.preset).toBe("typescript");
    expect(opts.branching).toBe("trunk");
  });

  it("never re-asks values already provided as flags", async () => {
    const io = scriptedIO(["@me"]);
    const opts = await promptInitOptions(
      dir,
      { name: "proj", preset: "typescript", branching: "trunk", runner: "claude", license: "proprietary", fresh: true },
      io,
    );
    expect(io.asked).toHaveLength(1);
    expect(io.asked[0]).toContain("Owner");
    expect(opts.fresh).toBe(true);
    expect(opts.license).toBe("proprietary");
  });
});
