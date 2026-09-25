import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256 } from "../../shared/artifact-loader.js";
import {
  TOKENOMICS_ARTIFACT_FILES,
  TOKENOMICS_SCHEMA_VERSION,
} from "../../shared/tokenomics/schemas.js";
import type {
  TkChangelogEntry,
  TkManifest,
} from "../../shared/tokenomics/types.js";

// Deterministic artifact writer (same contract as the framework/FOCUS
// emitters): canonical JSON, verbatim markdown, sha256 manifest, rolling
// changelog, and NO write at all when content is unchanged, so a re-run from
// cache is byte-identical (crawled_at included).

const CHANGELOG_CAP = 20;

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

export function serialize(data: unknown): string {
  return typeof data === "string"
    ? `${data.replace(/\n+$/, "")}\n`
    : canonicalJson(data);
}

export interface EmitInput {
  dir: string;
  /** Every artifact file except manifest.json and derived/changelog.json. */
  files: Map<string, unknown>;
  counts: Record<string, number>;
  parseWarnings: string[];
  sourceUrls: string[];
  unregistered: string[];
  now: string;
}

export interface EmitResult {
  wrote: boolean;
  dataVersion: string;
  changed: string[];
  added: string[];
  removed: string[];
}

function readManifest(dir: string): TkManifest | null {
  const p = join(dir, "manifest.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as TkManifest;
  } catch {
    return null;
  }
}

function bump(prev: TkManifest | null, added: number, changed: number): string {
  if (!prev) return "1.0.0";
  const prevMajor = Number(prev.schema_version.split(".")[0]);
  const major = Number(TOKENOMICS_SCHEMA_VERSION.split(".")[0]);
  if (prevMajor !== major) return `${major}.0.0`;
  const [a = 1, b = 0, c = 0] = prev.data_version.split(".").map(Number);
  if (added > 0) return `${a}.${b + 1}.0`;
  if (changed > 0) return `${a}.${b}.${c + 1}`;
  return prev.data_version;
}

export function emitArtifact(input: EmitInput): EmitResult {
  const prev = readManifest(input.dir);
  const serialized = new Map<string, string>();
  for (const [rel, data] of input.files) serialized.set(rel, serialize(data));
  const prevFiles = new Set(
    Object.keys(prev?.sha256 ?? {}).filter(
      (f) => f !== "derived/changelog.json" && !f.startsWith("schema/"),
    ),
  );
  const added: string[] = [];
  const changed: string[] = [];
  for (const [rel, text] of serialized) {
    if (!prevFiles.has(rel)) added.push(rel);
    else if (prev?.sha256[rel] !== sha256(text)) changed.push(rel);
    prevFiles.delete(rel);
  }
  const removed = [...prevFiles];
  const metaSame =
    prev !== null &&
    canonicalJson(prev.counts) === canonicalJson(input.counts) &&
    canonicalJson(prev.parse_warnings) === canonicalJson(input.parseWarnings) &&
    canonicalJson(prev.unregistered) === canonicalJson(input.unregistered) &&
    canonicalJson(prev.source_urls) === canonicalJson(input.sourceUrls) &&
    prev.schema_version === TOKENOMICS_SCHEMA_VERSION;
  if (
    prev &&
    metaSame &&
    added.length + changed.length + removed.length === 0
  ) {
    return {
      wrote: false,
      dataVersion: prev.data_version,
      added,
      changed,
      removed,
    };
  }
  const dataVersion = bump(
    prev,
    added.length + removed.length,
    changed.length || (metaSame ? 0 : 1),
  );
  const changelogPath = join(input.dir, "derived/changelog.json");
  const oldLog: TkChangelogEntry[] = existsSync(changelogPath)
    ? (JSON.parse(readFileSync(changelogPath, "utf8")) as TkChangelogEntry[])
    : [];
  const log: TkChangelogEntry[] = [
    {
      data_version: dataVersion,
      crawled_at: input.now,
      added,
      removed,
      changed,
    },
    ...oldLog,
  ].slice(0, CHANGELOG_CAP);
  serialized.set("derived/changelog.json", canonicalJson(log));
  for (const [rel, schema] of Object.entries(TOKENOMICS_ARTIFACT_FILES)) {
    const name =
      rel
        .split("/")
        .pop()
        ?.replace(/\.json$/, "") ?? rel;
    serialized.set(`schema/${name}.schema.json`, canonicalJson(schema));
  }
  const sha: Record<string, string> = {};
  for (const [rel, text] of serialized) sha[rel] = sha256(text);
  const manifest: TkManifest = {
    data_version: dataVersion,
    schema_version: TOKENOMICS_SCHEMA_VERSION,
    crawled_at: input.now,
    source_urls: input.sourceUrls,
    sha256: sha,
    counts: input.counts,
    parse_warnings: input.parseWarnings,
    unregistered: input.unregistered,
  };
  serialized.set("manifest.json", canonicalJson(manifest));
  for (const [rel, text] of serialized) {
    const p = join(input.dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  return { wrote: true, dataVersion, added, changed, removed };
}
