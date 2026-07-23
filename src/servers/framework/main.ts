#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadArtifact } from "../../shared/index.js";
import { createServer } from "./server.js";

// stdio entry point. The artifact directory defaults to the repo's
// data/framework resolved RELATIVE TO THIS MODULE (dist/servers/framework/),
// so absolute-path invocations from any cwd work; env/argv override. Flags
// (e.g. --experimental) are filtered out before picking the positional arg.
const defaultDir = new URL("../../../data/framework", import.meta.url).pathname;
const cliArgs = process.argv.slice(2);
const experimental =
  process.env.FINOPS_MCP_EXPERIMENTAL === "1" ||
  cliArgs.includes("--experimental");
const artifactDir =
  process.env.FINOPS_MCP_DATA ??
  cliArgs.find((a) => !a.startsWith("--")) ??
  defaultDir;

async function main(): Promise<void> {
  const artifact = loadArtifact(artifactDir); // throws with actionable error
  const server = createServer(artifact, { experimental });
  await server.connect(new StdioServerTransport());
  console.error(
    `finops-framework MCP server ready on stdio (data v${artifact.manifest.data_version}, ${artifact.capabilities.length} capabilities)` +
      (experimental ? " [experimental]" : ""),
  );
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
