import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FocusStore } from "../../shared/focus/artifact.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

export const SERVER_NAME = "focus-spec-mcp";
export const SERVER_VERSION = "1.0.0";

/**
 * Build the MCP server from a loaded FOCUS store (data/focus/, T-029, loaded
 * via loadFocusStore). Transport-free by design, same as the framework
 * server: stdio today, `createServer(store).connect(transport)` covers any
 * future transport too.
 */
export function createServer(store: FocusStore): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
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
        "Start with list_versions. Every tool takes a `version` param (default " +
        `${store.index.latest}) and echoes spec_version in its response. ` +
        "Tools are the primary interface; focus://spec/* resources hold the same content as full documents. " +
        "Content © FinOps Foundation, CC BY 4.0, adapted; FOCUS™ is a trademark — attribution does not imply endorsement.",
    },
  );
  registerResources(server, store);
  registerTools(server, store);
  registerPrompts(server, store);
  return server;
}
