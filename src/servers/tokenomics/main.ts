#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { loadTokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import { loadCurriculumOverlay } from "../../shared/tokenomics/curriculum.js";
import { createServer } from "./server.js";

// stdio entry point. The artifact directory defaults to data/tokenomics
// resolved RELATIVE TO THIS MODULE (repo root in dev, the shim package when
// installed); TOKENOMICS_MCP_DATA or the first positional arg override.
// fileURLToPath, not URL.pathname (spaces / Windows paths under npx).
const defaultDir = fileURLToPath(
  new URL("../../../data/tokenomics", import.meta.url),
);
const packageJsonPath = fileURLToPath(
  new URL("../../../package.json", import.meta.url),
);

export async function runCli(cliArgs: string[]): Promise<void> {
  const experimental =
    process.env.FINOPS_MCP_EXPERIMENTAL === "1" ||
    cliArgs.includes("--experimental");
  const artifactDir =
    process.env.TOKENOMICS_MCP_DATA ??
    cliArgs.find((a) => !a.startsWith("--")) ??
    defaultDir;

  if (cliArgs.includes("--version")) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version: string;
    };
    const artifact = loadTokenomicsArtifact(artifactDir);
    console.log(
      `tokenomics-overview-mcp v${pkg.version} (data v${artifact.manifest.data_version}, ${artifact.documents.length} Tokenomics Foundation documents)`,
    );
    return;
  }

  const artifact = loadTokenomicsArtifact(artifactDir);
  const curriculumDir = process.env.TOKENOMICS_MCP_CURRICULUM;
  const curriculum =
    experimental && curriculumDir ? loadCurriculumOverlay(curriculumDir) : null;
  if (curriculumDir && !experimental) {
    console.error(
      "TOKENOMICS_MCP_CURRICULUM is set but experimental mode is off; the curriculum overlay is ignored (set FINOPS_MCP_EXPERIMENTAL=1).",
    );
  }
  const server = createServer(artifact, { experimental, curriculum });
  await server.connect(new StdioServerTransport());
  console.error(
    `tokenomics-overview-mcp ready on stdio (data v${artifact.manifest.data_version})` +
      (experimental ? " [experimental]" : "") +
      (curriculum
        ? ` [curriculum overlay: ${curriculum.modules.length} modules]`
        : ""),
  );
}

export function detectDirectRun(): boolean {
  return isDirectRunOf(import.meta.url);
}
if (detectDirectRun()) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
