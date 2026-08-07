#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { loadArtifact } from "../../shared/index.js";
import { createServer } from "./server.js";

// stdio entry point. The artifact directory defaults to the repo's
// data/framework resolved RELATIVE TO THIS MODULE (dist/servers/framework/),
// so absolute-path invocations from any cwd work; env/argv override. Flags
// (e.g. --experimental, --version) are filtered out before picking the
// positional arg.
// fileURLToPath, not URL.pathname: pathname percent-encodes spaces and
// yields /C:/... on Windows, which breaks npx installs (space or Windows
// paths are the norm under the npx cache).
const defaultDir = fileURLToPath(
  new URL("../../../data/framework", import.meta.url),
);
const packageJsonPath = fileURLToPath(
  new URL("../../../package.json", import.meta.url),
);

export async function runCli(cliArgs: string[]): Promise<void> {
  const experimental =
    process.env.FINOPS_MCP_EXPERIMENTAL === "1" ||
    cliArgs.includes("--experimental");
  const artifactDir =
    process.env.FINOPS_MCP_DATA ??
    cliArgs.find((a) => !a.startsWith("--")) ??
    defaultDir;

  if (cliArgs.includes("--version")) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version: string;
    };
    const artifact = loadArtifact(artifactDir); // throws with actionable error
    console.log(
      `finops-framework-mcp v${pkg.version} (data v${artifact.manifest.data_version})`,
    );
    return;
  }

  const artifact = loadArtifact(artifactDir); // throws with actionable error
  const server = createServer(artifact, { experimental });
  await server.connect(new StdioServerTransport());
  console.error(
    `finops-framework MCP server ready on stdio (data v${artifact.manifest.data_version}, ${artifact.capabilities.length} capabilities)` +
      (experimental ? " [experimental]" : ""),
  );
}

// Only run as a side effect when executed directly (bin invocation), not when
// imported by tests (critique-3 BLOCKER A4-community-1).
export function detectDirectRun(): boolean {
  return isDirectRunOf(import.meta.url);
}
const isDirectRun = detectDirectRun();
if (isDirectRun) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
