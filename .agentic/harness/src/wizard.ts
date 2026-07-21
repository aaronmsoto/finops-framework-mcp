import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import type { BranchingMode } from "./config.js";
import type { InitOptions, LicenseChoice } from "./init.js";
import { LICENSE_CHOICES } from "./init.js";
import { git, logErr } from "./util.js";

/**
 * Prompt I/O seam: production uses readline over stdin/stdout; tests inject
 * a scripted implementation. `ask` returns the raw line ("" = accept default).
 */
export interface WizardIO {
  ask(question: string): Promise<string>;
  close(): void;
}

export function ttyWizardIO(): WizardIO {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: (q) => rl.question(q),
    close: () => rl.close(),
  };
}

/** The wizard only runs when a human is actually attached; agents and CI
 *  always pass flags and must hit the strict usage error instead of a hang. */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

function listPresets(rootDir: string): string[] {
  const dir = path.join(rootDir, ".agentic", "presets");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

async function askWithDefault(io: WizardIO, label: string, def: string | undefined, validate: (v: string) => string | null): Promise<string> {
  for (;;) {
    const suffix = def !== undefined && def !== "" ? ` [${def}]` : "";
    const raw = (await io.ask(`${label}${suffix}: `)).trim();
    const value = raw === "" && def !== undefined ? def : raw;
    const problem = validate(value);
    if (problem === null) return value;
    logErr(`  ${problem}`);
  }
}

/**
 * Fill in any missing init options by prompting, with sensible defaults:
 * name <- directory basename, preset <- typescript when available, owner <-
 * (required, "@" prepended if omitted), branching <- trunk, runner <- claude,
 * license <- keep, license holder <- git config user.name. Flags already
 * provided are never re-asked.
 */
export async function promptInitOptions(rootDir: string, partial: Partial<InitOptions>, io: WizardIO): Promise<InitOptions> {
  try {
    const presets = listPresets(rootDir);
    const name =
      partial.name ??
      (await askWithDefault(io, "Project name", path.basename(rootDir), (v) => (v === "" ? "a project name is required" : null)));
    const preset =
      partial.preset ??
      (await askWithDefault(io, `Preset (${presets.join(", ") || "none found"})`, presets.includes("typescript") ? "typescript" : presets[0], (v) =>
        presets.includes(v) ? null : `preset must be one of: ${presets.join(", ") || "(none available)"}`,
      ));
    let owner = partial.owner ?? (await askWithDefault(io, "Owner GitHub handle (@you)", undefined, (v) => (v === "" || v === "@" ? "an owner handle is required" : null)));
    if (!owner.startsWith("@")) owner = `@${owner}`;
    const branching =
      partial.branching ??
      ((await askWithDefault(io, "Branching mode (trunk|integration)", "trunk", (v) =>
        v === "trunk" || v === "integration" ? null : "must be trunk or integration",
      )) as BranchingMode);
    const runner =
      partial.runner ??
      (await askWithDefault(io, "Default loop runner (claude|copilot)", "claude", (v) => (v === "claude" || v === "copilot" ? null : "must be claude or copilot")));
    const license =
      partial.license ??
      ((await askWithDefault(io, `Root LICENSE (${LICENSE_CHOICES.join("|")})`, "keep", (v) =>
        (LICENSE_CHOICES as readonly string[]).includes(v) ? null : `must be one of: ${LICENSE_CHOICES.join(", ")}`,
      )) as LicenseChoice);
    let licenseHolder = partial.licenseHolder;
    if (licenseHolder === undefined && (license === "mit" || license === "apache-2.0")) {
      const gitName = git(rootDir, ["config", "user.name"]);
      licenseHolder = await askWithDefault(io, "Copyright holder (legal name for the LICENSE)", gitName.ok ? gitName.stdout.trim() : undefined, (v) =>
        v === "" ? "a copyright holder is required for this license" : null,
      );
    }
    return {
      name,
      preset,
      owner,
      runner,
      branching,
      license,
      ...(licenseHolder !== undefined ? { licenseHolder } : {}),
      fresh: partial.fresh ?? false,
    };
  } finally {
    io.close();
  }
}
