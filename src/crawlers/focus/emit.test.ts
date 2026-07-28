import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canonicalJson,
  emitDerivedDiff,
  emitIndex,
  emitVersionArtifact,
} from "./emit.js";
import type { FocusDiff } from "../../shared/focus/types.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "focus-emit-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const REPORT = { parsed: 1, markdown_only: 0 };

function baseFiles(): Map<string, unknown> {
  return new Map<string, unknown>([
    ["columns/foo.md", "# Foo\n\nSome column.\n"],
    ["columns.json", [{ id: "Foo" }]],
  ]);
}

describe("canonicalJson", () => {
  it("sorts object keys and adds a trailing newline", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}\n');
  });
});

describe("emitVersionArtifact", () => {
  it("writes files and a manifest on first emit", () => {
    const versionDir = join(dir, "1.0");
    const result = emitVersionArtifact(versionDir, baseFiles(), {
      specVersion: "1.0",
      sourceTag: "v1.0",
      sourceUrls: ["https://example.test/columns.mdpp"],
      ingestReport: { columns: REPORT, attributes: REPORT },
      parseWarnings: [],
    });
    expect(result.wrote).toBe(true);
    expect(result.manifest.data_version).toBe("1.0.0");
    expect(readFileSync(join(versionDir, "columns/foo.md"), "utf8")).toBe(
      "# Foo\n\nSome column.\n",
    );
    expect(
      JSON.parse(readFileSync(join(versionDir, "manifest.json"), "utf8"))
        .sha256["columns.json"],
    ).toBeTypeOf("string");
  });

  it("is a byte-identical no-op when nothing changed (refresh from a warm cache)", () => {
    const versionDir = join(dir, "1.0");
    const opts = {
      specVersion: "1.0",
      sourceTag: "v1.0",
      sourceUrls: ["https://example.test/columns.mdpp"],
      ingestReport: { columns: REPORT, attributes: REPORT },
      parseWarnings: [],
    };
    const first = emitVersionArtifact(versionDir, baseFiles(), opts);
    const manifestBefore = readFileSync(
      join(versionDir, "manifest.json"),
      "utf8",
    );
    const columnsBefore = readFileSync(
      join(versionDir, "columns.json"),
      "utf8",
    );

    const second = emitVersionArtifact(versionDir, baseFiles(), opts);

    expect(second.wrote).toBe(false);
    expect(second.manifest.crawled_at).toBe(first.manifest.crawled_at);
    expect(readFileSync(join(versionDir, "manifest.json"), "utf8")).toBe(
      manifestBefore,
    );
    expect(readFileSync(join(versionDir, "columns.json"), "utf8")).toBe(
      columnsBefore,
    );
  });

  it("re-writes and bumps data_version when content changes", () => {
    const versionDir = join(dir, "1.0");
    const opts = {
      specVersion: "1.0",
      sourceTag: "v1.0",
      sourceUrls: [],
      ingestReport: { columns: REPORT, attributes: REPORT },
      parseWarnings: [],
    };
    emitVersionArtifact(versionDir, baseFiles(), opts);
    const changed = new Map<string, unknown>([
      ["columns/foo.md", "# Foo\n\nA changed column.\n"],
      ["columns.json", [{ id: "Foo" }]],
    ]);
    const result = emitVersionArtifact(versionDir, changed, opts);
    expect(result.wrote).toBe(true);
    expect(result.manifest.data_version).toBe("1.0.1");
  });
});

describe("emitDerivedDiff + emitIndex", () => {
  it("writes the diff and an index referencing manifest and derived hashes", () => {
    const versionDir = join(dir, "1.0");
    const v10 = emitVersionArtifact(versionDir, baseFiles(), {
      specVersion: "1.0",
      sourceTag: "v1.0",
      sourceUrls: [],
      ingestReport: { columns: REPORT, attributes: REPORT },
      parseWarnings: [],
    });
    const diff: FocusDiff = {
      from: "1.0",
      to: "1.2",
      source: { from_tag: "v1.0", to_tag: "v1.2" },
      added_columns: [{ id: "Bar", source_url: "https://example.test/bar.md" }],
      removed_columns: [],
      changed_columns: [],
    };
    const derived = emitDerivedDiff(dir, diff);
    expect(derived.filename).toBe("diff-1.0-1.2.json");
    emitIndex(
      dir,
      "1.2",
      [
        {
          spec_version: "1.0",
          dir: "1.0",
          data_version: v10.manifest.data_version,
          source_tag: "v1.0",
          manifest_sha256: v10.manifestSha256,
        },
      ],
      { [derived.filename]: derived.sha256 },
    );
    const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
    expect(index.latest).toBe("1.2");
    expect(index.versions[0].manifest_sha256).toBe(v10.manifestSha256);
    expect(index.derived["diff-1.0-1.2.json"]).toBe(derived.sha256);
  });
});
