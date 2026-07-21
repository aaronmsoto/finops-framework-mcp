import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GENERATED_HEADER,
  INTEGRATION_RULESET_PATH,
  checkApprovals,
  compileApprovals,
  compileCodeowners,
  compileCopilotWrapper,
  compileIntegrationRuleset,
  compileRuleset,
  compileSettingsJson,
  derivedPermissions,
} from "../src/approvals.js";
import type { ApprovalsPolicy } from "../src/config.js";
import { makeTempDir, readFileIn, rmDir } from "./helpers.js";

const policy: ApprovalsPolicy = {
  version: 1,
  owner: "@octo-owner",
  approvals: { merge_to_main: "human", deploy_production: "human", release: "human", force_push: "never" },
  protected_paths: ["tests/**", ".github/workflows/**", "approvals.yaml"],
  commands: {
    ask: ["Bash(git push origin main*)", "Bash(gh pr merge*)"],
    deny: ["Bash(git push --force*)", "Bash(git reset --hard origin*)"],
  },
  loop: { max_iterations: 10, max_wall_minutes: 120, max_consecutive_failures: 3 },
  branching: { mode: "trunk", default_branch: "main", integration_branch: "dev", task_branch_prefix: "task/", integration_merge_method: "squash", release_merge_method: "merge" },
};

/** Same policy in integration mode, with no verbatim gh-pr-merge ask entry. */
const integrationPolicy: ApprovalsPolicy = {
  ...policy,
  commands: { ask: ["Bash(git push origin main*)"], deny: [...policy.commands.deny] },
  branching: { mode: "integration", default_branch: "main", integration_branch: "dev", task_branch_prefix: "task/", integration_merge_method: "squash", release_merge_method: "merge" },
};

describe("derivedPermissions", () => {
  it("maps policy to ask/deny with verbatim commands appended and deduped", () => {
    const { ask, deny } = derivedPermissions(policy);
    expect(deny).toEqual(["Bash(git push --force*)", "Bash(git push -f*)", "Bash(git reset --hard origin*)"]);
    expect(ask).toContain("Bash(gh pr merge*)"); // derived from merge_to_main AND verbatim — appears once
    expect(ask.filter((a) => a === "Bash(gh pr merge*)")).toHaveLength(1);
    expect(ask).toContain("Bash(npm publish*)");
    expect(ask).toContain("Bash(gh release create*)");
    expect(ask).toContain("Bash(git push origin main*)");
  });

  it("derives the default-branch push-ask rules from branching.default_branch", () => {
    const master = {
      ...policy,
      commands: { ask: [], deny: [] },
      branching: { ...policy.branching, default_branch: "master" },
    };
    const { ask } = derivedPermissions(master);
    expect(ask).toContain("Bash(git push origin master*)");
    expect(ask).toContain("Bash(git push * master)");
    expect(ask).not.toContain("Bash(git push origin main*)");
  });

  it("force_push: human moves the force-push patterns from deny to ask", () => {
    const p = { ...policy, approvals: { ...policy.approvals, force_push: "human" as const }, commands: { ask: [], deny: [] } };
    const { ask, deny } = derivedPermissions(p);
    expect(deny).toEqual([]);
    expect(ask).toContain("Bash(git push --force*)");
  });

  it("integration mode omits the derived gh-pr-merge ask rule (auto-merge must be enableable) but keeps the rest", () => {
    const { ask, deny } = derivedPermissions(integrationPolicy);
    expect(ask).not.toContain("Bash(gh pr merge*)");
    expect(ask).toContain("Bash(npm publish*)"); // other derived rules unchanged
    expect(ask).toContain("Bash(gh workflow run *deploy*)");
    expect(ask).toContain("Bash(git push origin main*)"); // verbatim entries still pass through
    expect(deny).toContain("Bash(git push --force*)");
  });
});

