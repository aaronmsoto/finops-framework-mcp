#!/usr/bin/env node
// Fetches the official FOCUS-Sample-Data 1,000-row sample once and commits
// it as a test fixture (spec "Sources": FOCUS-Sample-Data, CC BY 4.0), with
// a PROVENANCE.json recording exactly what was retrieved. Re-run with
// --force to refresh the fixture deliberately; tests never hit the network
// (src/shared/focus/validate.test.ts reads the committed file).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS-Sample-Data/main/FOCUS-1.0/focus_sample.csv";
const OUT_DIR = join(
  import.meta.dirname,
  "../src/crawlers/focus/fixtures/samples/1.0",
);
const USER_AGENT =
  "finops-framework-mcp/1.0 (+https://github.com/aaronmsoto/finops-framework-mcp)";

async function main() {
  const force = process.argv.includes("--force");
  const provenancePath = join(OUT_DIR, "PROVENANCE.json");
  if (existsSync(provenancePath) && !force) {
    const prev = JSON.parse(readFileSync(provenancePath, "utf8"));
    console.error(
      `already fetched at ${prev.fetched_at} (sha256 ${prev.sha256.slice(0, 12)}…) — pass --force to refresh`,
    );
    return;
  }

  const res = await fetch(SOURCE_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.text();
  const rowCount = body.trimEnd().split("\n").length - 1;
  const sha256 = createHash("sha256").update(body).digest("hex");

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "focus_sample.csv"), body);
  writeFileSync(
    provenancePath,
    JSON.stringify(
      {
        url: SOURCE_URL,
        fetched_at: new Date().toISOString(),
        sha256,
        row_count: rowCount,
        license: "CC-BY-4.0",
      },
      null,
      2,
    ) + "\n",
  );

  console.error(
    `wrote ${OUT_DIR}/focus_sample.csv (${rowCount} rows, ${body.length} bytes, sha256 ${sha256.slice(0, 12)}…)`,
  );
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.stack : err));
  process.exit(1);
});
