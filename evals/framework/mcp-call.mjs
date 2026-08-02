#!/usr/bin/env node
// Minimal MCP client bridge for eval runs: spawns a built stdio server and
// issues one request. Usage:
//   node evals/framework/mcp-call.mjs list-tools
//   node evals/framework/mcp-call.mjs list-resources
//   node evals/framework/mcp-call.mjs list-resource-templates
//   node evals/framework/mcp-call.mjs list-prompts
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

// Pages through a cursor-paginated list* method, collecting every item
// (framework/focus surfaces are small today, but this stays correct if
// either server ever pages tools/resources/prompts).
async function listAllPages(fn) {
  const items = [];
  let cursor;
  do {
    const page = await fn({ cursor });
    const key = Object.keys(page).find((k) => Array.isArray(page[k]));
    items.push(...page[key]);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

if (command === "list-tools") {
  const { tools } = await client.listTools();
  console.log(
    JSON.stringify(
      tools.map((t) => ({ name: t.name, description: t.description })),
      null,
      2,
    ),
  );
} else if (command === "list-resources") {
  const resources = await listAllPages((p) => client.listResources(p));
  console.log(
    JSON.stringify(
      resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        title: r.title,
        description: r.description,
        mimeType: r.mimeType,
      })),
      null,
      2,
    ),
  );
} else if (command === "list-resource-templates") {
  const templates = await listAllPages((p) => client.listResourceTemplates(p));
  console.log(
    JSON.stringify(
      templates.map((t) => ({
        name: t.name,
        title: t.title,
        uriTemplate: t.uriTemplate,
        description: t.description,
        mimeType: t.mimeType,
      })),
      null,
      2,
    ),
  );
} else if (command === "list-prompts") {
  const prompts = await listAllPages((p) => client.listPrompts(p));
  console.log(
    JSON.stringify(
      prompts.map((p) => ({
        name: p.name,
        title: p.title,
        description: p.description,
        arguments: p.arguments ?? [],
      })),
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
    "usage: mcp-call.mjs [--server=<name>] list-tools | list-resources | " +
      "list-resource-templates | list-prompts | call <tool> '<json>'",
  );
  process.exitCode = 2;
}
await client.close();
