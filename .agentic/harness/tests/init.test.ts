// `agentic init` adopter-onboarding behavior: preset setup echo, seeded
// onboarding tasks, branching-mode resolution, preset-shipped files, and
// template-residue cleanup.
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isTemplateReadme, setBranchingMode, setOwnerIdentity } from "../src/init.js";
import {
  commitAll,
  existsIn,
  gitInTemp,
  initGitRepo,
  makeTempDir,
  readFileIn,
  rmDir,
  runCli,
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

function writePreset(name: string, preset: Record<string, unknown>): void {
  writeFileIn(dir, `.agentic/presets/${name}.json`, JSON.stringify(preset, null, 2) + "\n");
}

const MINIMAL_PRESET = {
  gates: { noop: { command: "true", tier: "fast" } },
  project: { srcDirs: ["src"], testGlobs: ["tests/**"] },
};

function initArgs(extra: string[] = []): string[] {
  return ["init", "--name", "proj", "--preset", "tp", "--owner", "@me", ...extra];
}

describe("init: preset setup block and next steps (FIX 1)", () => {
  it("prints the preset's setup array as a numbered block and drops the circular bootstrap step", () => {
    writePreset("tp", { ...MINIMAL_PRESET, setup: ["npm install -D vitest", "configure coverage"] });
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("Preset setup — do these now:");
    expect(res.stdout).toContain("  1. npm install -D vitest");
    expect(res.stdout).toContain("  2. configure coverage");
    // Corrected next-steps list: no circular bootstrap step (bootstrap already ran).
    expect(res.stdout).not.toContain("bootstrap.sh");
    const nextSteps = res.stdout.slice(res.stdout.indexOf("Next steps:"));
    expect(nextSteps).toContain('1. Edit AGENTS.md — replace the "What this project is" section');
    expect(nextSteps).toContain("2. Follow the preset setup block above");
    expect(nextSteps).toContain("3. ./scripts/agentic gates");
    expect(nextSteps).toContain("4. Review approvals.yaml, then: ./scripts/agentic approvals check");
    expect(nextSteps).toContain("5. ./scripts/agentic tasks list");
    expect(nextSteps).toContain("6. Apply GitHub repo settings: ./scripts/github-setup.sh");
  });

  it("omits the setup block when the preset has no setup steps", () => {
    writePreset("tp", MINIMAL_PRESET);
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain("Preset setup — do these now:");
    expect(res.stdout).toContain("Next steps:");
  });
});

describe("init: seeded onboarding tasks (FIX 4)", () => {
  it("seeds three pending onboarding tasks on a genesis chain, visible via tasks list", () => {
    writePreset("tp", MINIMAL_PRESET);
    expect(runCli(dir, initArgs()).status).toBe(0);

    const file = JSON.parse(readFileIn(dir, ".agents/tasks.json"));
    expect(file.chainHead).toBe("genesis");
    expect(file.tasks).toHaveLength(3);
    for (const t of file.tasks) {
      expect(t.status).toBe("pending");
      expect(t.evidence).toBeNull();
      expect(t.hash).toBeNull();
      expect(Array.isArray(t.acceptance) && t.acceptance.length > 0).toBe(true);
    }
    expect(file.tasks.map((t: { id: string }) => t.id)).toEqual(["T-001", "T-002", "T-003"]);

    const list = runCli(dir, ["tasks", "list"]);
    expect(list.status).toBe(0);
    expect(list.stdout).toContain("T-001 [pending] Replace the 'What this project is' section");
    expect(list.stdout).toContain("T-002 [pending] Follow the preset setup steps");
    expect(list.stdout).toContain("T-003 [pending] Write your first feature spec");
    expect(runCli(dir, ["tasks", "validate"]).status).toBe(0);
  });
});

describe("init: branching mode resolution (FIX 3)", () => {
  const INTEGRATION_BLOCK = [
    "branching:",
    "  mode: integration   # flip to trunk for single-branch flow",
    "  integration_branch: dev",
    "",
  ].join("\n");

  it("default init rewrites an integration-mode template to trunk everywhere", () => {
    // Simulate the template shipping in integration mode with the surface compiled.
    fs.appendFileSync(path.join(dir, "approvals.yaml"), INTEGRATION_BLOCK);
    expect(runCli(dir, ["approvals", "compile"]).status).toBe(0);
    expect(existsIn(dir, ".github/rulesets/integration-branch.json")).toBe(true);

    writePreset("tp", MINIMAL_PRESET);
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("branching mode: trunk");
    expect(res.stderr).toContain(".agentic/docs/operations.md");

    const approvals = readFileIn(dir, "approvals.yaml");
    // Targeted line edit: value rewritten, trailing comment and siblings preserved.
    expect(approvals).toContain("  mode: trunk   # flip to trunk for single-branch flow");
    expect(approvals).toContain("  integration_branch: dev");
    // Surfaces follow: integration ruleset removed, gh-pr-merge ask restored.
    expect(existsIn(dir, ".github/rulesets/integration-branch.json")).toBe(false);
    const settings = JSON.parse(readFileIn(dir, ".claude/settings.json"));
    expect(settings.permissions.ask).toContain("Bash(gh pr merge*)");
  });

  it("--branching integration appends a minimal block when absent and compiles the integration surfaces", () => {
    // Like the real template, do NOT duplicate the derived gh-pr-merge rule in
    // commands.ask — integration mode must drop it from the compiled surface.
    writeFileIn(
      dir,
      "approvals.yaml",
      ["version: 1", 'owner: "@tester"', "approvals:", "  merge_to_main: human", ""].join("\n"),
    );
    writePreset("tp", MINIMAL_PRESET);
    const res = runCli(dir, initArgs(["--branching", "integration"]));
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("branching mode: integration");
    expect(readFileIn(dir, "approvals.yaml")).toContain("branching:\n  mode: integration");
    expect(existsIn(dir, ".github/rulesets/integration-branch.json")).toBe(true);
    const settings = JSON.parse(readFileIn(dir, ".claude/settings.json"));
    expect(settings.permissions.ask).not.toContain("Bash(gh pr merge*)");
  });

  it("rejects an unknown --branching value with exit 2", () => {
    writePreset("tp", MINIMAL_PRESET);
    const res = runCli(dir, initArgs(["--branching", "gitflow"]));
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("--branching must be trunk or integration");
  });

  it("setBranchingMode leaves a block-less file untouched for trunk and is idempotent", () => {
    const text = 'version: 1\nowner: "@x"\n';
    expect(setBranchingMode(text, "trunk")).toEqual({ text, changed: false });
    const appended = setBranchingMode(text, "integration");
    expect(appended.changed).toBe(true);
    expect(setBranchingMode(appended.text, "integration").changed).toBe(false);
  });
});

describe("init: preset-shipped files (FIX 5)", () => {
  it("copies listed files only when the destination does not exist, logging copied vs skipped", () => {
    writePreset("tp", { ...MINIMAL_PRESET, files: ["tsconfig.json", "src/index.ts"] });
    writeFileIn(dir, ".agentic/presets/tp/tsconfig.json", '{ "shipped": true }\n');
    writeFileIn(dir, ".agentic/presets/tp/src/index.ts", "export const shipped = true;\n");
    writeFileIn(dir, "tsconfig.json", '{ "mine": true }\n'); // pre-existing: must survive

    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("preset file skipped (already exists): tsconfig.json");
    expect(res.stderr).toContain("preset file copied: src/index.ts");
    expect(readFileIn(dir, "tsconfig.json")).toBe('{ "mine": true }\n');
    expect(readFileIn(dir, "src/index.ts")).toBe("export const shipped = true;\n");
  });

  it("fails with a clear error when a listed file is missing from the preset directory", () => {
    writePreset("tp", { ...MINIMAL_PRESET, files: ["missing.json"] });
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('lists the file "missing.json" but .agentic/presets/tp/missing.json does not exist');
    // Nothing was copied and config was not half-applied for the file step.
    expect(existsIn(dir, "missing.json")).toBe(false);
  });

  it("rejects a files entry that escapes the repo", () => {
    writePreset("tp", { ...MINIMAL_PRESET, files: ["../evil.txt"] });
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("must be a relative path inside the repo");
  });

  it("the bundled typescript and python presets list only files that exist", () => {
    // Guard the real presets shipped by the template: every `files` entry must
    // have its physical twin under .agentic/presets/<name>/.
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
    const presetsDir = path.join(repoRoot, ".agentic", "presets");
    for (const name of ["typescript", "python"]) {
      const preset = JSON.parse(fs.readFileSync(path.join(presetsDir, `${name}.json`), "utf8"));
      expect(Array.isArray(preset.files) && preset.files.length > 0).toBe(true);
      for (const rel of preset.files) {
        expect(fs.existsSync(path.join(presetsDir, name, rel)), `.agentic/presets/${name}/${rel}`).toBe(true);
      }
      expect(preset.gates.designs).toEqual({ command: "node .agentic/harness/dist/cli.js design check", tier: "fast" });
    }
  });
});

describe("init: template residue (FIX 7)", () => {
  it("renames the root package.json only when it still carries the template name", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "package.json", '{\n  "name": "agentic-starter-repo",\n  "version": "0.1.0",\n  "private": true\n}\n');
    expect(runCli(dir, initArgs()).status).toBe(0);
    const pkg = readFileIn(dir, "package.json");
    expect(JSON.parse(pkg)).toEqual({ name: "proj", version: "0.1.0", private: true });
    // Targeted replace: formatting is untouched.
    expect(pkg).toContain('  "version": "0.1.0",\n');
  });

  it("leaves a package.json with a non-template name untouched", () => {
    writePreset("tp", MINIMAL_PRESET);
    const original = '{\n  "name": "already-mine",\n  "version": "2.0.0"\n}\n';
    writeFileIn(dir, "package.json", original);
    expect(runCli(dir, initArgs()).status).toBe(0);
    expect(readFileIn(dir, "package.json")).toBe(original);
  });

  it("--fresh removes docs/designs/*.html except TEMPLATE.html", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "docs/designs/TEMPLATE.html", "<!doctype html>template\n");
    writeFileIn(dir, "docs/designs/example-feature.html", "<!doctype html>example\n");
    writeFileIn(dir, "docs/designs/README.md", "not html\n");
    expect(runCli(dir, initArgs(["--fresh"])).status).toBe(0);
    expect(existsIn(dir, "docs/designs/TEMPLATE.html")).toBe(true);
    expect(existsIn(dir, "docs/designs/example-feature.html")).toBe(false);
    expect(existsIn(dir, "docs/designs/README.md")).toBe(true);
  });

  it("without --fresh, design docs are left alone", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "docs/designs/example-feature.html", "<!doctype html>example\n");
    expect(runCli(dir, initArgs()).status).toBe(0);
    expect(existsIn(dir, "docs/designs/example-feature.html")).toBe(true);
  });
});

