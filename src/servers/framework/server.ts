import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Artifact } from "../../shared/index.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

export const SERVER_NAME = "finops-framework";
export const SERVER_VERSION = "0.1.0";

/**
 * Build the MCP server from a loaded artifact. Transport-free by design
 * (docs/architecture.md §5.4): stdio today, streamable HTTP later, both just
 * `createServer(artifact).connect(transport)`.
 *
 * Capability declarations (§5.5): resources/tools/prompts without subscribe
 * or listChanged — the artifact is immutable for the process lifetime;
 * refreshing data means restarting the server. Completions are enabled for
 * resource-template and prompt arguments.
 */
export function createServer(artifact: Artifact): McpServer {
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
        "FinOps Framework (finops.org) as structured data: 6 principles, 3 phases, 4 domains, " +
        "22 capabilities with Crawl/Walk/Run maturity assessments, 11 personas, KPI library, and a " +
        "relationship graph. Start with get_framework_info. Tools are the primary interface; " +
        "finops://framework/* resources hold the same content as full documents. Unofficial " +
        "extensions (pre-crawl level, parsed assessment items, inferred graph edges) are always " +
        "flagged official:false. Content © FinOps Foundation, CC BY 4.0, adapted.",
    },
  );
  registerResources(server, artifact);
  registerTools(server, artifact);
  registerPrompts(server, artifact);
  return server;
}
