// Loads the versioned FOCUS spec artifact (data/focus/) into a
// Map<spec_version, FocusVersionArtifact> keyed by index.json (spec
// "Version model", T-030). Each version dir loads through the generic
// artifact seam (T-028); index.json plus the derived diff are the
// cross-version integrity root, verified against their own sha256 map.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ArtifactValidationError,
  loadArtifactGeneric,
  sha256,
} from "../artifact-loader.js";
import type {
  FocusAttribute,
  FocusColumn,
  FocusDiff,
  FocusIndex,
  FocusVersionManifest,
  KpiMapping,
} from "./types.js";
import { FOCUS_ARTIFACT_FILES } from "./schemas.js";

export { ArtifactValidationError };

export interface FocusVersionArtifact {
  manifest: FocusVersionManifest;
  columns: FocusColumn[];
  attributes: FocusAttribute[];
  glossary_md: string;
  changelog_md: string;
}

export interface FocusStore {
  index: FocusIndex;
  versions: Map<string, FocusVersionArtifact>;
  diff: FocusDiff;
  kpiMapping: KpiMapping;
}

const REMEDIATION =
  'Re-run "node dist/crawlers/focus/cli.js" or restore data/focus/ from git; ' +
  "the server refuses to start on an invalid artifact.";

function loadVersionArtifact(dir: string): FocusVersionArtifact {
  return loadArtifactGeneric(dir, {
    files: FOCUS_ARTIFACT_FILES,
    remediation: REMEDIATION,
    assemble: (parsed, manifest) => ({
      manifest: manifest as FocusVersionManifest,
      columns: parsed.get("columns.json") as FocusColumn[],
      attributes: parsed.get("attributes.json") as FocusAttribute[],
      glossary_md: readFileSync(join(dir, "glossary.md"), "utf8"),
      changelog_md: readFileSync(join(dir, "CHANGELOG.md"), "utf8"),
    }),
  });
}

function readJson<T>(path: string, label: string): T {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new ArtifactValidationError(
      label,
      `cannot read file (${String(err)})`,
      REMEDIATION,
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new ArtifactValidationError(
      label,
      `not valid JSON (${String(err)})`,
      REMEDIATION,
    );
  }
}

/**
 * Load and validate the full FOCUS store: index.json, every version dir it
 * references (integrity-checked against index.json's manifest_sha256), and
 * the derived cross-version diff (integrity-checked against index.json's
 * derived map). Throws ArtifactValidationError with an actionable message.
 */
export function loadFocusStore(focusDir: string): FocusStore {
  const index = readJson<FocusIndex>(
    join(focusDir, "index.json"),
    "index.json",
  );

  const versions = new Map<string, FocusVersionArtifact>();
  for (const entry of index.versions) {
    const versionDir = join(focusDir, entry.dir);
    const manifestText = readFileSync(
      join(versionDir, "manifest.json"),
      "utf8",
    );
    const actualManifestSha = sha256(manifestText);
    if (actualManifestSha !== entry.manifest_sha256) {
      throw new ArtifactValidationError(
        "index.json",
        `manifest_sha256 mismatch for version ${entry.spec_version} ` +
          `(index ${entry.manifest_sha256.slice(0, 12)}…, file ${actualManifestSha.slice(0, 12)}…)`,
        REMEDIATION,
      );
    }
    versions.set(entry.spec_version, loadVersionArtifact(versionDir));
  }

  const derivedTexts = new Map<string, string>();
  for (const [filename, expectedSha] of Object.entries(index.derived)) {
    const path = join(focusDir, "derived", filename);
    const text = readFileSync(path, "utf8");
    const actual = sha256(text);
    if (actual !== expectedSha) {
      throw new ArtifactValidationError(
        filename,
        `sha256 mismatch (index.json ${expectedSha.slice(0, 12)}…, file ${actual.slice(0, 12)}…)`,
        REMEDIATION,
      );
    }
    derivedTexts.set(filename, text);
  }

  const diffFilename = [...derivedTexts.keys()].find((f) =>
    f.startsWith("diff-"),
  );
  if (!diffFilename) {
    throw new ArtifactValidationError(
      "index.json",
      "no derived diff file listed in index.json's derived map",
      REMEDIATION,
    );
  }
  const diff = JSON.parse(
    derivedTexts.get(diffFilename) as string,
  ) as FocusDiff;

  const kpiMappingText = derivedTexts.get("kpi-mapping.json");
  if (!kpiMappingText) {
    throw new ArtifactValidationError(
      "index.json",
      "no kpi-mapping.json listed in index.json's derived map",
      REMEDIATION,
    );
  }
  const kpiMapping = JSON.parse(kpiMappingText) as KpiMapping;
  for (const entry of kpiMapping.kpis) {
    for (const [version, columnIds] of Object.entries(
      entry.columns_by_version,
    )) {
      const artifact = versions.get(version);
      if (!artifact) {
        throw new ArtifactValidationError(
          "derived/kpi-mapping.json",
          `KPI "${entry.kpi_slug}" references unknown FOCUS version "${version}"`,
          REMEDIATION,
        );
      }
      const knownIds = new Set(artifact.columns.map((c) => c.id));
      for (const id of columnIds) {
        if (!knownIds.has(id)) {
          throw new ArtifactValidationError(
            "derived/kpi-mapping.json",
            `KPI "${entry.kpi_slug}" references unknown column "${id}" for FOCUS ${version}`,
            REMEDIATION,
          );
        }
      }
    }
  }

  return { index, versions, diff, kpiMapping };
}
