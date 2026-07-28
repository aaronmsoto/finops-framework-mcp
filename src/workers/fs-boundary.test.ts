// Static reachability check for T-037's acceptance criterion "no node:fs
// reachable from src/workers/index.ts" (spec "Packaging / worker / demo" —
// the worker is stateless and must never touch disk at request time; all
// data is assembled and validated at build time by
// scripts/bundle-worker-data.mjs, see src/workers/data.ts). Walks the real
// TypeScript import graph starting at src/workers/index.ts, the same way
// Node's module resolution would, and fails if any non-type-only import
// reaches node:fs (directly or transitively through this project's own
// source — `import type` specifiers are excluded since tsc erases them, so
// they carry no runtime import regardless of what the referenced module
// does).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = resolve(import.meta.dirname, "..");
const ENTRY = join(import.meta.dirname, "index.ts");

interface ParsedImport {
  isTypeOnly: boolean;
  specifier: string;
}

/** Extracts every `import ... from "..."` AND `export ... from "..."`
 * (re-export) statement's specifier and whether the whole statement is
 * type-only (`import type` / `export type`, both erased at compile time —
 * no runtime import, so neither is followed nor counted as reaching
 * node:fs). Re-exports matter here because src/shared/index.ts's barrel is
 * built entirely out of `export * from "./x.js"` — a module that pulls
 * node:fs in through the barrel would otherwise go undetected. */
function parseImports(source: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const re = /(?:import|export)\s+(type\s+)?[\s\S]*?from\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(re)) {
    imports.push({ isTypeOnly: match[1] !== undefined, specifier: match[2] });
  }
  return imports;
}

function resolveRelative(fromFile: string, specifier: string): string {
  const resolved = join(dirname(fromFile), specifier).replace(/\.js$/, ".ts");
  if (!resolved.startsWith(SRC_ROOT)) {
    throw new Error(
      `fs-boundary test: import "${specifier}" in ${fromFile} escapes src/ — update this test's assumptions`,
    );
  }
  return resolved;
}

function isNodeFsSpecifier(specifier: string): boolean {
  return specifier === "node:fs" || specifier.startsWith("node:fs/");
}

/** BFS over non-type-only relative imports starting at `entry`. Returns the
 * import chain (entry-first) to the first node:fs import found, or null. */
function findNodeFsPath(entry: string): string[] | null {
  const visited = new Set<string>([entry]);
  const queue: { file: string; chain: string[] }[] = [
    { file: entry, chain: [entry] },
  ];

  while (queue.length > 0) {
    const { file, chain } = queue.shift() as (typeof queue)[number];
    const source = readFileSync(file, "utf8");
    for (const imp of parseImports(source)) {
      if (imp.isTypeOnly) continue; // erased at compile time, never a runtime import
      if (isNodeFsSpecifier(imp.specifier)) {
        return [...chain, imp.specifier];
      }
      if (!imp.specifier.startsWith(".")) continue; // external package, out of scope
      const next = resolveRelative(file, imp.specifier);
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push({ file: next, chain: [...chain, next] });
    }
  }
  return null;
}

describe("worker fs boundary (T-037)", () => {
  it("never reaches node:fs from src/workers/index.ts", () => {
    const hit = findNodeFsPath(ENTRY);
    expect(hit, `import chain to node:fs: ${hit?.join(" -> ")}`).toBeNull();
  });

  it("sanity: the walk actually traverses this project's server modules", () => {
    // Guards against the test above passing vacuously (e.g. a parsing bug
    // that silently visits zero files) by asserting the graph reaches a
    // known-far module both MCP servers depend on.
    const visited = new Set<string>([ENTRY]);
    const queue = [ENTRY];
    while (queue.length > 0) {
      const file = queue.shift() as string;
      const source = readFileSync(file, "utf8");
      for (const imp of parseImports(source)) {
        if (imp.isTypeOnly || !imp.specifier.startsWith(".")) continue;
        const next = resolveRelative(file, imp.specifier);
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    const relPaths = [...visited].map((f) => f.slice(SRC_ROOT.length + 1));
    expect(relPaths).toContain("servers/framework/tools.ts");
    expect(relPaths).toContain("servers/focus/tools.ts");
  });
});
