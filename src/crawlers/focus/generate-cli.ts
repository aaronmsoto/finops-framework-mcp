import { writeFileSync } from "node:fs";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { loadFocusStore } from "../../shared/focus/artifact.js";
import { generateFocusCsv } from "../../shared/focus/synthetic.js";

export interface GenerateCliOptions {
  dataDir: string;
  version: string;
  rows: number;
  seed: number;
  outPath?: string;
  log: (msg: string) => void;
}

/**
 * Generates a deterministic, spec-conformant synthetic FOCUS CSV for one
 * version (T-032). Same (version, rows, seed) always yields byte-identical
 * output. Returns 0 on success, 1 for an unknown version.
 */
export function runGenerate(opts: GenerateCliOptions): number {
  const store = loadFocusStore(opts.dataDir);
  const artifact = store.versions.get(opts.version);
  if (!artifact) {
    const known = [...store.versions.keys()].join(", ");
    opts.log(`unknown version "${opts.version}" (known: ${known})`);
    return 1;
  }

  const csv = generateFocusCsv(artifact.columns, {
    rows: opts.rows,
    seed: opts.seed,
  });

  if (opts.outPath) {
    writeFileSync(opts.outPath, csv);
    opts.log(
      `wrote ${opts.outPath} (${opts.rows} rows, ${artifact.columns.length} columns, FOCUS ${opts.version}, seed ${opts.seed})`,
    );
  } else {
    process.stdout.write(csv);
  }
  return 0;
}

function main(): void {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg.startsWith("--")) {
      options[arg.slice(2)] = args[++i] ?? "";
    }
  }
  const code = runGenerate({
    dataDir: options["data-dir"] ?? "data/focus",
    version: options.version ?? "1.2",
    rows: Number(options.rows ?? "100"),
    seed: Number(options.seed ?? "42"),
    outPath: options.out,
    log: (m) => console.error(m),
  });
  process.exit(code);
}

if (isDirectRunOf(import.meta.url)) {
  main();
}