describe("init: README takeover", () => {
  const TEMPLATE_README = [
    "# agentic-starter-repo",
    "",
    "A starter template for **agentic software projects**: repositories where AI",
    "coding agents do most of the implementation work.",
    "",
  ].join("\n");

  it("archives the template README to .agentic/docs/template-readme.md and writes a project stub", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "README.md", TEMPLATE_README);
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("template README archived to .agentic/docs/template-readme.md");
    expect(readFileIn(dir, ".agentic/docs/template-readme.md")).toBe(TEMPLATE_README);
    const stub = readFileIn(dir, "README.md");
    expect(stub).toContain("# proj");
    expect(stub).toContain("AGENTS.md");
    expect(stub).toContain("docs/README.md");
    expect(stub).toContain(".agentic/docs/getting-started.md");
    expect(stub).toContain("./scripts/agentic status");
  });

  it("archiving overwrites an existing .agentic/docs/template-readme.md", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, ".agentic/docs/template-readme.md", "stale copy\n");
    writeFileIn(dir, "README.md", TEMPLATE_README);
    expect(runCli(dir, initArgs()).status).toBe(0);
    expect(readFileIn(dir, ".agentic/docs/template-readme.md")).toBe(TEMPLATE_README);
  });

  it("leaves an owner-written README untouched and prints a notice", () => {
    writePreset("tp", MINIMAL_PRESET);
    const custom = "# my-real-project\n\nThe owner already wrote this.\n";
    writeFileIn(dir, "README.md", custom);
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("README.md: does not look like the template README — left untouched");
    expect(readFileIn(dir, "README.md")).toBe(custom);
    expect(existsIn(dir, ".agentic/docs/template-readme.md")).toBe(false);
  });

  it("isTemplateReadme matches the template heading or lead phrase, not owner READMEs", () => {
    expect(isTemplateReadme("# agentic-starter-repo\n\nwhatever\n")).toBe(true);
    expect(isTemplateReadme("# my-app\n\nA starter template for **agentic software projects**.\n")).toBe(true);
    expect(isTemplateReadme("# my-app\n\nAn app that manages starters and templates.\n")).toBe(false);
  });
});

