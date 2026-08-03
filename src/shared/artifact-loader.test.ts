import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  ArtifactValidationError,
  loadArtifactGeneric,
  sha256,
} from "./artifact-loader.js";

/**
 * A synthetic spec unrelated to the framework artifact — proves the seam is
 * generic, not framework-shaped. One content file, one derived file, a
 * manifest, and a referential check between them.
 */
const WIDGETS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: { slug: { type: "string" }, group: { type: "string" } },
    required: ["slug", "group"],
    additionalProperties: false,
  },
} as const;

const GROUPS_SCHEMA = {
  type: "array",
  items: { type: "string" },
} as const;

const MANIFEST_SCHEMA = {
  type: "object",
  properties: { sha256: { type: "object" } },
  required: ["sha256"],
} as const;

const FILES = {
  "manifest.json": MANIFEST_SCHEMA,
  "widgets.json": WIDGETS_SCHEMA,
  "groups.json": GROUPS_SCHEMA,
};

interface SyntheticArtifact {
  widgets: { slug: string; group: string }[];
  groups: string[];
}

const REMEDIATION = "Restore the synthetic fixture and retry.";

function load(dir: string): SyntheticArtifact {
  return loadArtifactGeneric<SyntheticArtifact>(dir, {
    files: FILES,
    remediation: REMEDIATION,
    assemble: (parsed) => ({
      widgets: parsed.get("widgets.json") as { slug: string; group: string }[],
      groups: parsed.get("groups.json") as string[],
    }),
    crossValidate: (a) => {
      const groups = new Set(a.groups);
      for (const w of a.widgets) {
        if (!groups.has(w.group)) {
          throw new ArtifactValidationError(
            "widgets.json",
            `widget "${w.slug}" references unknown group "${w.group}"`,
            REMEDIATION,
          );
        }
      }
    },
  });
}

function writeFixture(dir: string): void {
  const widgets = [{ slug: "gadget", group: "hardware" }];
  const groups = ["hardware", "software"];
  writeFileSync(join(dir, "widgets.json"), JSON.stringify(widgets));
  writeFileSync(join(dir, "groups.json"), JSON.stringify(groups));
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      sha256: {
        "widgets.json": sha256(JSON.stringify(widgets)),
        "groups.json": sha256(JSON.stringify(groups)),
      },
    }),
  );
}

describe("loadArtifactGeneric (synthetic spec)", () => {
  const dirs: string[] = [];
  function freshDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "artifact-loader-test-"));
    dirs.push(dir);
    return dir;
  }
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  it("loads and assembles a valid synthetic artifact", () => {
    const dir = freshDir();
    writeFixture(dir);
    const artifact = load(dir);
    expect(artifact.widgets).toEqual([{ slug: "gadget", group: "hardware" }]);
    expect(artifact.groups).toEqual(["hardware", "software"]);
  });

  it("refuses a schema-violating file with the caller's remediation text", () => {
    const dir = freshDir();
    writeFixture(dir);
    writeFileSync(
      join(dir, "widgets.json"),
      JSON.stringify([{ slug: "gadget" }]),
    );
    expect(() => load(dir)).toThrowError(ArtifactValidationError);
    expect(() => load(dir)).toThrowError(/widgets\.json/);
    expect(() => load(dir)).toThrowError(new RegExp(REMEDIATION));
  });

  it("refuses a manifest hash mismatch", () => {
    const dir = freshDir();
    writeFixture(dir);
    writeFileSync(
      join(dir, "groups.json"),
      JSON.stringify(["hardware", "software", "tampered"]),
    );
    expect(() => load(dir)).toThrowError(/sha256 mismatch/);
  });

  it("refuses a missing file", () => {
    const dir = freshDir();
    writeFixture(dir);
    rmSync(join(dir, "groups.json"));
    expect(() => load(dir)).toThrowError(/cannot read file/);
  });

  it("runs the caller's crossValidate hook and rejects a dangling reference", () => {
    const dir = freshDir();
    const widgets = [{ slug: "gadget", group: "unknown-group" }];
    const groups = ["hardware"];
    writeFileSync(join(dir, "widgets.json"), JSON.stringify(widgets));
    writeFileSync(join(dir, "groups.json"), JSON.stringify(groups));
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        sha256: {
          "widgets.json": sha256(JSON.stringify(widgets)),
          "groups.json": sha256(JSON.stringify(groups)),
        },
      }),
    );
    expect(() => load(dir)).toThrowError(/references unknown group/);
  });

  it("supports a nested artifact directory", () => {
    const dir = freshDir();
    const nested = join(dir, "1.0");
    mkdirSync(nested);
    writeFixture(nested);
    const artifact = load(nested);
    expect(artifact.widgets).toHaveLength(1);
  });
});
