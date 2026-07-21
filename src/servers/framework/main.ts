#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadArtifact } from "../../shared/index.js";
import { createServer } from "./server.js";

// stdio entry point. The artifact directory defaults to the repo's
// data/framework resolved RELATIVE TO THIS MODULE (dist/servers/framework/),
// so absolute-path invocations from any cwd work; env/argv override.
const defaultDir = new URL("../../../data/framework", import.meta.url).pathname;
const artifactDir =
  process.env.FINOPS_MCP_DATA ?? process.argv[2] ?? defaultDir;

async function main(): Promise<void> {
  const artifact = loadArtifact(artifactDir); // throws with actionable error
  const server = createServer(artifact);
  await server.connect(new StdioServerTransport());
  console.error(
    `finops-framework MCP server ready on stdio (data v${artifact.manifest.data_version}, ${artifact.capabilities.length} capabilities)`,
  );
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
