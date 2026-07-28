#!/usr/bin/env node
// (Re)generates the committed synthetic FOCUS CSV fixtures — one per spec
// version — via the deterministic seeded generator (T-032,
// src/shared/focus/synthetic.ts). Unlike fetch-official-sample.mjs there is
// no network fetch: the same (version, rows, seed) always reproduces the
// exact same bytes, so this script is safe to re-run any time the generator
// or a version's columns.json changes. Requires a prior `npm run build`
// (imports the compiled dist/ modules, matching the "refresh" script
// convention in package.json).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadFocusStore } from "../dist/shared/focus/artifact.js";
import { generateFocusCsv } from "../dist/shared/focus/synthetic.js";

const SEED = 42;
const ROWS = 60;
const DATA_DIR = join(import.meta.dirname, "../data/focus");
const OUT_ROOT = join(
  import.meta.dirname,
  "../src/crawlers/focus/fixtures/samples/synthetic",
);

const NOTICE = (version, rows, seed, columnCount) => `# NOTICE — synthetic FOCUS ${version} sample data

**This file is SYNTHETIC. It is not real billing data and was not published
by the FOCUS Open Cost and Usage Specification project.**

Generated deterministically by \`scripts/generate-focus-synthetic-samples.mjs\`
via the seeded generator in \`src/shared/focus/synthetic.ts\` (T-032): seed
${seed}, ${rows} rows, ${columnCount} columns matching FOCUS ${version}'s
\`data/focus/${version}/columns.json\` column list exactly. Re-running the
generator with the same seed reproduces this file byte-for-byte.

Committed as a conformance test fixture for
\`src/shared/focus/validate.ts\` (validates with 0 errors against FOCUS
${version}) — see \`src/shared/focus/synthetic.test.ts\`. For the official
1,000-row ground-truth sample, see
\`src/crawlers/focus/fixtures/samples/1.0/\`.
`;

function main() {
  const store = loadFocusStore(DATA_DIR);
  for (const [version, artifact] of store.versions) {
    const csv = generateFocusCsv(artifact.columns, { rows: ROWS, seed: SEED });
    const outDir = join(OUT_ROOT, version);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "focus_synthetic_sample.csv"), csv);
    writeFileSync(
      join(outDir, "NOTICE.md"),
      NOTICE(version, ROWS, SEED, artifact.columns.length),
    );
    console.error(
      `wrote ${outDir}/focus_synthetic_sample.csv (${ROWS} rows, ` +
        `${artifact.columns.length} columns, ${csv.length} bytes, seed ${SEED})`,
    );
  }
}

main();