describe("init: root LICENSE handling (--license)", () => {
  const MIT_TEMPLATE = "MIT License\n\nCopyright (c) {{YEAR}} {{HOLDER}}\n\nPermission is hereby granted...\n";
  const APACHE_TEMPLATE = "                                 Apache License\n                           Version 2.0, January 2004\n";

  function writeLicenseAssets(): void {
    writeFileIn(dir, ".agentic/licenses/mit.txt", MIT_TEMPLATE);
    writeFileIn(dir, ".agentic/licenses/apache-2.0.txt", APACHE_TEMPLATE);
  }

  it("default (keep) leaves an existing LICENSE untouched and prints a reminder", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "LICENSE", "MIT License\n\nCopyright (c) 2026 Template Author\n");
    const res = runCli(dir, initArgs());
    expect(res.status).toBe(0);
    expect(readFileIn(dir, "LICENSE")).toContain("Template Author");
    expect(res.stderr).toContain("LICENSE left as-is");
  });

  it("--license mit writes the templated text with holder and year and updates package.json", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeLicenseAssets();
    writeFileIn(dir, "LICENSE", "old template license\n");
    writeFileIn(dir, "package.json", '{\n  "name": "x",\n  "license": "MIT",\n  "private": true\n}\n');
    const res = runCli(dir, initArgs(["--license", "mit", "--license-holder", "Jane Q. Owner"]));
    expect(res.status).toBe(0);
    const text = readFileIn(dir, "LICENSE");
    expect(text).toContain(`Copyright (c) ${new Date().getFullYear()} Jane Q. Owner`);
    expect(text).not.toContain("{{HOLDER}}");
    expect(JSON.parse(readFileIn(dir, "package.json")).license).toBe("MIT");
  });

  it("--license apache-2.0 writes the verbatim text plus a NOTICE with the copyright line", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeLicenseAssets();
    const res = runCli(dir, initArgs(["--license", "apache-2.0", "--license-holder", "Acme Corp"]));
    expect(res.status).toBe(0);
    expect(readFileIn(dir, "LICENSE")).toContain("Apache License");
    const notice = readFileIn(dir, "NOTICE");
    expect(notice).toContain("proj");
    expect(notice).toContain(`Copyright ${new Date().getFullYear()} Acme Corp`);
  });

  it("--license proprietary removes the root LICENSE and marks package.json UNLICENSED", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "LICENSE", "MIT License\n");
    writeFileIn(dir, "package.json", '{\n  "name": "x",\n  "license": "MIT"\n}\n');
    const res = runCli(dir, initArgs(["--license", "proprietary"]));
    expect(res.status).toBe(0);
    expect(existsIn(dir, "LICENSE")).toBe(false);
    expect(JSON.parse(readFileIn(dir, "package.json")).license).toBe("UNLICENSED");
  });

  it("--license mit without --license-holder fails with a usage error when non-interactive", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeLicenseAssets();
    const res = runCli(dir, initArgs(["--license", "mit"]));
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("--license-holder");
  });

  it("rejects an unknown --license value with exit 2", () => {
    writePreset("tp", MINIMAL_PRESET);
    const res = runCli(dir, initArgs(["--license", "gpl"]));
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("--license must be one of");
  });

  it("the template ships .agentic/LICENSE and the license text assets init reads", () => {
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
    expect(fs.existsSync(path.join(repoRoot, ".agentic", "LICENSE"))).toBe(true);
    const mit = fs.readFileSync(path.join(repoRoot, ".agentic", "licenses", "mit.txt"), "utf8");
    expect(mit).toContain("{{YEAR}}");
    expect(mit).toContain("{{HOLDER}}");
    const apache = fs.readFileSync(path.join(repoRoot, ".agentic", "licenses", "apache-2.0.txt"), "utf8");
    expect(apache).toContain("Apache License");
    expect(apache).toContain("Version 2.0, January 2004");
  });

  it("missing required flags still exit 2 when no terminal is attached (wizard never runs headless)", () => {
    writePreset("tp", MINIMAL_PRESET);
    const res = runCli(dir, ["init", "--preset", "tp"]);
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("init requires --name");
  });
});

