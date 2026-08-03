import { readFileSync } from "node:fs";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { loadFocusStore } from "../../shared/focus/artifact.js";
import { validateFocusCsv } from "../../shared/focus/validate.js";

export interface ValidateCliOptions {
  dataDir: string;
  version: string;
  csvPath: string;
  log: (msg: string) => void;
}

/**
 * Validates a FOCUS billing CSV against one spec version's column
 * definitions (T-031). Exit code 0 with zero errors (warnings are printed
 * but non-fatal — spec "Ingestion rules"); exit code 1 otherwise.
 */
export function runValidate(opts: ValidateCliOptions): number {
  const store = loadFocusStore(opts.dataDir);
  const artifact = store.versions.get(opts.version);
  if (!artifact) {
    const known = [...store.versions.keys()].join(", ");
    opts.log(`unknown version "${opts.version}" (known: ${known})`);
    return 1;
  }

  const csvText = readFileSync(opts.csvPath, "utf8");
  const result = validateFocusCsv(artifact.columns, csvText);

  for (const e of result.errors) {
    opts.log(`ERROR row ${e.row} [${e.column}]: ${e.message}`);
  }
  for (const w of result.warnings) {
    opts.log(`WARN  row ${w.row} [${w.column}]: ${w.message}`);
  }
  opts.log(
    `${opts.csvPath}: ${result.rowCount} rows, ${result.columnCount} columns, ` +
      `${result.errors.length} errors, ${result.warnings.length} warnings ` +
      `(FOCUS ${opts.version})`,
  );
  return result.errors.length > 0 ? 1 : 0;
}

function main(): void {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg.startsWith("--")) {
      options[arg.slice(2)] = args[++i] ?? "";
    } else {
      positional.push(arg);
    }
  }
  const csvPath = positional[0];
  if (!csvPath) {
    console.error(
      "usage: validate-cli.js <file.csv> [--version 1.2] [--data-dir data/focus]",
    );
    process.exit(2);
  }
  const code = runValidate({
    dataDir: options["data-dir"] ?? "data/focus",
    version: options.version ?? "1.2",
    csvPath,
    log: (m) => console.error(m),
  });
  process.exit(code);
}

if (isDirectRunOf(import.meta.url)) {
  main();
}
