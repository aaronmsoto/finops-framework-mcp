import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Artifact } from "../../shared/index.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

// SERVER_VERSION stays a literal: this module is inside the Cloudflare
// Worker import graph (src/workers/fs-boundary.test.ts), so it cannot read
// package.json at runtime. tests/index.test.ts asserts the two stay in sync.
export const SERVER_NAME = "finops-framework-mcp";
export const SERVER_TITLE = "FinOps Framework MCP";
export const SERVER_VERSION = "0.9.0";

export interface ServerOptions {
  /** Restores get_actions and the unofficial pre-crawl extension (v1 default: off). */
  experimental?: boolean;
}

/**
 * Build the MCP server from a loaded artifact. Transport-free by design
 * (docs/architecture.md §5.4): stdio today, streamable HTTP later, both just
 * `createServer(artifact).connect(transport)`.
 *
 * Capability declarations (§5.5): the artifact is immutable for the process
 * lifetime — refreshing data means restarting the server — so no list ever
 * changes and `resources.subscribe` is not offered. The SDK's high-level
 * McpServer still force-advertises `listChanged: true` on resources/tools/
 * prompts once any handler is registered (it does not expose a way to
 * suppress this); the corresponding notification is simply never emitted.
 * Completions are enabled for resource-template and prompt arguments.
 */
export function createServer(
  artifact: Artifact,
  opts: ServerOptions = {},
): McpServer {
  const experimental = opts.experimental ?? false;
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
        "FinOps Framework (finops.org) as structured data: 6 principles, 3 phases, 4 domains, " +
        "22 capabilities with Crawl/Walk/Run maturity assessments, 11 personas, and a KPI library. " +
        "Start with get_framework_info. Tools are the primary interface; " +
        "finops://framework/* resources hold the same content as full documents. " +
        (experimental
          ? "Unofficial extensions (pre-crawl level, parsed assessment items) are always " +
            "flagged official:false. "
          : "") +
        "Content © FinOps Foundation, CC BY 4.0, adapted.",
    },
  );
  registerResources(server, artifact, { experimental });
  registerTools(server, artifact, { experimental });
  registerPrompts(server, artifact, { experimental });
  return server;
}
