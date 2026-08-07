#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { loadFocusStore } from "../../shared/index.js";
import { createServer } from "./server.js";

// stdio entry point. The artifact directory defaults to the repo's
// data/focus resolved RELATIVE TO THIS MODULE (dist/servers/focus/), so
// absolute-path invocations from any cwd work; env/argv override (mirrors
// the framework server's main.ts).
// fileURLToPath, not URL.pathname: pathname percent-encodes spaces and
// yields /C:/... on Windows, which breaks npx installs (space or Windows
// paths are the norm under the npx cache).
const defaultDir = fileURLToPath(
  new URL("../../../data/focus", import.meta.url),
);
const packageJsonPath = fileURLToPath(
  new URL("../../../package.json", import.meta.url),
);

export async function runCli(cliArgs: string[]): Promise<void> {
  const artifactDir =
    process.env.FOCUS_MCP_DATA ??
    cliArgs.find((a) => !a.startsWith("--")) ??
    defaultDir;

  if (cliArgs.includes("--version")) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version: string;
    };
    const store = loadFocusStore(artifactDir); // throws with actionable error
    const versions = store.index.versions.map((v) => v.spec_version).join(", ");
    console.log(
      `finops-focus-mcp v${pkg.version} (FOCUS spec versions: ${versions}; latest ${store.index.latest})`,
    );
    return;
  }

  const store = loadFocusStore(artifactDir); // throws with actionable error
  const server = createServer(store);
  await server.connect(new StdioServerTransport());
  console.error(
    `finops-focus-mcp MCP server ready on stdio (FOCUS spec versions: ` +
      `${store.index.versions.map((v) => v.spec_version).join(", ")}; latest ${store.index.latest})`,
  );
}

// Only run as a side effect when executed directly (bin invocation), not when
// imported by tests (mirrors the framework server's main.ts).
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
