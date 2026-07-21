// End-to-end smoke tests against the built CLI (dist/cli.js, compiled by the
// global setup) — exit codes, --json output, verify command.
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CLI_PATH,
  HARNESS_ROOT,
  commitAll,
  initGitRepo,
  makeTempDir,
  readFileIn,
  rmDir,
  runCli,
  sh,
  writeApprovals,
  writeConfig,
  writeFileIn,
} from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
  writeConfig(dir);
  writeApprovals(dir);
  initGitRepo(dir);
  commitAll(dir, "initial");
});
afterEach(() => {
  rmDir(dir);
});

describe("agentic CLI", () => {
  it("--help exits 0 and documents tier semantics", () => {
    const res = runCli(dir, ["--help"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("--tier fast (default) runs fast-tier gates only");
    expect(res.stdout).toContain("Exit codes: 0 success, 1 failure, 2 usage error.");
  });

  it("runs (not a silent no-op) when invoked through a symlinked directory path", () => {
    // Node realpaths the ESM entry module while argv[1] keeps the logical
    // path; the entry guard must realpath both sides or a symlinked
    // invocation silently exits 0 without doing anything.
    const linkDir = path.join(dir, "dist-link");
    fs.symlinkSync(path.join(HARNESS_ROOT, "dist"), linkDir, "dir");
    const help = sh(dir, process.execPath, [path.join(linkDir, "cli.js"), "--help"]);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("agentic — harness for agentic software projects");
    // Real work + real exit codes through the symlink, not just help text.
    const gates = sh(dir, process.execPath, [path.join(linkDir, "cli.js"), "gates", "--json"]);
    expect(gates.status).toBe(0);
    expect(JSON.parse(gates.stdout).ok).toBe(true);
    const usageErr = sh(dir, process.execPath, [path.join(linkDir, "cli.js"), "frobnicate"]);
    expect(usageErr.status).toBe(2);
  });

  it("unknown commands and unknown flags exit 2", () => {
    expect(runCli(dir, ["frobnicate"]).status).toBe(2);
    expect(runCli(dir, ["gates", "--frighten"]).status).toBe(2);
    expect(runCli(dir, ["tasks", "add", "--title", "x"]).status).toBe(2); // missing required --acceptance
  });

  it("gates runs and exits 0/1 with --json report on stdout", () => {
    const ok = runCli(dir, ["gates", "--json"]);
    expect(ok.status).toBe(0);
    const report = JSON.parse(ok.stdout);
    expect(report.ok).toBe(true);
    expect(report.results[0].name).toBe("noop");

    writeConfig(dir, { gates: { broken: { command: "false", tier: "fast" } } });
    expect(runCli(dir, ["gates"]).status).toBe(1);
  });

  it("tasks add/list/next/start/complete/validate round-trip through the CLI", () => {
    const add = runCli(dir, ["tasks", "add", "--title", "ship it", "--acceptance", "gates pass", "--json"]);
    expect(add.status).toBe(0);
    expect(JSON.parse(add.stdout).id).toBe("T-001");

    const list = runCli(dir, ["tasks", "list", "--json"]);
    expect(JSON.parse(list.stdout).tasks).toHaveLength(1);

    const next = runCli(dir, ["tasks", "next", "--json"]);
    expect(JSON.parse(next.stdout).id).toBe("T-001");

    expect(runCli(dir, ["tasks", "start", "T-001"]).status).toBe(0);
    const complete = runCli(dir, ["tasks", "complete", "T-001", "--summary", "done via cli"]);
    expect(complete.status).toBe(0);

    const validate = runCli(dir, ["tasks", "validate", "--json"]);
    expect(validate.status).toBe(0);
    expect(JSON.parse(validate.stdout)).toEqual({ ok: true, errors: [] });

    // Tamper by hand -> validate exits 1.
    const tasksFile = JSON.parse(readFileIn(dir, ".agents/tasks.json"));
    tasksFile.tasks[0].evidence.summary = "rewritten";
    writeFileIn(dir, ".agents/tasks.json", JSON.stringify(tasksFile, null, 2));
    expect(runCli(dir, ["tasks", "validate"]).status).toBe(1);
  });

  it("verify checks gates + chain + clean tree + evidence, with --json state", () => {
    runCli(dir, ["tasks", "add", "--title", "t", "--acceptance", "a"]);
    commitAll(dir, "add task");
    const ok = runCli(dir, ["verify", "--json"]);
    expect(ok.status).toBe(0);
    const parsed = JSON.parse(ok.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.checks.map((c: { name: string }) => c.name)).toEqual([
      "gates-fast",
      "chain-valid",
      "working-tree-clean",
      "done-tasks-have-evidence",
      "acceptance-criteria-present",
    ]);

    writeFileIn(dir, "uncommitted.txt", "dirt\n");
    const dirty = runCli(dir, ["verify", "--json"]);
    expect(dirty.status).toBe(1);
    expect(JSON.parse(dirty.stdout).checks.find((c: { name: string }) => c.name === "working-tree-clean").ok).toBe(false);
  });

  it("approvals compile writes surfaces; check detects drift and exits 1", () => {
    const compile = runCli(dir, ["approvals", "compile", "--json"]);
    expect(compile.status).toBe(0);
    expect(JSON.parse(compile.stdout).written).toHaveLength(4);
    expect(runCli(dir, ["approvals", "check"]).status).toBe(0);

    fs.appendFileSync(path.join(dir, ".github", "CODEOWNERS"), "sneaky @edit\n");
    const drift = runCli(dir, ["approvals", "check", "--json"]);
    expect(drift.status).toBe(1);
    expect(JSON.parse(drift.stdout).drifted[0].path).toBe(".github/CODEOWNERS");
  });

  it("approvals compile|check handle the conditional integration surface per branching mode", () => {
    fs.appendFileSync(path.join(dir, "approvals.yaml"), "branching:\n  mode: integration\n");
    const compile = runCli(dir, ["approvals", "compile", "--json"]);
    expect(compile.status).toBe(0);
    const written = JSON.parse(compile.stdout).written;
    expect(written).toHaveLength(5);
    expect(written).toContain(".github/rulesets/integration-branch.json");
    expect(runCli(dir, ["approvals", "check"]).status).toBe(0);

    // Flip back to trunk: the leftover integration ruleset is stale drift,
    // and a trunk compile cleans it up.
    writeApprovals(dir);
    const stale = runCli(dir, ["approvals", "check", "--json"]);
    expect(stale.status).toBe(1);
    expect(JSON.parse(stale.stdout).drifted).toContainEqual({
      path: ".github/rulesets/integration-branch.json",
      reason: "stale",
    });
    expect(runCli(dir, ["approvals", "compile"]).status).toBe(0);
    expect(fs.existsSync(path.join(dir, ".github/rulesets/integration-branch.json"))).toBe(false);
    expect(runCli(dir, ["approvals", "check"]).status).toBe(0);
  });

  it("a bad branching.mode exits 1 with a path-qualified error", () => {
    fs.appendFileSync(path.join(dir, "approvals.yaml"), "branching:\n  mode: gitflow\n");
    const res = runCli(dir, ["approvals", "check"]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('branching.mode must be "trunk" or "integration"');
  });

  it("memory lint exits 1 on failure with a clean message, 0 with warnings only", () => {
    const missing = runCli(dir, ["memory", "lint"]);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toContain("MEMORY.md not found");

    writeFileIn(dir, ".agents/memory/MEMORY.md", "# ok\n");
    writeFileIn(dir, ".agents/memory/activeContext.md", "# ctx\n");
    const ok = runCli(dir, ["memory", "lint"]);
    expect(ok.status).toBe(0);

    const show = runCli(dir, ["memory", "show", "--session-start"]);
    expect(show.status).toBe(0);
    expect(show.stdout).toContain("===== .agents/memory/MEMORY.md =====");
  });

  it("integrity exits 0 with a notice when the base is unresolvable", () => {
    const res = runCli(dir, ["integrity"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/unresolvable/);
  });

  it("status prints a one-screen summary and supports --json", () => {
    runCli(dir, ["tasks", "add", "--title", "t", "--acceptance", "a"]);
    runCli(dir, ["gates"]);
    const res = runCli(dir, ["status"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("tasks: 1 pending");
    expect(res.stdout).toContain("loop caps: 10 iterations");
    const json = runCli(dir, ["status", "--json"]);
    expect(JSON.parse(json.stdout).tasks.pending).toBe(1);
  });

  it("loop --runner mock works end-to-end through the CLI with --json state", () => {
    writeFileIn(dir, ".agents/prompts/build.md", "build preamble\n");
    writeFileIn(dir, ".agents/prompts/plan.md", "plan preamble\n");
    writeFileIn(dir, ".agents/prompts/verify.md", "verify preamble\n");
    commitAll(dir, "prompts");
    runCli(dir, ["tasks", "add", "--title", "one", "--acceptance", "a"]);
    const script = [
      'if [ "$AGENTIC_LOOP_PHASE" = "preflight" ]; then printf OK > "$AGENTIC_PREFLIGHT_FILE"; exit 0; fi',
      'if [ "$AGENTIC_LOOP_PHASE" = "verify" ]; then echo "VERDICT: pass"; exit 0; fi',
      "echo work >> notes.txt",
      `"${process.execPath}" "${CLI_PATH}" tasks complete "$AGENTIC_TASK_ID" --summary "cli loop" >&2`,
      "git add -A >&2",
      'git commit -qm "done"',
    ].join("\n");
    const res = runCli(dir, ["loop", "--runner", "mock", "--json"], { AGENTIC_MOCK_SCRIPT: script });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.state).toBe("success");
    expect(parsed.iterations).toHaveLength(1);
    // The mock success contract is printed at loop start, not buried in a docstring.
    expect(res.stderr).toContain("mock contract");
    expect(res.stderr).toContain("VERDICT: pass|fail");
  });

  it("tasks complete --commit records the chain state in its own commit and leaves a clean tree", () => {
    runCli(dir, ["tasks", "add", "--title", "ship it", "--acceptance", "gates pass"]);
    commitAll(dir, "add task"); // the work commit; tasks.json committed as pending
    const before = sh(dir, "git", ["rev-parse", "HEAD"]).stdout.trim();

    const res = runCli(dir, ["tasks", "complete", "T-001", "--summary", "done", "--commit"]);
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('committed .agents/tasks.json — "Record T-001 completion"');

    // Clean tree, one new commit, and its diff touches only tasks.json.
    expect(sh(dir, "git", ["status", "--porcelain"]).stdout.trim()).toBe("");
    const after = sh(dir, "git", ["rev-parse", "HEAD"]).stdout.trim();
    expect(after).not.toBe(before);
    expect(sh(dir, "git", ["log", "-1", "--format=%s"]).stdout.trim()).toBe("Record T-001 completion");
    const touched = sh(dir, "git", ["show", "--name-only", "--format=", "HEAD"]).stdout.trim().split("\n");
    expect(touched).toEqual([".agents/tasks.json"]);
  });

  it("init applies a preset, resets state, compiles approvals; missing preset exits 2", () => {
    const missing = runCli(dir, ["init", "--name", "proj", "--preset", "nope", "--owner", "@me"]);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain('preset "nope" not found');

    writeFileIn(
      dir,
      ".agentic/presets/typescript.json",
      JSON.stringify({
        gates: { lint: { command: "npm run lint", tier: "fast" }, build: { command: "npm run build", tier: "full" } },
        project: { srcDirs: ["src"], testGlobs: ["tests/**"] },
      }),
    );
    writeFileIn(dir, ".agents/specs/old-example.md", "stale spec\n");
    writeFileIn(dir, ".agents/specs/TEMPLATE.md", "keep me\n");
    writeFileIn(dir, ".agents/journal.md", "## legacy entry\n- old\n");
    writeFileIn(dir, ".agents/journal/20250101-old-session.md", "## stale entry\n- old\n");
    const res = runCli(dir, ["init", "--name", "proj", "--preset", "typescript", "--owner", "@newowner", "--fresh"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("Next steps");

    const config = JSON.parse(readFileIn(dir, "agentic.config.json"));
    expect(config.preset).toBe("typescript");
    expect(config.project.name).toBe("proj");
    expect(config.gates.lint.command).toBe("npm run lint");
    expect(readFileIn(dir, "approvals.yaml")).toContain('owner: "@newowner"');
    expect(readFileIn(dir, ".agents/memory/MEMORY.md")).toContain("proj");
    expect(JSON.parse(readFileIn(dir, ".agents/tasks.json")).chainHead).toBe("genesis");
    // Journal: fresh directory layout with only the convention README.
    expect(fs.existsSync(path.join(dir, ".agents/journal.md"))).toBe(false);
    expect(fs.existsSync(path.join(dir, ".agents/journal/20250101-old-session.md"))).toBe(false);
    expect(fs.readdirSync(path.join(dir, ".agents/journal"))).toEqual(["README.md"]);
    expect(readFileIn(dir, ".agents/journal/README.md")).toContain("One file per session or loop run");
    expect(fs.existsSync(path.join(dir, ".agents/specs/old-example.md"))).toBe(false);
    expect(fs.existsSync(path.join(dir, ".agents/specs/TEMPLATE.md"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "scripts/copilot.sh"))).toBe(true);
    expect(readFileIn(dir, ".github/CODEOWNERS")).toContain("@newowner");
  });
});
