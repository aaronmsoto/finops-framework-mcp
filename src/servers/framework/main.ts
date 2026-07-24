#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadArtifact } from "../../shared/index.js";
import { createServer } from "./server.js";

// stdio entry point. The artifact directory defaults to the repo's
// data/framework resolved RELATIVE TO THIS MODULE (dist/servers/framework/),
// so absolute-path invocations from any cwd work; env/argv override. Flags
// (e.g. --experimental, --version) are filtered out before picking the
// positional arg.
const defaultDir = new URL("../../../data/framework", import.meta.url).pathname;
const packageJsonPath = new URL("../../../package.json", import.meta.url)
  .pathname;

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
// imported by tests. npm installs the bin as a node_modules/.bin symlink whose
// argv[1] is the UNRESOLVED link path (critique-3 BLOCKER A4-community-1), so
// compare realpaths instead of a string suffix.
export function detectDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
const isDirectRun = detectDirectRun();
if (isDirectRun) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
