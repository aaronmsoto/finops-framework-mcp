import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import type { CurriculumOverlay } from "../../shared/tokenomics/curriculum.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

// SERVER_VERSION stays a literal (no package.json read) so this module can
// join a fs-free Worker import graph later, like the other two servers.
export const SERVER_NAME = "tokenomics-overview-mcp";
export const SERVER_TITLE = "Tokenomics Overview MCP";
export const SERVER_VERSION = "0.1.0";

export interface CreateServerOptions {
  /** FINOPS_MCP_EXPERIMENTAL=1 / --experimental: curated crosswalk. */
  experimental?: boolean;
  /** Local cert-prep overlay; only honored when experimental is on. */
  curriculum?: CurriculumOverlay | null;
}

/** Build the MCP server from a loaded artifact. Transport-free. */
export function createServer(
  artifact: TokenomicsArtifact,
  opts: CreateServerOptions = {},
): McpServer {
  const experimental = opts.experimental ?? false;
  const curriculum = experimental ? (opts.curriculum ?? null) : null;
  const c = artifact.manifest.counts;
  const server = new McpServer(
    { name: SERVER_NAME, title: SERVER_TITLE, version: SERVER_VERSION },
    {
      capabilities: { resources: {}, tools: {}, prompts: {}, completions: {} },
      instructions:
        "AI tokenomics guidance from the Tokenomics Foundation (tokeneconomics.com) as structured data: " +
        `${c.documents} source documents, the ${c.layers}-layer stack, ${c.bigt_classes} Big-T classes, ${c.levers} consumption levers, ` +
        `${c.metrics} reference metrics (incl. Cache Hit Rate and Cache Cost Efficiency), ${c.personas} personas, and the FOCUS 1.5 AI tracker. ` +
        "Start with get_tokenomics_info. Most sources are Working Drafts or Release Candidates: always state the status, never present them as ratified standards. " +
        "get_crosslinks returns finops://framework/… and focus://spec/… URIs for the companion finops-framework-mcp and finops-focus-mcp servers. " +
        (experimental
          ? "Experimental mode: get_crosswalk serves curated UNOFFICIAL mappings" +
            (curriculum
              ? "; a local cert-prep curriculum overlay (UNOFFICIAL) is loaded. "
              : ". ")
          : "") +
        "Content © Tokenomics Foundation (a Series of LF Projects, LLC), CC BY 4.0, adapted; attribution does not imply endorsement.",
    },
  );
  registerResources(server, artifact, {
    experimental,
    curriculum: curriculum !== null,
  });
  registerTools(server, artifact, { experimental, curriculum });
  registerPrompts(server, artifact);
  return server;
}
