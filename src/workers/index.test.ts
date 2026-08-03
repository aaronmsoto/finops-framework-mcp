// Pure-function tests for parseAllowedOrigins and the default export's env
// wiring (review R2 — this module was at 0% coverage; a parsing bug here
// would only ever surface as a production-only CORS failure, since
// app.test.ts drives app.ts directly with an already-parsed array and never
// exercises the ALLOWED_ORIGINS env var).
import { describe, expect, it } from "vitest";
import handler, { parseAllowedOrigins } from "./index.js";

describe("parseAllowedOrigins", () => {
  it("returns an empty array for undefined", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseAllowedOrigins("")).toEqual([]);
  });

  it("splits a comma-separated list and trims whitespace", () => {
    expect(
      parseAllowedOrigins(
        "https://a.example.com, https://b.example.com ,https://c.example.com",
      ),
    ).toEqual([
      "https://a.example.com",
      "https://b.example.com",
      "https://c.example.com",
    ]);
  });

  it("parses a single origin with no comma", () => {
    expect(parseAllowedOrigins("https://demo.example.com")).toEqual([
      "https://demo.example.com",
    ]);
  });

  it("drops empty entries from leading/trailing/doubled commas", () => {
    expect(parseAllowedOrigins(",https://a.example.com,, ,")).toEqual([
      "https://a.example.com",
    ]);
  });
});

describe("default export fetch handler", () => {
  it("rejects a disallowed Origin using ALLOWED_ORIGINS parsed from env", async () => {
    const request = new Request("https://worker.example/mcp/framework", {
      method: "POST",
      headers: {
        Origin: "https://not-allowed.example.com",
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ping",
      }),
    });

    const response = await handler.fetch(request, {
      ALLOWED_ORIGINS: "https://allowed.example.com",
    });

    expect(response.status).toBe(403);
  });

  it("accepts a request with no Origin header regardless of ALLOWED_ORIGINS", async () => {
    const request = new Request("https://worker.example/unknown-route", {
      method: "GET",
    });

    const response = await handler.fetch(request, {});

    expect(response.status).not.toBe(403);
  });
});
