import fs from "node:fs";
import path from "node:path";
import { compileApprovals } from "./approvals.js";
import { loadApprovals, validateAgenticConfig, type AgenticConfig, type BranchingMode } from "./config.js";
import { journalDirPath, legacyJournalPath } from "./journal.js";
import { GENESIS, tasksPath, type TasksFile } from "./tasks.js";
import { CliError, UsageError, ensureDir, git, logErr, readTextIfExists } from "./util.js";

export const LICENSE_CHOICES = ["mit", "apache-2.0", "proprietary", "keep"] as const;
export type LicenseChoice = (typeof LICENSE_CHOICES)[number];

export interface InitOptions {
  name: string;
  preset: string;
  owner: string;
  runner?: string;
  fresh?: boolean;
  /** Branching mode written into approvals.yaml (default trunk). */
  branching?: BranchingMode;
  /** Root LICENSE handling (default keep: leave untouched, print a reminder). */
  license?: LicenseChoice;
  /** Copyright holder written into a new LICENSE (required for mit/apache-2.0). */
  licenseHolder?: string;
}

export interface InitResult {
  /** The preset's human setup steps, echoed into the next-steps output. */
  setup: string[];
}

// ---------------------------------------------------------------------------
// Fresh-state templates. Embedded as constants so `agentic init` never
// depends on other template files being present in the clone.
// ---------------------------------------------------------------------------

const MEMORY_TEMPLATE = (name: string): string => `# MEMORY.md — core memory for ${name}

<!-- Always-loaded core memory. Keep within memory.coreBudgetLines (see
     agentic.config.json). Facts, invariants, current phase — move detail to
     decisions.md / patterns.md. Curated via the update-memory skill. -->

## Project

- Name: ${name}
- Phase: freshly initialized from agentic-starter-repo

## Invariants

- (record hard facts agents must never violate)

## Current focus

- (what the project is working toward right now)
`;

const DECISIONS_TEMPLATE = `# decisions.md — append-only decision log

<!-- One entry per decision that had real alternatives. Never rewrite. -->

<!-- Template:
## YYYY-MM-DD — <decision>
- Why:
- Alternatives considered:
-->
`;

const PATTERNS_TEMPLATE = `# patterns.md — codebase conventions

<!-- Conventions agents must follow when writing code here. Keep it short
     and concrete; link files instead of pasting them. -->

- (add conventions as they emerge)
`;

const ACTIVE_CONTEXT_TEMPLATE = `# activeContext.md — session handoff

<!-- The handoff file: what's in flight, next steps, open questions.
     Update before ending any session (handoff skill). memory lint warns
     when this file goes stale while commits continue. -->

## In flight

- Nothing yet — project just initialized.

## Next steps

- Add the first tasks: \`./scripts/agentic tasks add --title "..." --acceptance "..."\`

## Open questions

- (none)
`;

const JOURNAL_README_TEMPLATE = `# .agents/journal/ — per-session progress journal

One file per session or loop run: \`YYYYMMDD-<slug>.md\` (local date prefix,
kebab-case slug, e.g. \`20260714-fix-login-flow.md\`). A session appends only
to its OWN file — never edit another session's file. Rationale: one shared
append-file constantly merge-conflicts between parallel agents; one file per
actor is conflict-free.

- This README is reserved for the convention doc and is never a journal entry.
- Entry format inside a file: \`## <title> — <ISO timestamp>\` sections with
  bullets covering did / result / next.
- Entries are append-only history; never rewrite them.
`;

const ROADMAP_TEMPLATE = `# Roadmap — product intent

<!--
  The owner's prioritized feature backlog: the tier ABOVE specs and tasks.
  One entry per feature, newest thinking wins, ordered by priority.

  Entry format:
    ## <feature title>  —  <status>
    One paragraph: what and why. Links to design/spec once they exist.

  Statuses: idea → designing → specced → building → done (or dropped).
  Flow: idea lands here → /design-feature produces docs/designs/<slug>.html
  + .agents/specs/<slug>.md and sets "designing" → owner approves the design
  (the human checkpoint) → /plan-feature decomposes the spec into tasks.json
  and sets "building" → loop completes the tasks → "done".
-->

(no features yet — the owner adds the first entry)
`;

