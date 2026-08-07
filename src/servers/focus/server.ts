import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FocusStore } from "../../shared/focus/artifact.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { DEFAULT_VERSION, registerTools } from "./tools.js";

// SERVER_VERSION stays a literal: this module is inside the Cloudflare
// Worker import graph (src/workers/fs-boundary.test.ts), so it cannot read
// package.json at runtime. server.test.ts asserts the two stay in sync.
export const SERVER_NAME = "finops-focus-mcp";
export const SERVER_TITLE = "FinOps FOCUS MCP";
export const SERVER_VERSION = "0.9.0";

/**
 * Build the MCP server from a loaded FOCUS store (data/focus/, T-029, loaded
 * via loadFocusStore). Transport-free by design, same as the framework
 * server: stdio today, `createServer(store).connect(transport)` covers any
 * future transport too.
 *
 * Capability declarations: the store is immutable for the process lifetime
 * — refreshing data means restarting the server — so no list ever changes
 * and `resources.subscribe` is not offered. The SDK's high-level McpServer
 * still force-advertises `listChanged: true` on resources/tools/prompts
 * once any handler is registered (it does not expose a way to suppress
 * this); the corresponding notification is simply never emitted.
 */
export function createServer(store: FocusStore): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, title: SERVER_TITLE, version: SERVER_VERSION },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
        completions: {},
      },
      instructions:
        "FOCUS (FinOps Open Cost & Usage Specification) as version-pinned structured data: " +
        `versions ${store.index.versions.map((v) => v.spec_version).join(", ")} (latest ${store.index.latest}). ` +
        "Start with list_versions. Version-parameterized tools default to " +
        `${DEFAULT_VERSION} and echo spec_version in their responses. ` +
        "Tools are the primary interface; focus://spec/* resources hold the same content as full documents. " +
        "Content © FinOps Foundation, CC BY 4.0, adapted; FOCUS™ is a trademark — attribution does not imply endorsement.",
    },
  );
  registerResources(server, store);
  registerTools(server, store);
  registerPrompts(server, store);
  return server;
}
