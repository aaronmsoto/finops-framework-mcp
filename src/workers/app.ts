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

/** Matches the shape of a Cloudflare Workers Rate Limiting binding
 * (`env.RATE_LIMITER` in wrangler.toml's `[[ratelimits]]`), kept as a local
 * structural type rather than a dependency on `@cloudflare/workers-types` —
 * this file is otherwise free of Cloudflare-specific types (native `Request`/
 * `Response` only), and this is the one binding it needs. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface FetchHandlerOptions {
  frameworkArtifact: Artifact;
  focusStore: FocusStore;
  /** Origin header values allowed to call the worker. A request with no
   * Origin header (non-browser clients, curl, server-to-server) is always
   * allowed regardless of this list. */
  allowedOrigins: readonly string[];
  /** Optional per-IP rate limiter for the /mcp/* routes. Undefined disables
   * rate limiting entirely (e.g. in tests that don't care about it) — see
   * decisions.md 2026-09-25 for why this is temporary/test-only and not yet
   * wired into the deployed Worker's wrangler.toml. */
  rateLimiter?: RateLimiter;
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
const RATE_LIMIT_KEY_HEADER = "cf-connecting-ip";

export function createFetchHandler(opts: FetchHandlerOptions): FetchHandler {
  const { frameworkArtifact, focusStore, allowedOrigins, rateLimiter } = opts;

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
    const isMcpRoute =
      pathname === ROUTES.framework || pathname === ROUTES.focus;

    // The transport is stateless (no sessionIdGenerator): every request gets
    // a fresh server, so there is no session for a GET SSE stream to relay
    // notifications from — the SDK would otherwise hold the connection open
    // forever with nothing to send. DELETE (session termination) is equally
    // meaningless without server-held session state. Reject both before the
    // transport ever sees them rather than let GET hang (review MCP-2).
    if (
      isMcpRoute &&
      (request.method === "GET" || request.method === "DELETE")
    ) {
      const headers = new Headers({
        Allow: "POST, OPTIONS",
        "Content-Type": "application/json",
      });
      if (origin !== null) {
        headers.set("Access-Control-Allow-Origin", origin);
      }
      return new Response(
        JSON.stringify({
          error: `method ${request.method} not supported on this stateless endpoint; use POST`,
        }),
        { status: 405, headers },
      );
    }

    // Only the two POST-only MCP routes are metered — nothing else does
    // enough work to be worth gating. Keyed by the caller's IP as reported by
    // Cloudflare's edge (absent outside Cloudflare's network, e.g. in tests
    // and `wrangler dev` without `--remote`; those callers share one "unknown"
    // bucket rather than bypassing the limit or crashing on a missing header).
    if (isMcpRoute && rateLimiter) {
      const key = request.headers.get(RATE_LIMIT_KEY_HEADER) ?? "unknown";
      const { success } = await rateLimiter.limit({ key });
      if (!success) {
        const headers = new Headers({
          "Content-Type": "application/json",
          "Retry-After": "60",
        });
        if (origin !== null) {
          headers.set("Access-Control-Allow-Origin", origin);
        }
        return new Response(
          JSON.stringify({ error: "rate limit exceeded, retry later" }),
          { status: 429, headers },
        );
      }
    }

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