const APPROVALS_TEMPLATE = (owner: string): string => `# Owner policy: where humans are required. Edit THIS file, then run
# \`./scripts/agentic approvals compile\` — never edit the generated surfaces
# (.claude/settings.json permissions, scripts/copilot.sh, .github/CODEOWNERS,
# .github/rulesets/main-branch.json) by hand.
version: 1
owner: "${owner}"
approvals:
  merge_to_main: human
  deploy_production: human
  release: human
  force_push: never
protected_paths:
  - "tests/**"
  - ".agentic/harness/tests/**"
  - ".github/workflows/**"
  - "approvals.yaml"
  - "agentic.config.json"
  - ".claude/settings.json"
commands:
  ask:
    - "Bash(git push origin main*)"
    - "Bash(gh pr merge*)"
    - "Bash(npm publish*)"
  deny:
    - "Bash(git push --force*)"
    - "Bash(git push -f*)"
loop:
  max_iterations: 10
  max_wall_minutes: 120
  max_consecutive_failures: 3
`;

/**
 * Does the root README still belong to the template (vs. an owner-written
 * one)? Matches the template's own first heading ("# agentic-starter-repo")
 * or its lead phrase ("starter template for agentic ..." — tolerating
 * markdown emphasis markers around "agentic").
 */
export function isTemplateReadme(text: string): boolean {
  const heading = text.split(/\r?\n/).find((l) => /^#\s/.test(l));
  if (heading !== undefined && heading.includes("agentic-starter-repo")) return true;
  return /starter template for\s+[*_]{0,2}agentic/i.test(text);
}

const README_STUB = (name: string): string => `# ${name}

Describe ${name} here: what it does, who it is for, and how to run it. This
stub was written by \`agentic init\`; the template's original README was
archived to \`.agentic/docs/template-readme.md\`.

## Quickstart

- Agent instructions: [AGENTS.md](AGENTS.md)
- Project docs: [docs/README.md](docs/README.md)
- Harness walkthrough: [.agentic/docs/getting-started.md](.agentic/docs/getting-started.md)
- Status overview: \`./scripts/agentic status\`
`;

interface PresetFile {
  gates?: Record<string, unknown>;
  project?: { srcDirs?: unknown; testGlobs?: unknown };
  setup?: unknown;
  files?: unknown;
}

/**
 * Onboarding tasks seeded by every init: a fresh adopter's first `tasks list`
 * shows the path from template to working project instead of an empty board.
 */
const LICENSE_TASK = {
  id: "T-004",
  title: "Choose the project's root LICENSE (it still carries the template author's copyright)",
  acceptance: [
    "Root LICENSE reflects this project's owner and chosen license, or was deliberately removed",
    "Rerun ./scripts/agentic init with --license mit|apache-2.0|proprietary (+ --license-holder), or edit LICENSE by hand",
  ],
  status: "pending" as const,
  evidence: null,
  hash: null,
};

const onboardingTasksFile = (includeLicenseTask: boolean): TasksFile => ({
  version: 1,
  chainHead: GENESIS,
  tasks: [
    {
      id: "T-001",
      title: "Replace the 'What this project is' section in AGENTS.md and MEMORY.md with your project",
      acceptance: [
        "AGENTS.md 'What this project is' and .agents/memory/MEMORY.md describe the real project, not the template",
        "./scripts/agentic memory lint passes",
      ],
      status: "pending",
      evidence: null,
      hash: null,
    },
    {
      id: "T-002",
      title: "Follow the preset setup steps until ./scripts/agentic gates is green",
      acceptance: ["./scripts/agentic gates --tier fast exits 0"],
      status: "pending",
      evidence: null,
      hash: null,
    },
    {
      id: "T-003",
      title: "Write your first feature spec from .agents/specs/TEMPLATE.md and decompose it with plan-feature",
      acceptance: [
        "A spec file exists under .agents/specs/",
        ".agents/tasks.json contains the tasks decomposed from the spec",
      ],
      status: "pending",
      evidence: null,
      hash: null,
    },
    ...(includeLicenseTask ? [LICENSE_TASK] : []),
  ],
});

/**
 * Targeted line edit of the `mode:` line inside the `branching:` block of
 * approvals.yaml, preserving surrounding comments (including a trailing
 * comment on the mode line itself). Rules:
 * - no branching block + trunk requested  -> leave the file untouched (trunk
 *   is the validator default);
 * - no branching block + integration      -> append a minimal block;
 * - block present                          -> rewrite (or insert) the mode line.
 */
export function setBranchingMode(text: string, mode: BranchingMode): { text: string; changed: boolean } {
  const lines = text.split("\n");
  const blockStart = lines.findIndex((l) => /^branching:\s*(#.*)?$/.test(l));
  if (blockStart === -1) {
    if (mode === "trunk") return { text, changed: false };
    const suffix = text.endsWith("\n") || text === "" ? "" : "\n";
    return { text: `${text}${suffix}branching:\n  mode: integration\n`, changed: true };
  }
  // The block runs until the next top-level (non-indented, non-comment) line.
  let blockEnd = lines.length;
  for (let i = blockStart + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() !== "" && !line.startsWith(" ") && !line.startsWith("\t") && !line.trimStart().startsWith("#")) {
      blockEnd = i;
      break;
    }
  }
  for (let i = blockStart + 1; i < blockEnd; i++) {
    const m = /^(\s+mode:\s*)\S+(\s*(?:#.*)?)$/.exec(lines[i]!);
    if (m) {
      if (lines[i] === `${m[1]}${mode}${m[2]}`) return { text, changed: false };
      lines[i] = `${m[1]}${mode}${m[2]}`;
      return { text: lines.join("\n"), changed: true };
    }
  }
  lines.splice(blockStart + 1, 0, `  mode: ${mode}`);
  return { text: lines.join("\n"), changed: true };
}

/** Targeted edit of package.json's "license" field; skips (with a log) when
 *  the file or field is absent rather than restructuring the file. */
function setPackageLicense(rootDir: string, spdx: string): void {
  const pkgPath = path.join(rootDir, "package.json");
  const pkgText = readTextIfExists(pkgPath);
  if (pkgText === null) return;
  if (/"license"\s*:\s*"[^"]*"/.test(pkgText)) {
    fs.writeFileSync(pkgPath, pkgText.replace(/("license"\s*:\s*)"[^"]*"/, `$1${JSON.stringify(spdx)}`));
    logErr(`[init] package.json: license -> ${JSON.stringify(spdx)}`);
  } else {
    logErr(`[init] package.json has no "license" field — set it to ${JSON.stringify(spdx)} yourself if you publish`);
  }
}

/**
 * Apply the root-LICENSE choice. `keep` (the default) never touches the file:
 * silently rewriting or deleting a license is not a call the harness makes on
 * its own. mit/apache-2.0 write the text from .agentic/licenses/ with the
 * given holder; proprietary removes the root LICENSE and marks package.json
 * UNLICENSED. The template's own notice at .agentic/LICENSE is never touched.
 */
export function applyLicenseChoice(rootDir: string, opts: InitOptions): void {
  const choice: LicenseChoice = opts.license ?? "keep";
  const licensePath = path.join(rootDir, "LICENSE");
  if (choice === "keep") {
    if (fs.existsSync(licensePath)) {
      logErr(
        "[init] LICENSE left as-is — it may still name the template author. Rerun with --license mit|apache-2.0|proprietary (plus --license-holder) or edit it; the template machinery stays covered by .agentic/LICENSE either way.",
      );
    }
    return;
  }
  if (choice === "proprietary") {
    if (fs.existsSync(licensePath)) {
      fs.rmSync(licensePath, { force: true });
      logErr("[init] LICENSE removed (proprietary) — no open license is granted for this project");
    }
    setPackageLicense(rootDir, "UNLICENSED");
    return;
  }
  // mit | apache-2.0 — text ships in .agentic/licenses/, holder is required.
  const holder = opts.licenseHolder?.trim() ?? "";
  if (holder === "") throw new UsageError(`--license ${choice} requires --license-holder "<legal name>".`);
  const textPath = path.join(rootDir, ".agentic", "licenses", `${choice}.txt`);
  const text = readTextIfExists(textPath);
  if (text === null) throw new CliError(`.agentic/licenses/${choice}.txt is missing — cannot write the LICENSE`);
  const year = String(new Date().getFullYear());
  if (choice === "mit") {
    fs.writeFileSync(licensePath, text.replaceAll("{{YEAR}}", year).replaceAll("{{HOLDER}}", holder));
    setPackageLicense(rootDir, "MIT");
    logErr(`[init] LICENSE: MIT, Copyright (c) ${year} ${holder}`);
  } else {
    fs.writeFileSync(licensePath, text);
    fs.writeFileSync(path.join(rootDir, "NOTICE"), `${opts.name}\nCopyright ${year} ${holder}\n`);
    setPackageLicense(rootDir, "Apache-2.0");
    logErr(`[init] LICENSE: Apache-2.0 (verbatim text); NOTICE written with Copyright ${year} ${holder}`);
  }
}

/**
 * Adapt the template for a new project: apply the preset's gate bindings,
 * set the owner in approvals.yaml, reset memory/tasks/journal to fresh
 * templates, and recompile the approval surfaces. Does NOT run npm or
 * bootstrap — run ./scripts/bootstrap.sh afterwards.
 */
export async function runInit(rootDir: string, opts: InitOptions): Promise<InitResult> {
  // 1. Load the preset.
  const presetsDir = path.join(rootDir, ".agentic", "presets");
  const presetPath = path.join(presetsDir, `${opts.preset}.json`);
  if (!fs.existsSync(presetPath)) {
    const available = fs.existsSync(presetsDir)
      ? fs
          .readdirSync(presetsDir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(/\.json$/, ""))
          .join(", ") || "(none)"
      : "(.agentic/presets/ directory is missing)";
    throw new UsageError(`preset "${opts.preset}" not found at .agentic/presets/${opts.preset}.json — available presets: ${available}`);
  }
  let preset: PresetFile;
  try {
    preset = JSON.parse(fs.readFileSync(presetPath, "utf8")) as PresetFile;
  } catch (err) {
    throw new CliError(`.agentic/presets/${opts.preset}.json: invalid JSON — ${(err as Error).message}`);
  }
  let setup: string[] = [];
  if (preset.setup !== undefined) {
    if (!Array.isArray(preset.setup) || !preset.setup.every((s) => typeof s === "string")) {
      throw new CliError(`.agentic/presets/${opts.preset}.json: "setup" must be an array of strings`);
    }
    setup = preset.setup;
  }
  // Preset-shipped files: validate the whole list before touching anything.
  let presetFiles: string[] = [];
  if (preset.files !== undefined) {
    if (!Array.isArray(preset.files) || !preset.files.every((f) => typeof f === "string" && f.trim() !== "")) {
      throw new CliError(`.agentic/presets/${opts.preset}.json: "files" must be an array of non-empty relative paths`);
    }
    presetFiles = preset.files;
  }
  const presetDir = path.join(presetsDir, opts.preset);
  for (const rel of presetFiles) {
    if (path.isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) {
      throw new CliError(`.agentic/presets/${opts.preset}.json: "files" entry "${rel}" must be a relative path inside the repo`);
    }
    if (!fs.existsSync(path.join(presetDir, rel))) {
      throw new CliError(
        `.agentic/presets/${opts.preset}.json lists the file "${rel}" but .agentic/presets/${opts.preset}/${rel} does not exist — fix the preset before running init`,
      );
    }
  }

  // 2. Apply preset onto agentic.config.json (gates + preset + project.name).
  const configPath = path.join(rootDir, "agentic.config.json");
  const configText = readTextIfExists(configPath);
  let rawConfig: Record<string, unknown> = {};
  if (configText !== null) {
    try {
      rawConfig = JSON.parse(configText) as Record<string, unknown>;
    } catch (err) {
      throw new CliError(`agentic.config.json: invalid JSON — ${(err as Error).message}`);
    }
  }
  rawConfig.preset = opts.preset;
  const project = (rawConfig.project as Record<string, unknown> | undefined) ?? {};
  project.name = opts.name;
  if (preset.project?.srcDirs !== undefined) project.srcDirs = preset.project.srcDirs;
  if (preset.project?.testGlobs !== undefined) project.testGlobs = preset.project.testGlobs;
  rawConfig.project = project;
  if (preset.gates !== undefined) rawConfig.gates = preset.gates;
  const loop = (rawConfig.loop as Record<string, unknown> | undefined) ?? {};
  if (opts.runner !== undefined) loop.runner = opts.runner;
  rawConfig.loop = loop;
  const validated: AgenticConfig = validateAgenticConfig(rawConfig); // fail fast with a clear message before writing
  fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 2) + "\n");
  logErr(`[init] agentic.config.json: preset=${opts.preset}, project.name=${opts.name}, ${Object.keys(validated.gates).length} gates bound`);

  // 2b. Copy preset-shipped files (never overwrite an existing file).
  for (const rel of presetFiles) {
    const dest = path.join(rootDir, rel);
    if (fs.existsSync(dest)) {
      logErr(`[init] preset file skipped (already exists): ${rel}`);
      continue;
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(path.join(presetDir, rel), dest);
    logErr(`[init] preset file copied: ${rel}`);
  }

  // 3. Set the owner in approvals.yaml (targeted line edit to keep comments).
  const approvalsFile = path.join(rootDir, "approvals.yaml");
  const approvalsText = readTextIfExists(approvalsFile);
  if (approvalsText === null) {
    fs.writeFileSync(approvalsFile, APPROVALS_TEMPLATE(opts.owner));
    logErr("[init] approvals.yaml: created from the default template");
  } else if (/^owner:.*$/m.test(approvalsText)) {
    fs.writeFileSync(approvalsFile, approvalsText.replace(/^owner:.*$/m, `owner: "${opts.owner}"`));
    logErr(`[init] approvals.yaml: owner set to ${opts.owner}`);
  } else {
    fs.writeFileSync(approvalsFile, approvalsText.replace(/^version:.*$/m, (line) => `${line}\nowner: "${opts.owner}"`));
    logErr(`[init] approvals.yaml: owner line added (${opts.owner})`);
  }

  // 3b. Resolve the branching mode (default trunk). The compile in step 6
  // then regenerates every surface for the chosen mode — including removing
  // or creating .github/rulesets/integration-branch.json.
  const branchingMode: BranchingMode = opts.branching ?? "trunk";
  const branchingResult = setBranchingMode(fs.readFileSync(approvalsFile, "utf8"), branchingMode);
  if (branchingResult.changed) fs.writeFileSync(approvalsFile, branchingResult.text);
  logErr(
    `[init] branching mode: ${branchingMode} (approvals.yaml branching.mode) — to switch later, edit approvals.yaml and run ./scripts/agentic approvals compile; see .agentic/docs/operations.md ("Branching").`,
  );

  // 4. Reset agent state to fresh templates.
  const memDir = path.join(rootDir, validated.memory.dir);
  ensureDir(memDir);
  fs.writeFileSync(path.join(memDir, "MEMORY.md"), MEMORY_TEMPLATE(opts.name));
  fs.writeFileSync(path.join(memDir, "decisions.md"), DECISIONS_TEMPLATE);
  fs.writeFileSync(path.join(memDir, "patterns.md"), PATTERNS_TEMPLATE);
  fs.writeFileSync(path.join(memDir, "activeContext.md"), ACTIVE_CONTEXT_TEMPLATE);
  // Roadmap: the template's backlog is not the derivative's product intent.
  fs.writeFileSync(path.join(rootDir, ".agents", "roadmap.md"), ROADMAP_TEMPLATE);
  // Seed the license onboarding task only when the owner has not made an
  // explicit --license choice and the template's LICENSE is still in place.
  const includeLicenseTask = (opts.license ?? "keep") === "keep" && fs.existsSync(path.join(rootDir, "LICENSE"));
  ensureDir(path.dirname(tasksPath(rootDir)));
  fs.writeFileSync(tasksPath(rootDir), JSON.stringify(onboardingTasksFile(includeLicenseTask), null, 2) + "\n");
  // Journal: fresh directory layout with only the convention README. Clear the
  // legacy single-file journal and any old per-session entries.
  fs.rmSync(legacyJournalPath(rootDir), { force: true });
  const journalDir = journalDirPath(rootDir);
  ensureDir(journalDir);
  for (const entry of fs.readdirSync(journalDir)) {
    if (entry !== "README.md" && entry.endsWith(".md")) fs.rmSync(path.join(journalDir, entry), { force: true });
  }
  fs.writeFileSync(path.join(journalDir, "README.md"), JOURNAL_README_TEMPLATE);
  logErr(
    `[init] reset ${validated.memory.dir}/*, .agents/roadmap.md, .agents/journal/ to fresh templates; seeded ${includeLicenseTask ? 4 : 3} onboarding tasks in .agents/tasks.json`,
  );

  // 5. --fresh: clear example specs (keep README.md and TEMPLATE.md) and
  // example design docs (keep TEMPLATE.html).
  if (opts.fresh) {
    const specsDir = path.join(rootDir, ".agents", "specs");
    if (fs.existsSync(specsDir)) {
      for (const entry of fs.readdirSync(specsDir)) {
        if (entry === "README.md" || entry === "TEMPLATE.md") continue;
        fs.rmSync(path.join(specsDir, entry), { recursive: true, force: true });
        logErr(`[init] --fresh: removed .agents/specs/${entry}`);
      }
    }
    const designsDir = path.join(rootDir, validated.designs.dir);
    if (fs.existsSync(designsDir)) {
      for (const entry of fs.readdirSync(designsDir)) {
        if (entry === "TEMPLATE.html" || !entry.endsWith(".html")) continue;
        fs.rmSync(path.join(designsDir, entry), { force: true });
        logErr(`[init] --fresh: removed ${validated.designs.dir}/${entry}`);
      }
    }
  }

  // 5b. Template residue: rename the root package.json when it still carries
  // the template's name (targeted replace so formatting/fields are untouched).
  const pkgPath = path.join(rootDir, "package.json");
  const pkgText = readTextIfExists(pkgPath);
  if (pkgText !== null) {
    try {
      const pkg = JSON.parse(pkgText) as Record<string, unknown>;
      let updated = pkgText;
      const changes: string[] = [];
      if (pkg.name === "agentic-starter-repo") {
        updated = updated.replace(/("name"\s*:\s*)"agentic-starter-repo"/, `$1${JSON.stringify(opts.name)}`);
        changes.push(`name -> ${JSON.stringify(opts.name)}`);
      }
      if (typeof pkg.description === "string" && /starter template for\s+[*_]{0,2}agentic/i.test(pkg.description)) {
        updated = updated.replace(/("description"\s*:\s*)"[^"]*"/, `$1${JSON.stringify(opts.name)}`);
        changes.push("description -> project stub");
      }
      const scripts = pkg.scripts as Record<string, unknown> | undefined;
      const presetTest = (preset.gates as Record<string, { command?: unknown }> | undefined)?.test?.command;
      if (scripts?.test === "cd .agentic/harness && npm run test" && typeof presetTest === "string") {
        updated = updated.replace(/("test"\s*:\s*)"cd \.agentic\/harness && npm run test"/, `$1${JSON.stringify(presetTest)}`);
        changes.push('scripts.test -> preset test command (was the template harness suite)');
      }
      if (changes.length > 0) {
        fs.writeFileSync(pkgPath, updated);
        logErr(`[init] package.json: ${changes.join("; ")}`);
      }
    } catch {
      logErr("[init] warning: package.json is not valid JSON — left unchanged");
    }
  }

  // 5b-2. AGENTS.md identity: agents orient on "What this project is" every
  // session — a derivative must not describe itself as the template. Replace
  // only that section's body; the owner rewrites it properly via T-001.
  const agentsPath = path.join(rootDir, "AGENTS.md");
  const agentsText = readTextIfExists(agentsPath);
  if (agentsText !== null && /template itself/i.test(agentsText)) {
    const rewritten = agentsText.replace(
      /(## What this project is\r?\n)([\s\S]*?)(?=\r?\n## )/,
      `$1\n${opts.name} — replace this section (3-6 lines): what the project does,\nwho it is for, how to run it. Agents read this every session; until it is\nreal, they orient on a placeholder. (Seeded as onboarding task T-001.)\n`,
    );
    if (rewritten !== agentsText) {
      fs.writeFileSync(agentsPath, rewritten);
      logErr('[init] AGENTS.md: "What this project is" reset to a project stub (T-001 completes it)');
    }
  }

  // 5b-3. The instantiate-project skill is template-only machinery: in a
  // derivative it could misfire and start templating the derivative itself.
  const instantiateSkill = path.join(rootDir, ".claude", "skills", "instantiate-project");
  if (fs.existsSync(instantiateSkill)) {
    fs.rmSync(instantiateSkill, { recursive: true, force: true });
    logErr("[init] removed .claude/skills/instantiate-project (template-only skill)");
  }

  // 5c. README takeover: archive the template's README and write a project
  // stub — but never touch a README the owner already wrote.
  const readmePath = path.join(rootDir, "README.md");
  const readmeText = readTextIfExists(readmePath);
  if (readmeText !== null) {
    if (isTemplateReadme(readmeText)) {
      const archiveDir = path.join(rootDir, ".agentic", "docs");
      ensureDir(archiveDir);
      fs.writeFileSync(path.join(archiveDir, "template-readme.md"), readmeText); // overwrite-safe
      fs.writeFileSync(readmePath, README_STUB(opts.name));
      logErr("[init] README.md: template README archived to .agentic/docs/template-readme.md; project stub written");
    } else {
      logErr("[init] README.md: does not look like the template README — left untouched");
    }
  }

  // 5d. Root LICENSE: the template's own MIT notice stays at .agentic/LICENSE
  // (it covers the machinery included in every derivative); the root LICENSE
  // belongs to the new project and is only ever changed on explicit request.
  applyLicenseChoice(rootDir, opts);

  // 6. Compile the approval enforcement surfaces.
  const policy = loadApprovals(rootDir);
  const written = compileApprovals(rootDir, policy);
  logErr(`[init] approvals compiled: ${written.join(", ")}`);

  // 7. Install git hooks when the repo ships them (bootstrap.sh also does this).
  const hooksDir = path.join(rootDir, "scripts", "git-hooks");
  const isGitRepo = git(rootDir, ["rev-parse", "--git-dir"]).ok;
  if (fs.existsSync(hooksDir) && isGitRepo) {
    const res = git(rootDir, ["config", "core.hooksPath", "scripts/git-hooks"]);
    logErr(res.ok ? "[init] git hooks installed (core.hooksPath -> scripts/git-hooks)" : `[init] warning: could not set core.hooksPath: ${res.stderr.trim()}`);
  } else {
    logErr("[init] git hooks not installed (scripts/git-hooks missing or not a git repo) — ./scripts/bootstrap.sh will install them");
  }

  // 8. Commit identity: the agent must not author commits as an AI (feeds
  // GitHub's squash co-author trailers, which the integrity gate rejects).
  // Set it to the OWNER authoritatively when unset/AI-looking or when a value
  // THIS tooling set earlier no longer matches the owner (the fresh-derivative
  // case, where bootstrap ran with the template's stale owner). Never clobber
  // a human-chosen identity (no agentic.identityAutoset marker).
  if (isGitRepo) setOwnerIdentity(rootDir, opts.owner);

  return { setup };
}

/** AI-tool identity substrings — an author matching any of these must not
 *  reach git history (squash-message co-author synthesis + integrity gate). */
const AI_IDENTITY_RE = /\b(claude|copilot|anthropic|openai|gemini|cursor|aider|devin|bot)\b/i;

/**
 * Point git user.name/user.email at the repo owner when the current identity
 * is unset, AI-looking, or a prior tooling-set value that no longer matches
 * the owner. A human-chosen identity (no `agentic.identityAutoset` marker) is
 * left untouched. Derives an identity from the `@handle`: name = handle,
 * email = handle@users.noreply.github.com (override for real commit-linking).
 */
export function setOwnerIdentity(rootDir: string, owner: string): void {
  const handle = owner.replace(/^@/, "").trim();
  if (handle === "") return;
  const curName = git(rootDir, ["config", "user.name"]).stdout.trim();
  const curEmail = git(rootDir, ["config", "user.email"]).stdout.trim();
  const autoset = git(rootDir, ["config", "agentic.identityAutoset"]).stdout.trim() === "true";
  const needsFix =
    curName === "" ||
    curEmail === "" ||
    AI_IDENTITY_RE.test(`${curName} ${curEmail}`) ||
    (autoset && curName !== handle);
  if (!needsFix) return;
  const email = `${handle}@users.noreply.github.com`;
  const ok =
    git(rootDir, ["config", "user.name", handle]).ok &&
    git(rootDir, ["config", "user.email", email]).ok &&
    git(rootDir, ["config", "agentic.identityAutoset", "true"]).ok;
  logErr(
    ok
      ? `[init] git identity set to ${handle} <${email}> (owner; override with git config user.name / user.email for real commit-linking)`
      : "[init] warning: could not set git identity — configure user.name/user.email yourself",
  );
}

export function initNextSteps(opts: InitOptions, setup: string[] = []): string {
  const lines = [`Initialized "${opts.name}" (preset: ${opts.preset}, owner: ${opts.owner}).`];
  if (setup.length > 0) {
    lines.push("", "Preset setup — do these now:");
    setup.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }
  lines.push(
    "",
    "Next steps:",
    '  1. Edit AGENTS.md — replace the "What this project is" section',
    "  2. Follow the preset setup block above",
    "  3. ./scripts/agentic gates                # re-run until green",
    "  4. Review approvals.yaml, then: ./scripts/agentic approvals check",
    "  5. ./scripts/agentic tasks list           # seeded onboarding tasks",
    "  6. Apply GitHub repo settings: ./scripts/github-setup.sh (needs gh CLI) — or import .github/rulesets/ manually; see .agentic/docs/getting-started.md",
  );
  return lines.join("\n");
}
