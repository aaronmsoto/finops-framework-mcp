#!/usr/bin/env node
// Minimal MCP client bridge for eval runs: spawns the built stdio server and
// issues one request. Usage:
//   node evals/framework/mcp-call.mjs list-tools
//   node evals/framework/mcp-call.mjs call <tool-name> '<json-arguments>'
// Requires `npm run build` first (dist/ present) and the committed artifact.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [, , command, toolName, argsJson] = process.argv;

const client = new Client({ name: "eval-client", version: "0.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/servers/framework/main.js"],
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
  console.error("usage: mcp-call.mjs list-tools | call <tool> '<json>'");
  process.exitCode = 2;
}
await client.close();
