// Drives src/workers/app.ts's fetch-handler factory with native Request
// objects (T-037, spec "Packaging / worker / demo" — "Tests drive the
// handler with native Request objects — never wrangler"). Uses the same
// data/framework + data/focus fixtures the stdio server tests use (loaded
// via loadArtifact/loadFocusStore, which is fine here — this is a Node test
// process, not the worker bundle itself; only src/workers/*.ts must stay
// node:fs-free, checked separately by fs-boundary.test.ts).
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadArtifact, loadFocusStore } from "../shared/index.js";
import { createFetchHandler, type FetchHandler } from "./app.js";

const FRAMEWORK_DIR = join(import.meta.dirname, "../../data/framework");
const FOCUS_DIR = join(import.meta.dirname, "../../data/focus");
const ALLOWED_ORIGIN = "https://demo.example.com";

let handler: FetchHandler;

beforeAll(() => {
  const frameworkArtifact = loadArtifact(FRAMEWORK_DIR);
  const focusStore = loadFocusStore(FOCUS_DIR);
  handler = createFetchHandler({
    frameworkArtifact,
    focusStore,
    allowedOrigins: [ALLOWED_ORIGIN],
  });
});

function rpcRequest(
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://worker.example/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function readJsonResponse(
  res: Response,
): Promise<Record<string, unknown>> {
  return JSON.parse(await res.text()) as Record<string, unknown>;
}

const INITIALIZE_BODY = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "app.test.ts", version: "0.0.0" },
  },
};

describe.each([
  { route: "mcp/framework", listTool: "get_framework_info" },
  { route: "mcp/focus", listTool: "list_versions" },
])("$route", ({ route, listTool }) => {
  it("responds to initialize", async () => {
    const res = await handler(rpcRequest(route, INITIALIZE_BODY));
    expect(res.status).toBe(200);
    const json = await readJsonResponse(res);
    expect(json.jsonrpc).toBe("2.0");
    const result = json.result as { protocolVersion: string };
    expect(result.protocolVersion).toBe("2025-06-18");
  });

  it("responds to tools/list with a non-empty tool set including a known tool", async () => {
    const res = await handler(
      rpcRequest(route, { jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    expect(res.status).toBe(200);
    const json = await readJsonResponse(res);
    const result = json.result as { tools: { name: string }[] };
    expect(result.tools.length).toBeGreaterThan(0);
    expect(result.tools.map((t) => t.name)).toContain(listTool);
  });

  it("responds to a tools/call", async () => {
    const res = await handler(
      rpcRequest(route, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: listTool, arguments: {} },
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJsonResponse(res);
    const result = json.result as { isError?: boolean };
    expect(result.isError).toBeFalsy();
  });
});

describe("Origin allowlist", () => {
  it("allows a request with no Origin header", async () => {
    const res = await handler(rpcRequest("mcp/framework", INITIALIZE_BODY));
    expect(res.status).toBe(200);
  });

  it("allows a listed Origin", async () => {
    const res = await handler(
      rpcRequest("mcp/framework", INITIALIZE_BODY, { Origin: ALLOWED_ORIGIN }),
    );
    expect(res.status).toBe(200);
  });

  it("rejects an unlisted Origin with 403", async () => {
    const res = await handler(
      rpcRequest("mcp/framework", INITIALIZE_BODY, {
        Origin: "https://evil.example.com",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("carries Access-Control-Allow-Origin on a POST from an allowed Origin", async () => {
    const res = await handler(
      rpcRequest("mcp/framework", INITIALIZE_BODY, { Origin: ALLOWED_ORIGIN }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("carries no Access-Control-Allow-Origin when no Origin header is sent", async () => {
    const res = await handler(rpcRequest("mcp/framework", INITIALIZE_BODY));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("CORS preflight", () => {
  it("answers an allowed-Origin OPTIONS preflight with 204 + CORS headers", async () => {
    const res = await handler(
      new Request("https://worker.example/mcp/framework", {
        method: "OPTIONS",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, GET, DELETE, OPTIONS",
    );
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
    );
  });

  it("also answers the /mcp/focus route's preflight", async () => {
    const res = await handler(
      new Request("https://worker.example/mcp/focus", {
        method: "OPTIONS",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Access-Control-Request-Method": "POST",
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("rejects an unlisted-Origin preflight with 403 and no ACAO", async () => {
    const res = await handler(
      new Request("https://worker.example/mcp/framework", {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example.com",
          "Access-Control-Request-Method": "POST",
        },
      }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("routing edge cases", () => {
  it("404s an unknown path", async () => {
    const res = await handler(
      new Request("https://worker.example/mcp/unknown"),
    );
    expect(res.status).toBe(404);
  });

  it("405s an unsupported method", async () => {
    const res = await handler(
      new Request("https://worker.example/mcp/framework", { method: "PUT" }),
    );
    expect(res.status).toBe(405);
  });
});
