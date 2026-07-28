import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { CachedFetcher } from "../../shared/http.js";
import type {
  FocusColumn,
  FocusIndex,
  FocusIndexVersionEntry,
} from "../../shared/focus/types.js";
import { diffColumns } from "./diff.js";
import {
  emitDerivedDiff,
  emitDerivedKpiMapping,
  emitIndex,
  emitVersionArtifact,
} from "./emit.js";
import { ingestVersion } from "./ingest.js";
import { KPI_MAPPING } from "./kpi-mapping-data.js";
import { ORIGIN, USER_AGENT, VERSIONS, isValidFocusBody } from "./urls.js";

export interface IngestOptions {
  dataDir: string;
  cacheDir: string;
  useCache: boolean;
  log: (msg: string) => void;
}

/**
 * Ingests every pinned FOCUS spec version (v1: 1.0 and 1.2) from its git
 * tag, emits data/focus/{version}/ artifacts + manifests, the 1.0-to-1.2
 * diff, and data/focus/index.json (spec "Version model").
 */
export async function ingest(opts: IngestOptions): Promise<number> {
  const fetcher = new CachedFetcher(opts.cacheDir, opts.useCache, {
    origin: ORIGIN,
    userAgent: USER_AGENT,
    isValidBody: isValidFocusBody,
  });

  const indexVersions: FocusIndexVersionEntry[] = [];
  const columnsByVersion = new Map<
    string,
    { spec_version: string; source_tag: string; columns: FocusColumn[] }
  >();

  for (const version of VERSIONS) {
    const ingested = await ingestVersion(fetcher, version);

    const files = new Map<string, unknown>();
    for (const [slug, md] of ingested.columnMd)
      files.set(`columns/${slug}.md`, md);
    files.set("columns.json", ingested.columns);
    for (const [slug, md] of ingested.attributeMd) {
      files.set(`attributes/${slug}.md`, md);
    }
    files.set("attributes.json", ingested.attributes);
    files.set("glossary.md", ingested.glossaryMd);
    files.set("CHANGELOG.md", ingested.changelogMd);

    const dir = join(opts.dataDir, version.spec_version);
    const result = emitVersionArtifact(dir, files, {
      specVersion: version.spec_version,
      sourceTag: version.source_tag,
      sourceUrls: ingested.sourceUrls,
      ingestReport: ingested.report,
      parseWarnings: [...ingested.warnings].sort(),
    });

    opts.log(
      `${version.spec_version} (${version.source_tag}): ${ingested.columns.length} columns ` +
        `(${ingested.report.columns.parsed} parsed, ${ingested.report.columns.markdown_only} markdown-only), ` +
        `${ingested.attributes.length} attributes (${ingested.report.attributes.parsed} parsed, ` +
        `${ingested.report.attributes.markdown_only} markdown-only) — ` +
        `${result.wrote ? "written" : "unchanged"}`,
    );

    indexVersions.push({
      spec_version: version.spec_version,
      dir: version.spec_version,
      data_version: result.manifest.data_version,
      source_tag: version.source_tag,
      manifest_sha256: result.manifestSha256,
    });
    columnsByVersion.set(version.spec_version, {
      spec_version: version.spec_version,
      source_tag: version.source_tag,
      columns: ingested.columns,
    });
  }

  const first = VERSIONS[0] as (typeof VERSIONS)[number];
  const last = VERSIONS[VERSIONS.length - 1] as (typeof VERSIONS)[number];
  const from = columnsByVersion.get(first.spec_version);
  const to = columnsByVersion.get(last.spec_version);
  if (!from || !to) throw new Error("missing ingested version data for diff");
  const diff = diffColumns(from, to);
  const derivedDiff = emitDerivedDiff(opts.dataDir, diff);
  opts.log(
    `diff ${diff.from}->${diff.to}: ${diff.added_columns.length} added, ` +
      `${diff.removed_columns.length} removed, ${diff.changed_columns.length} changed`,
  );

  const derivedKpiMapping = emitDerivedKpiMapping(opts.dataDir, KPI_MAPPING);
  opts.log(`kpi mapping: ${KPI_MAPPING.kpis.length} KPIs (unofficial)`);

  // Bundled sample CSVs (data/focus/samples/) are registered separately by
  // scripts/bundle-focus-samples.mjs, not this ingest pipeline — carry
  // forward whatever index.json already has so an ingest-only refresh
  // (no network fetch touches samples) never wipes that registration.
  const indexPath = join(opts.dataDir, "index.json");
  const existingSamples: Record<string, string> = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, "utf8")) as FocusIndex).samples
    : {};

  emitIndex(
    opts.dataDir,
    last.spec_version,
    indexVersions,
    {
      [derivedDiff.filename]: derivedDiff.sha256,
      [derivedKpiMapping.filename]: derivedKpiMapping.sha256,
    },
    existingSamples,
  );

  opts.log(
    `fetch: ${fetcher.report.fetched.length} network, ${fetcher.report.fromCache.length} cached, ` +
      `${fetcher.report.skippedByRobots.length} robots-skipped`,
  );
  return 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const value = (name: string, def: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? (args[i + 1] as string) : def;
  };
  const code = await ingest({
    dataDir: value("--data-dir", "data/focus"),
    cacheDir: value("--cache-dir", ".cache/crawl-focus"),
    useCache: !flag("--no-cache"),
    log: (m) => console.error(m),
  });
  process.exit(code);
}

if (isDirectRunOf(import.meta.url)) {
  main().catch((err) => {
    console.error(String(err instanceof Error ? err.stack : err));
    process.exit(1);
  });
}
