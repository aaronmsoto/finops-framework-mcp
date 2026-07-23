import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BRANCHING,
  DEFAULT_GATE_TIMEOUT_SECONDS,
  DEFAULT_LOOP_CAPS,
  loadAgenticConfig,
  loadApprovals,
  validateAgenticConfig,
  validateApprovals,
} from "../src/config.js";
import { makeTempDir, rmDir, writeConfig } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
});
afterEach(() => {
  rmDir(dir);
});

describe("agentic.config.json loading", () => {
  it("loads a valid config with defaults applied", () => {
    writeConfig(dir, { gates: { lint: { command: "true", tier: "fast" } } });
    const config = loadAgenticConfig(dir);
    expect(config.project.name).toBe("temp-project");
    expect(config.gates.lint).toEqual({ command: "true", tier: "fast", optional: false, timeoutSeconds: DEFAULT_GATE_TIMEOUT_SECONDS });
    expect(config.memory.coreBudgetLines).toBe(200);
  });

  it("fails with an actionable message when the file is missing", () => {
    expect(() => loadAgenticConfig(dir)).toThrowError(/agentic\.config\.json not found/);
  });

  it("fails on invalid JSON with the parse error", () => {
    fs.writeFileSync(path.join(dir, "agentic.config.json"), "{ nope");
    expect(() => loadAgenticConfig(dir)).toThrowError(/invalid JSON/);
  });

  it("names the offending path on a bad tier", () => {
    expect(() => validateAgenticConfig({ project: { name: "x" }, gates: { lint: { command: "true", tier: "quick" } } })).toThrowError(
      /gates\.lint\.tier must be "fast" or "full"/,
    );
  });

  it("requires command on non-optional gates but allows optional ones to omit it", () => {
    expect(() => validateAgenticConfig({ project: { name: "x" }, gates: { lint: { tier: "fast" } } })).toThrowError(
      /gates\.lint\.command is required/,
    );
    const config = validateAgenticConfig({ project: { name: "x" }, gates: { cov: { tier: "fast", optional: true } } });
    expect(config.gates.cov!.command).toBeNull();
  });

  it("rejects a missing project.name and a non-positive timeout", () => {
    expect(() => validateAgenticConfig({ project: {}, gates: {} })).toThrowError(/project\.name must be a string \(got missing\)/);
    expect(() =>
      validateAgenticConfig({ project: { name: "x" }, gates: { t: { command: "true", tier: "fast", timeoutSeconds: 0 } } }),
    ).toThrowError(/gates\.t\.timeoutSeconds must be a positive number/);
  });
});

describe("approvals.yaml loading", () => {
  it("loads a valid policy and applies loop-cap defaults when absent", () => {
    fs.writeFileSync(path.join(dir, "approvals.yaml"), 'version: 1\nowner: "@me"\n');
    const policy = loadApprovals(dir);
    expect(policy.owner).toBe("@me");
    expect(policy.loop).toEqual(DEFAULT_LOOP_CAPS);
    expect(policy.approvals.force_push).toBe("never");
    expect(policy.commands).toEqual({ ask: [], deny: [] });
  });

  it("fails with an actionable message when approvals.yaml is missing", () => {
    expect(() => loadApprovals(dir)).toThrowError(/approvals\.yaml not found/);
  });

  it("rejects a bad approval value with the offending path", () => {
    expect(() => validateApprovals({ version: 1, owner: "@me", approvals: { merge_to_main: "maybe" } })).toThrowError(
      /approvals\.merge_to_main must be "human" or "auto"/,
    );
  });

  it("rejects wrong version, missing owner, and non-positive caps", () => {
    expect(() => validateApprovals({ version: 2, owner: "@me" })).toThrowError(/version must be 1/);
    expect(() => validateApprovals({ version: 1 })).toThrowError(/owner must be a string \(got missing\)/);
    expect(() => validateApprovals({ version: 1, owner: "@me", loop: { max_iterations: 0 } })).toThrowError(
      /loop\.max_iterations must be a positive integer/,
    );
  });

  it("max_total_tokens: defaults to null, accepts a positive integer, rejects junk", () => {
    expect(validateApprovals({ version: 1, owner: "@me" }).loop.max_total_tokens).toBeNull();
    expect(validateApprovals({ version: 1, owner: "@me", loop: { max_total_tokens: 500000 } }).loop.max_total_tokens).toBe(500000);
    expect(() => validateApprovals({ version: 1, owner: "@me", loop: { max_total_tokens: 0 } })).toThrowError(
      /loop\.max_total_tokens must be a positive integer/,
    );
    expect(() => validateApprovals({ version: 1, owner: "@me", loop: { max_total_tokens: "lots" } })).toThrowError(
      /loop\.max_total_tokens must be a positive integer/,
    );
  });

  it("applies branching defaults when the section is absent", () => {
    const policy = validateApprovals({ version: 1, owner: "@me" });
    expect(policy.branching).toEqual(DEFAULT_BRANCHING);
    expect(policy.branching).toEqual({ mode: "trunk", default_branch: "main", integration_branch: "dev", task_branch_prefix: "task/", integration_merge_method: "squash", release_merge_method: "merge" });
  });

  it("parses an integration branching section with per-field defaults", () => {
    const policy = validateApprovals({ version: 1, owner: "@me", branching: { mode: "integration" } });
    expect(policy.branching).toEqual({ mode: "integration", default_branch: "main", integration_branch: "dev", task_branch_prefix: "task/", integration_merge_method: "squash", release_merge_method: "merge" });
    const custom = validateApprovals({
      version: 1,
      owner: "@me",
      branching: { mode: "integration", integration_branch: "staging", task_branch_prefix: "feat/" },
    });
    expect(custom.branching).toEqual({ mode: "integration", default_branch: "main", integration_branch: "staging", task_branch_prefix: "feat/", integration_merge_method: "squash", release_merge_method: "merge" });
  });

  it("defaults default_branch to main and parses an override", () => {
    expect(validateApprovals({ version: 1, owner: "@me" }).branching.default_branch).toBe("main");
    expect(validateApprovals({ version: 1, owner: "@me", branching: { default_branch: "master" } }).branching.default_branch).toBe("master");
    expect(() => validateApprovals({ version: 1, owner: "@me", branching: { default_branch: "" } })).toThrowError(
      /branching\.default_branch must be a non-empty string/,
    );
  });

  it("rejects a bad branching section with the offending path", () => {
    expect(() => validateApprovals({ version: 1, owner: "@me", branching: { mode: "gitflow" } })).toThrowError(
      /branching\.mode must be "trunk" or "integration" \(got "gitflow"\)/,
    );
    expect(() => validateApprovals({ version: 1, owner: "@me", branching: "integration" })).toThrowError(
      /branching must be a mapping/,
    );
    expect(() => validateApprovals({ version: 1, owner: "@me", branching: { integration_branch: "" } })).toThrowError(
      /branching\.integration_branch must be a non-empty string/,
    );
  });
});
