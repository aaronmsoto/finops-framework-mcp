import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { isDirectRunOf } from "../../shared/direct-run.js";
import { CachedFetcher } from "../../shared/http.js";
import { walkMarkdownFiles } from "../../shared/markdown/derive.js";
import { documentMarkdownPath } from "../../shared/tokenomics/artifact.js";
import { TOKENOMICS_ARTIFACT_FILES } from "../../shared/tokenomics/schemas.js";
import type { TkManifest } from "../../shared/tokenomics/types.js";
import {
  assess,
  buildCrossLinks,
  buildCrosswalk,
  composeFromHtml,
  deriveEntities,
  type Entities,
} from "./build.js";
import { importCurriculum } from "./curriculum.js";
import { emitArtifact } from "./emit.js";
import {
  DENY_PATH_PREFIXES,
  isValidTokenomicsBody,
  ORIGIN,
  REGISTRY,
  REST_LISTINGS,
  USER_AGENT,
} from "./urls.js";

// Tokenomics Foundation crawler CLI (spec "Pipeline"):
//   refresh            fetch → parse → compose md → derive → assess → validate → emit
//   derive             offline: committed markdown → JSON (byte-identical)
//   import-curriculum  local-only experimental overlay from a cert-prep checkout

export interface CliOptions {
  dataDir: string;
  cacheDir: string;
  focusDir: string;
  useCache: boolean;
  softCounts: boolean;
  /** Read registry pages from `<dir>/<slug>.html` instead of the network. */
  htmlDir: string | null;
  now: () => string;
  log: (m: string) => void;
}

interface RestItem {
  link?: string;
  modified?: string;
}

function focusColumnIds(focusDir: string): Set<string> {
  const p = join(focusDir, "1.2", "columns.json");
  const cols = JSON.parse(readFileSync(p, "utf8")) as { id: string }[];
  return new Set(cols.map((c) => c.id));
}

function focusAttributes(focusDir: string): Map<string, string> {
  const p = join(focusDir, "1.2", "attributes.json");
  const attrs = JSON.parse(readFileSync(p, "utf8")) as {
    id: string;
    slug: string;
  }[];
  return new Map(attrs.map((a) => [a.id, a.slug]));
}

function isDenied(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return DENY_PATH_PREFIXES.some((p) => path.startsWith(p));
  } catch {
    return true;
  }
}

function validateAll(files: Map<string, unknown>): string[] {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const errors: string[] = [];
  for (const [rel, schema] of Object.entries(TOKENOMICS_ARTIFACT_FILES)) {
    if (rel === "manifest.json" || rel === "derived/changelog.json") continue;
    const validate = ajv.compile(schema);
    if (!validate(files.get(rel))) {
      const e = validate.errors?.[0];
      errors.push(
        `${rel}: ${e?.instancePath ?? ""} ${e?.message ?? "invalid"}`,
      );
    }
  }
  return errors;
}

function jsonFiles(
  e: Entities,
  md: Map<string, string>,
  focusIds: Set<string>,
  focusAttrs: Map<string, string>,
): Map<string, unknown> {
  const bodies = new Map<string, string>();
  for (const d of e.documents) {
    const text = md.get(documentMarkdownPath(d.slug)) as string;
    bodies.set(d.slug, text.slice(text.indexOf("\n---\n") + 5));
  }
  const files = new Map<string, unknown>([
    ["content/documents.json", e.documents],
    ["content/stages.json", e.stages],
    ["content/layers.json", e.layers],
    ["content/bigt.json", e.bigt],
    ["content/levers.json", e.levers],
    ["content/metrics.json", e.metrics],
    ["content/personas.json", e.personas],
    ["content/value.json", e.value],
    ["content/glossary.json", e.glossary],
    ["content/focus-tracker.json", e.focusTracker],
    ["content/cache-providers.json", e.cacheProviders],
    [
      "derived/crosslinks.json",
      buildCrossLinks(e, bodies, focusIds, focusAttrs),
    ],
    ["derived/crosswalk.json", buildCrosswalk()],
  ]);
  for (const [rel, text] of md) files.set(rel, text);
  return files;
}

function finish(
  opts: CliOptions,
  md: Map<string, string>,
  meta: { sourceUrls: string[]; unregistered: string[]; now: string },
): number {
  const entities = deriveEntities(md);
  const a = assess(entities, md);
  for (const w of a.warnings) opts.log(`warn: ${w}`);
  const countErrors = a.errors.filter((x) => x.startsWith("count "));
  const hardErrors = opts.softCounts
    ? a.errors.filter((x) => !x.startsWith("count "))
    : a.errors;
  if (opts.softCounts) for (const c of countErrors) opts.log(`soft: ${c}`);
  if (hardErrors.length) {
    for (const x of hardErrors) opts.log(`error: ${x}`);
    return 1;
  }
  const files = jsonFiles(
    entities,
    md,
    focusColumnIds(opts.focusDir),
    focusAttributes(opts.focusDir),
  );
  const schemaErrors = validateAll(files);
  if (schemaErrors.length) {
    for (const x of schemaErrors) opts.log(`schema: ${x}`);
    return 1;
  }
  const r = emitArtifact({
    dir: opts.dataDir,
    files,
    counts: a.counts,
    parseWarnings: [...a.warnings, ...(opts.softCounts ? countErrors : [])],
    sourceUrls: meta.sourceUrls,
    unregistered: meta.unregistered,
    now: meta.now,
  });
  opts.log(
    r.wrote
      ? `wrote ${opts.dataDir} data v${r.dataVersion} (+${r.added.length} ~${r.changed.length} -${r.removed.length})`
      : `no changes; ${opts.dataDir} stays at data v${r.dataVersion}`,
  );
  return 0;
}

