import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ARTIFACT_FILES,
  SCHEMA_VERSION,
  schemaFileFor,
  type ChangelogEntry,
  type EntityCounts,
  type Manifest,
} from "../../shared/index.js";
import { sha256 } from "../../shared/artifact.js";

const CHANGELOG_CAP = 20;

/** Deterministic JSON: stable key order, 2-space indent, trailing newline. */
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

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

export interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
  hasChanges: boolean;
}

interface Keyed {
  [k: string]: unknown;
}

function entityKey(rel: string, item: Keyed): string {
  if (item.capability_slug !== undefined && item.maturity !== undefined) {
    return `${rel}#${String(item.capability_slug)}/${String(item.maturity)}#${String(item.ordinal)}`;
  }
  if (item.from !== undefined && item.to !== undefined) {
    return `${rel}#${String(item.type)}:${String(item.from)}->${String(item.to)}#${String(item.heuristic ?? "")}`;
  }
  const id =
    (item.slug as string | undefined) ??
    (item.wp_id !== undefined ? String(item.wp_id) : undefined) ??
    (item.title as string | undefined) ??
    sha256(canonicalJson(item));
  return `${rel}#${id}`;
}

/** Semantic diff (per-entity, by canonical content) between old dir and new payloads. */
export function diffArtifact(
  dir: string,
  files: Map<string, unknown>,
): DiffResult {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const [rel, data] of files) {
    if (rel === "manifest.json" || rel === "derived/changelog.json") continue;
    const path = join(dir, rel);
    const oldRaw = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (oldRaw === null) {
      added.push(rel);
      continue;
    }
    let oldData: unknown;
    try {
      oldData = JSON.parse(oldRaw);
    } catch {
      changed.push(rel);
      continue;
    }
    if (Array.isArray(data) && Array.isArray(oldData)) {
      const newMap = new Map(
        (data as Keyed[]).map((i) => [entityKey(rel, i), canonicalJson(i)]),
      );
      const oldMap = new Map(
        (oldData as Keyed[]).map((i) => [entityKey(rel, i), canonicalJson(i)]),
      );
      for (const k of newMap.keys()) if (!oldMap.has(k)) added.push(k);
      for (const k of oldMap.keys()) if (!newMap.has(k)) removed.push(k);
      for (const [k, v] of newMap) {
        if (oldMap.has(k) && oldMap.get(k) !== v) changed.push(k);
      }
    } else if (canonicalJson(data) !== canonicalJson(oldData)) {
      changed.push(rel);
    }
  }
  return {
    added,
    removed,
    changed,
    hasChanges: added.length + removed.length + changed.length > 0,
  };
}

function bumpVersion(prevManifest: Manifest, diff: DiffResult): string {
  const prevMajor = Number(prevManifest.schema_version.split(".")[0]);
  const currMajor = Number(SCHEMA_VERSION.split(".")[0]);
  if (prevMajor !== currMajor) return `${currMajor}.0.0`;
  const [maj = 1, min = 0, pat = 0] = prevManifest.data_version
    .split(".")
    .map(Number);
  if (diff.added.length + diff.removed.length > 0) return `${maj}.${min + 1}.0`;
  if (diff.changed.length > 0) return `${maj}.${min}.${pat + 1}`;
  return prevManifest.data_version;
}

export interface EmitResult {
  wrote: boolean;
  dataVersion: string;
  diff: DiffResult;
}

/**
 * Write the artifact if and only if content changed (idempotence, M15/M16).
 * Also emits schema/ and the rolling changelog.
 */
export function emitArtifact(
  dir: string,
  files: Map<string, unknown>,
  counts: EntityCounts,
  countsMismatch:
    Record<string, { expected: number; actual: number }> | undefined,
  parseWarnings: string[],
  sourceUrls: string[],
): EmitResult {
  const diff = diffArtifact(dir, files);
  const manifestPath = join(dir, "manifest.json");
  const prevManifest: Manifest | null = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest)
    : null;

  if (
    !diff.hasChanges &&
    prevManifest &&
    prevManifest.schema_version === SCHEMA_VERSION
  ) {
    return { wrote: false, dataVersion: prevManifest.data_version, diff };
  }

  const dataVersion = prevManifest ? bumpVersion(prevManifest, diff) : "1.0.0";
  const crawledAt = new Date().toISOString();

  const prevChangelog: ChangelogEntry[] = (() => {
    const p = join(dir, "derived/changelog.json");
    return existsSync(p)
      ? (JSON.parse(readFileSync(p, "utf8")) as ChangelogEntry[])
      : [];
  })();
  const entry: ChangelogEntry = {
    data_version: dataVersion,
    crawled_at: crawledAt,
    summary: prevManifest
      ? `${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed`
      : "initial crawl",
    added: diff.added,
    removed: diff.removed,
    changed: diff.changed,
  };
  const changelog = [entry, ...prevChangelog].slice(0, CHANGELOG_CAP);

  const all = new Map(files);
  all.set("derived/changelog.json", changelog);

  const sha: Record<string, string> = {};
  for (const [rel, data] of all) {
    if (rel === "manifest.json") continue;
    const text = canonicalJson(data);
    sha[rel] = sha256(text);
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }

  for (const [rel, schema] of Object.entries(ARTIFACT_FILES)) {
    const path = join(dir, "schema", schemaFileFor(rel));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, canonicalJson(schema));
  }

  const manifest: Manifest = {
    data_version: dataVersion,
    schema_version: SCHEMA_VERSION,
    crawled_at: crawledAt,
    source_urls: sourceUrls,
    sha256: sha,
    counts,
    ...(countsMismatch && Object.keys(countsMismatch).length > 0
      ? { counts_mismatch: countsMismatch }
      : {}),
    parse_warnings: parseWarnings,
  };
  writeFileSync(manifestPath, canonicalJson(manifest));
  return { wrote: true, dataVersion, diff };
}

export function renderDiffReport(
  result: EmitResult,
  warnings: string[],
): string {
  const { diff, dataVersion, wrote } = result;
  const lines = [
    `# Crawl diff report`,
    ``,
    wrote
      ? `Data version: **${dataVersion}** (artifact updated)`
      : `No changes — artifact untouched (version stays ${dataVersion}).`,
    ``,
    `- Added (${diff.added.length}): ${diff.added.slice(0, 50).join(", ") || "—"}`,
    `- Removed (${diff.removed.length}): ${diff.removed.slice(0, 50).join(", ") || "—"}`,
    `- Changed (${diff.changed.length}): ${diff.changed.slice(0, 50).join(", ") || "—"}`,
    ``,
    `## Parse warnings (${warnings.length})`,
    ...warnings.map((w) => `- ${w}`),
    ``,
  ];
  return lines.join("\n");
}