describe("compileIntegrationRuleset", () => {
  it("targets refs/heads/<integration_branch>: PR required but ZERO reviews, squash-pinned, gated on checks", () => {
    const ruleset = JSON.parse(compileIntegrationRuleset(integrationPolicy));
    expect(ruleset.name).toBe("integration-branch");
    expect(ruleset.target).toBe("branch");
    expect(ruleset.enforcement).toBe("active");
    expect(ruleset.conditions.ref_name.include).toEqual(["refs/heads/dev"]);
    const types = ruleset.rules.map((r: { type: string }) => r.type);
    expect(types).toEqual(["deletion", "non_fast_forward", "pull_request", "required_status_checks"]);
    const pr = ruleset.rules.find((r: { type: string }) => r.type === "pull_request");
    // Green CI is the merge gate here — no human reviews; the method is pinned.
    expect(pr.parameters.required_approving_review_count).toBe(0);
    expect(pr.parameters.require_code_owner_review).toBe(false);
    expect(pr.parameters.allowed_merge_methods).toEqual(["squash"]);
    const checks = ruleset.rules.find((r: { type: string }) => r.type === "required_status_checks");
    expect(checks.parameters.required_status_checks).toEqual([{ context: "gates-fast" }]);
  });

  it("pins the release merge method on the MAIN ruleset in integration mode only", () => {
    const integ = JSON.parse(compileRuleset(integrationPolicy));
    const prInteg = integ.rules.find((r: { type: string }) => r.type === "pull_request");
    expect(prInteg.parameters.allowed_merge_methods).toEqual(["merge"]);
    const trunk = JSON.parse(compileRuleset(policy));
    const prTrunk = trunk.rules.find((r: { type: string }) => r.type === "pull_request");
    expect(prTrunk.parameters.allowed_merge_methods).toBeUndefined();
  });

  it("honors custom merge methods from the branching section", () => {
    const p = {
      ...integrationPolicy,
      branching: { ...integrationPolicy.branching, integration_merge_method: "rebase" as const, release_merge_method: "squash" as const },
    };
    const integ = JSON.parse(compileIntegrationRuleset(p));
    expect(integ.rules.find((r: { type: string }) => r.type === "pull_request").parameters.allowed_merge_methods).toEqual(["rebase"]);
    const main = JSON.parse(compileRuleset(p));
    expect(main.rules.find((r: { type: string }) => r.type === "pull_request").parameters.allowed_merge_methods).toEqual(["squash"]);
  });

  it("honors a custom integration_branch name", () => {
    const p = { ...integrationPolicy, branching: { ...integrationPolicy.branching, integration_branch: "staging" } };
    expect(JSON.parse(compileIntegrationRuleset(p)).conditions.ref_name.include).toEqual(["refs/heads/staging"]);
  });
});

describe("compileSettingsJson", () => {
  it("creates a minimal settings file when none exists", () => {
    const parsed = JSON.parse(compileSettingsJson(policy, null));
    expect(Object.keys(parsed)).toEqual(["permissions"]);
    expect(parsed.permissions.ask).toEqual(derivedPermissions(policy).ask);
    expect(parsed.permissions.deny).toEqual(derivedPermissions(policy).deny);
  });

  it("owns permissions.ask/deny entirely but preserves everything else", () => {
    const existing = JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: "node x.mjs" }] }] },
      permissions: { ask: ["Bash(stale*)"], deny: ["Bash(old*)"], additionalDirectories: ["/tmp/keep"] },
      model: "opus",
    });
    const parsed = JSON.parse(compileSettingsJson(policy, existing));
    expect(parsed.hooks.SessionStart[0].hooks[0].command).toBe("node x.mjs");
    expect(parsed.model).toBe("opus");
    expect(parsed.permissions.additionalDirectories).toEqual(["/tmp/keep"]);
    expect(parsed.permissions.ask).not.toContain("Bash(stale*)");
    expect(parsed.permissions.deny).toEqual(derivedPermissions(policy).deny);
  });

  it("rejects invalid existing JSON with an actionable message", () => {
    expect(() => compileSettingsJson(policy, "{ broken")).toThrowError(/settings\.json: invalid JSON/);
  });
});

