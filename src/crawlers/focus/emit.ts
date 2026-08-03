import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256 } from "../../shared/artifact-loader.js";
import type {
  FocusDiff,
  FocusIndex,
  FocusIndexVersionEntry,
  FocusSampleEntry,
  FocusSampleManifest,
  FocusVersionManifest,
  KpiMapping,
} from "../../shared/focus/types.js";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}

/** Deterministic JSON: stable key order, 2-space indent, trailing newline. */
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

/** Markdown payloads are written verbatim (spec "Ingestion rules"): exactly
 * one trailing newline. */
function canonicalMarkdown(value: string): string {
  return `${value.replace(/\n+$/, "")}\n`;
}

function serializeFile(data: unknown): string {
  return typeof data === "string"
    ? canonicalMarkdown(data)
    : canonicalJson(data);
}

function bumpDataVersion(prev: string | undefined): string {
  if (!prev) return "1.0.0";
  const [maj = 1, min = 0, pat = 0] = prev.split(".").map(Number);
  return `${maj}.${min}.${pat + 1}`;
}

export interface EmitVersionOptions {
  specVersion: string;
  sourceTag: string;
  sourceUrls: string[];
  ingestReport: FocusVersionManifest["ingest_report"];
  parseWarnings: string[];
}

export interface EmitVersionResult {
  wrote: boolean;
  manifest: FocusVersionManifest;
  manifestSha256: string;
}

/**
 * Writes one version dir (spec "Version model"). Skips writing entirely
 * when every content file's hash matches what's already on disk — so a
 * refresh from a fully warm cache is a complete no-op and therefore
 * byte-identical (crawled_at is only ever touched by an actual content
 * change, mirroring the framework crawler's emitArtifact idempotence).
 */
export function emitVersionArtifact(
  dir: string,
  contentFiles: Map<string, unknown>,
  opts: EmitVersionOptions,
): EmitVersionResult {
  const serialized = new Map<string, string>();
  for (const [rel, data] of contentFiles) {
    serialized.set(rel, serializeFile(data));
  }

  const sha: Record<string, string> = {};
  for (const [rel, text] of serialized) sha[rel] = sha256(text);

  const manifestPath = join(dir, "manifest.json");
  const prevManifest: FocusVersionManifest | null = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as FocusVersionManifest)
    : null;

  const unchanged =
    prevManifest !== null &&
    Object.keys(prevManifest.sha256).length === Object.keys(sha).length &&
    Object.entries(sha).every(
      ([rel, hash]) => prevManifest.sha256[rel] === hash,
    );

  if (prevManifest && unchanged) {
    const manifestText = canonicalJson(prevManifest);
    return {
      wrote: false,
      manifest: prevManifest,
      manifestSha256: sha256(manifestText),
    };
  }

  for (const [rel, text] of serialized) {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }

  const manifest: FocusVersionManifest = {
    spec_version: opts.specVersion,
    source_tag: opts.sourceTag,
    data_version: bumpDataVersion(prevManifest?.data_version),
    crawled_at: new Date().toISOString(),
    source_urls: opts.sourceUrls,
    counts: {
      columns:
        opts.ingestReport.columns.parsed +
        opts.ingestReport.columns.markdown_only,
      attributes:
        opts.ingestReport.attributes.parsed +
        opts.ingestReport.attributes.markdown_only,
    },
    ingest_report: opts.ingestReport,
    parse_warnings: opts.parseWarnings,
    sha256: sha,
  };
  const manifestText = canonicalJson(manifest);
  writeFileSync(manifestPath, manifestText);
  return { wrote: true, manifest, manifestSha256: sha256(manifestText) };
}

/** Writes data/focus/derived/diff-<from>-<to>.json; returns its filename and
 * sha256 for index.json's `derived` hash map. */
export function emitDerivedDiff(
  focusDir: string,
  diff: FocusDiff,
): { filename: string; sha256: string } {
  const filename = `diff-${diff.from}-${diff.to}.json`;
  const text = canonicalJson(diff);
  const path = join(focusDir, "derived", filename);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return { filename, sha256: sha256(text) };
}

/** Writes data/focus/derived/kpi-mapping.json; returns its filename and
 * sha256 for index.json's `derived` hash map. `mapping` is static curated
 * data (kpi-mapping-data.ts), so this is naturally byte-identical run to
 * run regardless of network/cache state. */
export function emitDerivedKpiMapping(
  focusDir: string,
  mapping: KpiMapping,
): { filename: string; sha256: string } {
  const filename = "kpi-mapping.json";
  const text = canonicalJson(mapping);
  const path = join(focusDir, "derived", filename);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return { filename, sha256: sha256(text) };
}

/** Writes data/focus/index.json — pure function of the already-written
 * version manifests' hashes and the derived data's hashes, so it is
 * naturally byte-identical whenever they are unchanged. */
export function emitIndex(
  focusDir: string,
  latest: string,
  versions: FocusIndexVersionEntry[],
  derived: Record<string, string>,
  samples: Record<string, string> = {},
): void {
  const index: FocusIndex = {
    latest,
    versions: [...versions].sort((a, b) =>
      a.spec_version.localeCompare(b.spec_version, undefined, {
        numeric: true,
      }),
    ),
    derived,
    samples,
  };
  writeFileSync(join(focusDir, "index.json"), canonicalJson(index));
}

export interface SampleInput {
  entry: Omit<FocusSampleEntry, "file">;
  csvText: string;
}

/** Writes data/focus/samples/{version}/{kind}/focus_sample.csv per input
 * plus data/focus/samples/manifest.json describing all of them (T-034,
 * calculate_kpi's bundled-samples-only source: official FOCUS-Sample-Data
 * where it exists, this project's seeded synthetic generator otherwise —
 * never user-supplied). Returns the sha256 map for index.json's `samples`
 * field, keyed by path relative to data/focus/samples/. */
export function emitSamples(
  focusDir: string,
  inputs: SampleInput[],
): Record<string, string> {
  const dir = join(focusDir, "samples");
  const sha: Record<string, string> = {};
  const entries: FocusSampleEntry[] = [];

  for (const { entry, csvText } of inputs) {
    const file = `${entry.version}/${entry.kind}/focus_sample.csv`;
    const text = csvText.endsWith("\n") ? csvText : `${csvText}\n`;
    const path = join(dir, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    sha[file] = sha256(text);
    entries.push({ ...entry, file });
  }

  const manifest: FocusSampleManifest = {
    samples: [...entries].sort((a, b) =>
      a.file.localeCompare(b.file, undefined, { numeric: true }),
    ),
  };
  const manifestText = canonicalJson(manifest);
  writeFileSync(join(dir, "manifest.json"), manifestText);
  sha["manifest.json"] = sha256(manifestText);

  return sha;
}
