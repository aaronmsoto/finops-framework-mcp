// SERVER_VERSION is a hand-maintained literal in each server.ts because
// those modules sit inside the Cloudflare Worker import graph and must not
// touch node:fs (src/workers/fs-boundary.test.ts). These tests are the sync
// enforcement: a version bump in a package.json without the matching
// server.ts and server.json bump (or vice versa) fails the test gate.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SERVER_VERSION as FRAMEWORK_VERSION } from "../src/servers/framework/server.js";
import { SERVER_VERSION as FOCUS_VERSION } from "../src/servers/focus/server.js";
import { SERVER_VERSION as TOKENOMICS_VERSION } from "../src/servers/tokenomics/server.js";

function readJson<T>(relPath: string): T {
  return JSON.parse(
    readFileSync(new URL(relPath, import.meta.url), "utf8"),
  ) as T;
}

function pkgVersion(relPath: string): string {
  return readJson<{ version: string }>(relPath).version;
}

describe("SERVER_VERSION stays in sync with package.json", () => {
  it("framework server matches the root package version", () => {
    expect(FRAMEWORK_VERSION).toBe(pkgVersion("../package.json"));
  });

  it("focus server matches the finops-focus-mcp package version", () => {
    expect(FOCUS_VERSION).toBe(
      pkgVersion("../packages/finops-focus-mcp/package.json"),
    );
  });

  it("tokenomics server matches the tokenomics-overview-mcp package version", () => {
    expect(TOKENOMICS_VERSION).toBe(
      pkgVersion("../packages/tokenomics-overview-mcp/package.json"),
    );
  });
});

describe("server.json manifests match their package", () => {
  for (const [manifest, pkg] of [
    ["../server.json", "../package.json"],
    [
      "../packages/finops-focus-mcp/server.json",
      "../packages/finops-focus-mcp/package.json",
    ],
    [
      "../packages/tokenomics-overview-mcp/server.json",
      "../packages/tokenomics-overview-mcp/package.json",
    ],
  ] as const) {
    it(manifest, () => {
      const m = readJson<{
        name: string;
        version: string;
        packages: { identifier: string; version: string }[];
      }>(manifest);
      const p = readJson<{ name: string; version: string; mcpName: string }>(
        pkg,
      );
      expect(m.version).toBe(p.version);
      expect(m.packages[0]?.version).toBe(p.version);
      expect(m.packages[0]?.identifier).toBe(p.name);
      expect(m.name).toBe(p.mcpName);
    });
  }
});