describe("compileCopilotWrapper", () => {
  it("emits a guarded bash wrapper with shell() deny flags for deny AND ask entries", () => {
    const script = compileCopilotWrapper(policy);
    expect(script.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(script).toContain(GENERATED_HEADER);
    expect(script).toContain('exec copilot "$@"');
    // Bash(x) -> shell(x) mapping
    expect(script).toContain("--deny-tool 'shell(git push --force*)'");
    expect(script).toContain("--deny-tool 'shell(git reset --hard origin*)'");
    // ask entries are denied too (Copilot has no ask tier), with the explanation present
    expect(script).toContain("--deny-tool 'shell(gh pr merge*)'");
    expect(script).toMatch(/no "ask" permission tier/);
    // line continuations: every flag line except the last ends with a backslash
    const flagLines = script.split("\n").filter((l) => l.trimStart().startsWith("--deny-tool"));
    expect(flagLines.length).toBeGreaterThan(3);
    for (const line of flagLines.slice(0, -1)) expect(line.endsWith("\\")).toBe(true);
    expect(flagLines[flagLines.length - 1]!.endsWith("\\")).toBe(false);
  });
});

describe("compileCodeowners", () => {
  it("emits * owner plus one line per protected path when merge_to_main is human", () => {
    const content = compileCodeowners(policy);
    const lines = content.trim().split("\n").filter((l) => !l.startsWith("#"));
    expect(lines).toEqual([
      "* @octo-owner",
      "tests/** @octo-owner",
      ".github/workflows/** @octo-owner",
      "approvals.yaml @octo-owner",
    ]);
    expect(content).toContain(GENERATED_HEADER);
  });

  it("omits the catch-all when merge_to_main is auto", () => {
    const p = { ...policy, approvals: { ...policy.approvals, merge_to_main: "auto" as const } };
    const lines = compileCodeowners(p).trim().split("\n").filter((l) => !l.startsWith("#"));
    expect(lines[0]).toBe("tests/** @octo-owner");
  });
});

describe("compileRuleset", () => {
  it("emits an importable GitHub ruleset targeting main", () => {
    const ruleset = JSON.parse(compileRuleset(policy));
    expect(ruleset.target).toBe("branch");
    expect(ruleset.enforcement).toBe("active");
    expect(ruleset.conditions.ref_name.include).toEqual(["refs/heads/main"]);
    const types = ruleset.rules.map((r: { type: string }) => r.type);
    expect(types).toEqual(["deletion", "non_fast_forward", "pull_request", "required_status_checks"]);
    const pr = ruleset.rules.find((r: { type: string }) => r.type === "pull_request");
    expect(pr.parameters.required_approving_review_count).toBe(1);
    expect(pr.parameters.require_code_owner_review).toBe(true);
    const checks = ruleset.rules.find((r: { type: string }) => r.type === "required_status_checks");
    expect(checks.parameters.required_status_checks).toEqual([{ context: "gates-fast" }]);
  });

  it("targets refs/heads/<default_branch> when it is not main", () => {
    const master = { ...policy, branching: { ...policy.branching, default_branch: "master" } };
    const ruleset = JSON.parse(compileRuleset(master));
    expect(ruleset.conditions.ref_name.include).toEqual(["refs/heads/master"]);
    expect(ruleset.name).toBe("main-branch"); // filename/name stay stable by design
  });

  it("drops the pull_request rule when merge_to_main is auto", () => {
    const p = { ...policy, approvals: { ...policy.approvals, merge_to_main: "auto" as const } };
    const types = JSON.parse(compileRuleset(p)).rules.map((r: { type: string }) => r.type);
    expect(types).not.toContain("pull_request");
  });
});

describe("compile + check on disk", () => {
  let dir: string;
  beforeEach(() => {
    dir = makeTempDir();
  });
  afterEach(() => {
    rmDir(dir);
  });

  it("writes all four surfaces (copilot.sh executable) and check reports no drift", () => {
    const written = compileApprovals(dir, policy);
    expect(written).toEqual([
      ".claude/settings.json",
      "scripts/copilot.sh",
      ".github/CODEOWNERS",
      ".github/rulesets/main-branch.json",
    ]);
    const mode = fs.statSync(path.join(dir, "scripts", "copilot.sh")).mode & 0o777;
    expect(mode).toBe(0o755);
    expect(checkApprovals(dir, policy)).toEqual({ ok: true, drifted: [] });
  });

  it("check flags edited and missing surfaces as drift", () => {
    compileApprovals(dir, policy);
    fs.appendFileSync(path.join(dir, "scripts", "copilot.sh"), "# sneaky edit\n");
    fs.rmSync(path.join(dir, ".github", "CODEOWNERS"));
    const report = checkApprovals(dir, policy);
    expect(report.ok).toBe(false);
    expect(report.drifted).toEqual([
      { path: "scripts/copilot.sh", reason: "differs" },
      { path: ".github/CODEOWNERS", reason: "missing" },
    ]);
  });

  it("integration mode writes a fifth surface (integration ruleset) and check is clean", () => {
    const written = compileApprovals(dir, integrationPolicy);
    expect(written).toEqual([
      ".claude/settings.json",
      "scripts/copilot.sh",
      ".github/CODEOWNERS",
      ".github/rulesets/main-branch.json",
      INTEGRATION_RULESET_PATH,
    ]);
    expect(JSON.parse(readFileIn(dir, INTEGRATION_RULESET_PATH)).name).toBe("integration-branch");
    // the settings surface really dropped the derived gh-pr-merge ask rule
    const settings = JSON.parse(readFileIn(dir, ".claude/settings.json"));
    expect(settings.permissions.ask).not.toContain("Bash(gh pr merge*)");
    expect(checkApprovals(dir, integrationPolicy)).toEqual({ ok: true, drifted: [] });
  });

  it("check flags a missing integration ruleset in integration mode, and a stale one in trunk mode", () => {
    compileApprovals(dir, integrationPolicy);
    fs.rmSync(path.join(dir, INTEGRATION_RULESET_PATH));
    expect(checkApprovals(dir, integrationPolicy).drifted).toEqual([{ path: INTEGRATION_RULESET_PATH, reason: "missing" }]);

    // Flip back to trunk with the integration ruleset still on disk: stale drift.
    compileApprovals(dir, integrationPolicy);
    compileApprovals(dir, policy); // trunk compile removes it...
    expect(fs.existsSync(path.join(dir, INTEGRATION_RULESET_PATH))).toBe(false);
    expect(checkApprovals(dir, policy).ok).toBe(true);

    fs.writeFileSync(path.join(dir, INTEGRATION_RULESET_PATH), "{}\n"); // ...and check flags a leftover
    const report = checkApprovals(dir, policy);
    expect(report.ok).toBe(false);
    expect(report.drifted).toEqual([{ path: INTEGRATION_RULESET_PATH, reason: "stale" }]);
  });

  it("recompiling preserves user keys in settings.json while re-owning ask/deny", () => {
    compileApprovals(dir, policy);
    const settingsPath = path.join(dir, ".claude", "settings.json");
    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    parsed.hooks = { Stop: [] };
    parsed.permissions.deny = ["Bash(tampered*)"];
    fs.writeFileSync(settingsPath, JSON.stringify(parsed, null, 2) + "\n");
    expect(checkApprovals(dir, policy).ok).toBe(false); // tampered deny = drift
    compileApprovals(dir, policy);
    const after = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    expect(after.hooks).toEqual({ Stop: [] }); // preserved
    expect(after.permissions.deny).toEqual(derivedPermissions(policy).deny); // re-owned
  });
});
