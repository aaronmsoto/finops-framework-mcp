import { describe, expect, it } from "vitest";
import { createServer, SERVER_NAME, SERVER_VERSION } from "../src/index.js";
import * as server from "../src/servers/framework/server.js";

describe("repo scaffold entry (src/index.ts)", () => {
  it("re-exports the framework MCP server's createServer/SERVER_NAME/SERVER_VERSION unchanged", () => {
    expect(createServer).toBe(server.createServer);
    expect(SERVER_NAME).toBe(server.SERVER_NAME);
    expect(SERVER_VERSION).toBe(server.SERVER_VERSION);
  });
});
