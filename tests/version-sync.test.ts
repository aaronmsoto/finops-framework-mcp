// SERVER_VERSION is a hand-maintained literal in each server.ts because
// those modules sit inside the Cloudflare Worker import graph and must not
// touch node:fs (src/workers/fs-boundary.test.ts). These tests are the sync
// enforcement: a version bump in a package.json without the matching
// server.ts bump (or vice versa) fails the test gate.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SERVER_VERSION as FRAMEWORK_VERSION } from "../src/servers/framework/server.js";
import { SERVER_VERSION as FOCUS_VERSION } from "../src/servers/focus/server.js";

function pkgVersion(relPath: string): string {
  const pkg = JSON.parse(
    readFileSync(new URL(relPath, import.meta.url), "utf8"),
  ) as { version: string };
  return pkg.version;
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
});
