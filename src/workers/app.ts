// Fetch-handler factory for the Cloudflare Worker (T-037,
// .agents/specs/focus-mcp-v1.md "Packaging / worker / demo"). Routes
// /mcp/framework and /mcp/focus to the same MCP servers the stdio bins
// serve, over the SDK's Web Standard Streamable HTTP transport — a fresh
// server + transport per request (stateless: no sessionIdGenerator, so no
// in-memory session state survives across requests/isolates), plus a
// same-origin-or-allowlisted Origin check (absent Origin — e.g. a
// non-browser MCP client — is always allowed; a present-but-unlisted Origin
// is rejected before any server work happens).
//
// CORS (T-040, gate 4 C4-community-1): the allowlist above only ever
// governed whether *this* handler accepts a request — it never told a
// browser it may read the response. A browser-hosted client (the T-038
// demo) always preflights a JSON POST (its Content-Type header forces
// one), and without Access-Control-Allow-Origin on both the preflight and
// the actual response, the browser blocks the response client-side even
// though the Worker returned 200. So every response whose Origin passed
// the allowlist above also echoes that Origin back as ACAO, and OPTIONS
// gets a dedicated 204 preflight reply carrying ACAO + the allowed
// methods/headers instead of falling through to the transport (which would
// 405 it — the SDK transport only knows POST/GET/DELETE).
//
// Deliberately does not import from ../shared/index.js (the barrel) or any
// module that imports node:fs — see src/workers/data.ts and
// src/workers/fs-boundary.test.ts. createServer() for both servers only
// pulls in fs-free modules (confirmed by that test).
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Artifact } from "../shared/types.js";
import type { FocusStore } from "../shared/focus/artifact.js";
import { createServer as createFrameworkServer } from "../servers/framework/server.js";
import { createServer as createFocusServer } from "../servers/focus/server.js";

export interface FetchHandlerOptions {
  frameworkArtifact: Artifact;
  focusStore: FocusStore;
  /** Origin header values allowed to call the worker. A request with no
   * Origin header (non-browser clients, curl, server-to-server) is always
   * allowed regardless of this list. */
  allowedOrigins: readonly string[];
}

export type FetchHandler = (request: Request) => Promise<Response>;

const ROUTES = {
  framework: "/mcp/framework",
  focus: "/mcp/focus",
} as const;

const CORS_ALLOW_METHODS = "POST, GET, DELETE, OPTIONS";
const CORS_ALLOW_HEADERS =
  "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version";

async function handleMcp(
  request: Request,
  buildServer: () => McpServer,
): Promise<Response> {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

/** Builds the worker's fetch handler from the two pre-loaded data
 * artifacts and an Origin allowlist. Pure with respect to its inputs — safe
 * to call once per isolate (src/workers/index.ts does), or per request in
 * tests. */
export function createFetchHandler(opts: FetchHandlerOptions): FetchHandler {
  const { frameworkArtifact, focusStore, allowedOrigins } = opts;

  return async function fetchHandler(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");
    if (origin !== null && !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "origin not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
        "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
      });
      if (origin !== null) {
        headers.set("Access-Control-Allow-Origin", origin);
      }
      return new Response(null, { status: 204, headers });
    }

    const { pathname } = new URL(request.url);
    let response: Response;
    switch (pathname) {
      case ROUTES.framework:
        response = await handleMcp(request, () =>
          createFrameworkServer(frameworkArtifact),
        );
        break;
      case ROUTES.focus:
        response = await handleMcp(request, () =>
          createFocusServer(focusStore),
        );
        break;
      default:
        response = new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
    }

    if (origin !== null) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    return response;
  };
}