describe("init: template residue hygiene (audit fixes)", () => {
  it("resets .agents/roadmap.md to a stub", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, ".agents/roadmap.md", "# Roadmap\n\n## Template feature X — done\n");
    expect(runCli(dir, initArgs()).status).toBe(0);
    const roadmap = readFileIn(dir, ".agents/roadmap.md");
    expect(roadmap).not.toContain("Template feature X");
    expect(roadmap).toContain("no features yet");
  });

  it("rewrites the AGENTS.md 'What this project is' section when it still describes the template", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(
      dir,
      "AGENTS.md",
      "# AGENTS.md\n\n## What this project is\n\nThis is the **agentic-starter-repo template itself**: the product is the harness.\n\n## Commands\n\n- stuff\n",
    );
    expect(runCli(dir, initArgs()).status).toBe(0);
    const agents = readFileIn(dir, "AGENTS.md");
    expect(agents).not.toContain("template itself");
    expect(agents).toContain("proj — replace this section");
    expect(agents).toContain("## Commands");
  });

  it("leaves an owner-written AGENTS.md untouched", () => {
    writePreset("tp", MINIMAL_PRESET);
    const custom = "# AGENTS.md\n\n## What this project is\n\nA real product description.\n\n## Commands\n\n- stuff\n";
    writeFileIn(dir, "AGENTS.md", custom);
    expect(runCli(dir, initArgs()).status).toBe(0);
    expect(readFileIn(dir, "AGENTS.md")).toBe(custom);
  });

  it("replaces the template package.json description and retargets the harness test script to the preset", () => {
    writePreset("tp", { ...MINIMAL_PRESET, gates: { test: { command: "true", tier: "fast" } } });
    writeFileIn(
      dir,
      "package.json",
      '{\n  "name": "agentic-starter-repo",\n  "description": "Starter template for agentic software projects: stuff.",\n  "scripts": { "test": "cd .agentic/harness && npm run test" }\n}\n',
    );
    expect(runCli(dir, initArgs()).status).toBe(0);
    const pkg = JSON.parse(readFileIn(dir, "package.json"));
    expect(pkg.name).toBe("proj");
    expect(pkg.description).toBe("proj");
    expect(pkg.scripts.test).toBe("true");
  });

  it("removes the template-only instantiate-project skill", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, ".claude/skills/instantiate-project/SKILL.md", "---\nname: instantiate-project\n---\n");
    expect(runCli(dir, initArgs()).status).toBe(0);
    expect(existsIn(dir, ".claude/skills/instantiate-project")).toBe(false);
  });

  it("seeds T-004 (choose license) when license=keep and a LICENSE exists, but not on an explicit choice", () => {
    writePreset("tp", MINIMAL_PRESET);
    writeFileIn(dir, "LICENSE", "MIT License\n\nCopyright (c) 2026 Template Author\n");
    expect(runCli(dir, initArgs()).status).toBe(0);
    let tasks = JSON.parse(readFileIn(dir, ".agents/tasks.json"));
    expect(tasks.tasks.map((t: { id: string }) => t.id)).toEqual(["T-001", "T-002", "T-003", "T-004"]);

    expect(runCli(dir, initArgs(["--license", "proprietary"])).status).toBe(0);
    tasks = JSON.parse(readFileIn(dir, ".agents/tasks.json"));
    expect(tasks.tasks.map((t: { id: string }) => t.id)).toEqual(["T-001", "T-002", "T-003"]);
  });
});

