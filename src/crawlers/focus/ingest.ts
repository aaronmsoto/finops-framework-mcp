import type { CachedFetcher } from "../../shared/http.js";
import type { FocusAttribute, FocusColumn } from "../../shared/focus/types.js";
import { parseAttributeFile } from "./parse/attributes.js";
import { parseColumnFile } from "./parse/columns.js";
import { rawUrl, jsDelivrFlatTreeUrl, type FocusVersionDef } from "./urls.js";

interface JsDelivrFlatTree {
  files: { name: string; size: number }[];
}

function includeListFilenames(mdpp: string): string[] {
  return [...mdpp.matchAll(/^!INCLUDE\s+"([^"]+)"/gm)].map(
    (m) => m[1] as string,
  );
}

function treeFilenames(tree: JsDelivrFlatTree, dirPrefix: string): string[] {
  const prefix = `/specification/${dirPrefix}/`;
  return tree.files
    .filter((f) => f.name.startsWith(prefix) && f.name.endsWith(".md"))
    .map((f) => f.name.slice(prefix.length));
}

/** Symmetric-difference check between the !INCLUDE list and the jsDelivr
 * flat file tree (spec: "cross-checks the jsDelivr flat tree"). */
function assertSetsMatch(
  label: string,
  fromIncludeList: string[],
  fromTree: string[],
): void {
  const a = new Set(fromIncludeList);
  const b = new Set(fromTree);
  const onlyInclude = [...a].filter((x) => !b.has(x)).sort();
  const onlyTree = [...b].filter((x) => !a.has(x)).sort();
  if (onlyInclude.length > 0 || onlyTree.length > 0) {
    throw new Error(
      `${label}: !INCLUDE list disagrees with jsDelivr tree — ` +
        `only in !INCLUDE: [${onlyInclude.join(", ")}]; only in tree: [${onlyTree.join(", ")}]`,
    );
  }
}

export interface IngestReport {
  parsed: number;
  markdown_only: number;
}

export interface IngestedVersion {
  columns: FocusColumn[];
  attributes: FocusAttribute[];
  columnMd: Map<string, string>;
  attributeMd: Map<string, string>;
  glossaryMd: string;
  changelogMd: string;
  sourceUrls: string[];
  warnings: string[];
  report: { columns: IngestReport; attributes: IngestReport };
}

function tally(items: { parse_quality: string }[]): IngestReport {
  return {
    parsed: items.filter((i) => i.parse_quality === "parsed").length,
    markdown_only: items.filter((i) => i.parse_quality === "markdown_only")
      .length,
  };
}

/**
 * Fetches and parses one FOCUS spec version from its git tag (spec
 * "Sources"): enumerates columns from columns.mdpp's !INCLUDE list, asserts
 * the pinned count, cross-checks the jsDelivr flat tree, then fetches every
 * column/attribute/glossary/CHANGELOG file via raw.githubusercontent.
 */
export async function ingestVersion(
  fetcher: CachedFetcher,
  version: FocusVersionDef,
): Promise<IngestedVersion> {
  const { source_tag: tag } = version;
  const sourceUrls: string[] = [];
  const warnings: string[] = [];
  const fetchText = async (path: string): Promise<string> => {
    const url = rawUrl(tag, path);
    sourceUrls.push(url);
    return fetcher.text(url);
  };

  const columnsMdpp = await fetchText("specification/columns/columns.mdpp");
  const columnFilenames = includeListFilenames(columnsMdpp).sort();
  if (columnFilenames.length !== version.expected_columns) {
    throw new Error(
      `${tag}: expected ${version.expected_columns} columns in columns.mdpp, found ${columnFilenames.length}`,
    );
  }

  const tree = await fetcher.json<JsDelivrFlatTree>(jsDelivrFlatTreeUrl(tag));
  assertSetsMatch(
    `${tag} columns`,
    columnFilenames,
    treeFilenames(tree, "columns"),
  );

  const attributesMdpp = await fetchText(
    "specification/attributes/attributes.mdpp",
  );
  const attributeFilenames = includeListFilenames(attributesMdpp).sort();
  assertSetsMatch(
    `${tag} attributes`,
    attributeFilenames,
    treeFilenames(tree, "attributes"),
  );

  const columns: FocusColumn[] = [];
  const columnMd = new Map<string, string>();
  for (const filename of columnFilenames) {
    const slug = filename.replace(/\.md$/, "");
    const path = `specification/columns/${filename}`;
    const md = await fetchText(path);
    const { column, warnings: w } = parseColumnFile(md, {
      slug,
      sourceUrl: rawUrl(tag, path),
    });
    columns.push(column);
    columnMd.set(slug, md);
    warnings.push(...w);
  }

  const attributes: FocusAttribute[] = [];
  const attributeMd = new Map<string, string>();
  for (const filename of attributeFilenames) {
    const slug = filename.replace(/\.md$/, "");
    const path = `specification/attributes/${filename}`;
    const md = await fetchText(path);
    const { attribute, warnings: w } = parseAttributeFile(md, {
      slug,
      sourceUrl: rawUrl(tag, path),
    });
    attributes.push(attribute);
    attributeMd.set(slug, md);
    warnings.push(...w);
  }

  const glossaryMd = await fetchText("specification/glossary.md");
  const changelogMd = await fetchText("CHANGELOG.md");

  columns.sort((a, b) => a.id.localeCompare(b.id));
  attributes.sort((a, b) => a.id.localeCompare(b.id));

  return {
    columns,
    attributes,
    columnMd,
    attributeMd,
    glossaryMd,
    changelogMd,
    sourceUrls: [...new Set(sourceUrls)].sort(),
    warnings,
    report: { columns: tally(columns), attributes: tally(attributes) },
  };
}