export async function refresh(opts: CliOptions): Promise<number> {
  const html = new Map<string, string>();
  const modified = new Map<string, string>();
  let unregistered: string[] = [];
  if (opts.htmlDir) {
    for (const e of REGISTRY) {
      html.set(
        e.slug,
        readFileSync(join(opts.htmlDir, `${e.slug}.html`), "utf8"),
      );
    }
  } else {
    const fetcher = new CachedFetcher(opts.cacheDir, opts.useCache, {
      origin: ORIGIN,
      userAgent: USER_AGENT,
      isValidBody: isValidTokenomicsBody,
    });
    const discovered = new Set<string>();
    for (const url of REST_LISTINGS) {
      const items = await fetcher.json<RestItem[]>(url);
      for (const it of items) {
        if (!it.link) continue;
        discovered.add(it.link);
        if (it.modified) modified.set(it.link, it.modified.slice(0, 10));
      }
    }
    const registered = new Set(REGISTRY.map((e) => e.url));
    unregistered = [...discovered]
      .filter((u) => u.startsWith(ORIGIN) && !registered.has(u) && !isDenied(u))
      .sort();
    for (const e of REGISTRY) html.set(e.slug, await fetcher.text(e.url));
    opts.log(
      `fetched ${fetcher.report.fetched.length}, from cache ${fetcher.report.fromCache.length}, robots-skipped ${fetcher.report.skippedByRobots.length}`,
    );
  }
  const md = composeFromHtml(html, modified);
  const prev = readPrevManifest(opts.dataDir);
  return finish(opts, md, {
    sourceUrls: REGISTRY.map((e) => e.url),
    unregistered,
    // Unchanged content keeps the previous crawl time (byte-identical rerun);
    // emit only persists `now` when something actually changed.
    now: opts.now(),
    ...(prev && opts.htmlDir ? { unregistered: prev.unregistered } : {}),
  });
}

function readPrevManifest(dir: string): TkManifest | null {
  const p = join(dir, "manifest.json");
  return existsSync(p)
    ? (JSON.parse(readFileSync(p, "utf8")) as TkManifest)
    : null;
}

export function derive(opts: CliOptions): number {
  const prev = readPrevManifest(opts.dataDir);
  if (!prev) {
    opts.log(
      `error: ${opts.dataDir}/manifest.json not found; run refresh first`,
    );
    return 1;
  }
  const md = new Map<string, string>();
  for (const [rel, text] of walkMarkdownFiles(
    join(opts.dataDir, "content/markdown"),
  )) {
    md.set(`content/markdown/${rel}`, text);
  }
  return finish(opts, md, {
    sourceUrls: prev.source_urls,
    unregistered: prev.unregistered,
    now: prev.crawled_at,
  });
}

const USAGE =
  "usage: cli.js refresh [--no-cache] [--soft-counts] [--html-dir DIR] [--data-dir DIR]\n" +
  "       cli.js derive [--data-dir DIR]\n" +
  "       cli.js import-curriculum --from <cert-prep>/ai-tokenomics [--out DIR]";

export async function main(
  args: string[],
  log = (m: string) => console.error(m),
): Promise<number> {
  const command = args[0];
  const flag = (name: string) => args.includes(name);
  const value = (name: string, def: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? (args[i + 1] as string) : def;
  };
  const opts: CliOptions = {
    dataDir: value("--data-dir", "data/tokenomics"),
    cacheDir: value("--cache-dir", ".cache/crawl-tokenomics"),
    focusDir: value("--focus-dir", "data/focus"),
    useCache: !flag("--no-cache"),
    softCounts: flag("--soft-counts"),
    htmlDir: args.includes("--html-dir") ? value("--html-dir", "") : null,
    now: () => new Date().toISOString(),
    log,
  };
  if (command === "refresh") return refresh(opts);
  if (command === "derive") return derive(opts);
  if (command === "import-curriculum") {
    const from = value("--from", "");
    if (!from) {
      log(USAGE);
      return 2;
    }
    const out = value("--out", ".cache/tokenomics-curriculum");
    const r = importCurriculum(resolve(from), resolve(out));
    log(
      `wrote curriculum overlay to ${out}: ${r.modules} modules, ${r.glossary} glossary terms, ${r.numbers} numbers`,
    );
    return 0;
  }
  log(USAGE);
  return 2;
}

if (isDirectRunOf(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(String(err instanceof Error ? err.stack : err));
      process.exit(1);
    },
  );
}
