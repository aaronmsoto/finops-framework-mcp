#!/usr/bin/env node
// Minimal MCP client bridge for eval runs: spawns a built stdio server and
// issues one request. Usage:
//   node evals/framework/mcp-call.mjs list-tools
//   node evals/framework/mcp-call.mjs call <tool-name> '<json-arguments>'
// Server selection (defaults to the framework server, so existing
// invocations are unchanged): --server=<name> selects dist/servers/<name>/
// main.js; MCP_EVAL_SERVER env var does the same when no flag is given.
// Requires `npm run build` first (dist/ present) and the committed artifact.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";

let serverName = process.env.MCP_EVAL_SERVER || "framework";
const positional = [];
for (const arg of process.argv.slice(2)) {
  const match = /^--server=(.+)$/.exec(arg);
  if (match) {
    serverName = match[1];
  } else {
    positional.push(arg);
  }
}
const [command, toolName, argsJson] = positional;

const client = new Client({ name: "eval-client", version: "0.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: [`dist/servers/${serverName}/main.js`],
    // SDK strips the parent env by default — forward the experimental flag
    // so eval runs can exercise the gated surface.
    env: {
      ...getDefaultEnvironment(),
      ...(process.env.FINOPS_MCP_EXPERIMENTAL
        ? { FINOPS_MCP_EXPERIMENTAL: process.env.FINOPS_MCP_EXPERIMENTAL }
        : {}),
    },
    stderr: "ignore",
  }),
);

if (command === "list-tools") {
  const { tools } = await client.listTools();
  console.log(
    JSON.stringify(
      tools.map((t) => ({ name: t.name, description: t.description })),
      null,
      2,
    ),
  );
} else if (command === "call" && toolName) {
  const result = await client.callTool({
    name: toolName,
    arguments: argsJson ? JSON.parse(argsJson) : {},
  });
  console.log(JSON.stringify(result, null, 2));
} else {
  console.error(
    "usage: mcp-call.mjs [--server=<name>] list-tools | call <tool> '<json>'",
  );
  process.exitCode = 2;
}
await client.close();