describe("init: owner commit identity (setOwnerIdentity)", () => {
  const cfg = (key: string) => gitInTemp(dir, ["config", key]).stdout.trim();

  it("replaces an AI-looking identity with the owner handle and marks it autoset", () => {
    gitInTemp(dir, ["config", "user.name", "Claude"]);
    gitInTemp(dir, ["config", "user.email", "noreply@anthropic.com"]);
    setOwnerIdentity(dir, "@realowner");
    expect(cfg("user.name")).toBe("realowner");
    expect(cfg("user.email")).toBe("realowner@users.noreply.github.com");
    expect(cfg("agentic.identityAutoset")).toBe("true");
  });

  it("sets identity when it is unset", () => {
    gitInTemp(dir, ["config", "--unset", "user.name"]);
    gitInTemp(dir, ["config", "--unset", "user.email"]);
    setOwnerIdentity(dir, "@owner");
    expect(cfg("user.name")).toBe("owner");
    expect(cfg("user.email")).toBe("owner@users.noreply.github.com");
  });

  it("never clobbers a human-chosen identity (no autoset marker)", () => {
    // initGitRepo sets a human identity with no marker.
    setOwnerIdentity(dir, "@someowner");
    expect(cfg("user.name")).toBe("Harness Test");
    expect(cfg("user.email")).toBe("test@example.com");
  });

  it("re-sets a tooling-set identity to the new owner (fresh-derivative: bootstrap ran with stale owner)", () => {
    gitInTemp(dir, ["config", "user.name", "templateowner"]);
    gitInTemp(dir, ["config", "user.email", "templateowner@users.noreply.github.com"]);
    gitInTemp(dir, ["config", "agentic.identityAutoset", "true"]);
    setOwnerIdentity(dir, "@derivativeowner");
    expect(cfg("user.name")).toBe("derivativeowner");
    expect(cfg("user.email")).toBe("derivativeowner@users.noreply.github.com");
  });

  it("is a no-op when the autoset identity already matches the owner", () => {
    gitInTemp(dir, ["config", "user.name", "owner"]);
    gitInTemp(dir, ["config", "user.email", "owner@users.noreply.github.com"]);
    gitInTemp(dir, ["config", "agentic.identityAutoset", "true"]);
    setOwnerIdentity(dir, "@owner");
    expect(cfg("user.name")).toBe("owner"); // unchanged, no throw
  });
});
