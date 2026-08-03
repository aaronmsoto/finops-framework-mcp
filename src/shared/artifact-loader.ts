import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/** Generic seam every versioned data artifact (framework, FOCUS, ...) loads through. */

export class ArtifactValidationError extends Error {
  constructor(
    readonly file: string,
    readonly detail: string,
    remediation: string,
  ) {
    super(`data artifact invalid: ${file} — ${detail}. ${remediation}`);
    this.name = "ArtifactValidationError";
  }
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Manifest shape the seam relies on: a sha256 map covering every other file. */
export interface ManifestLike {
  sha256: Record<string, string>;
}

export interface LoadArtifactOptions<T> {
  /** Artifact file path (relative to `dir`) → JSON Schema. Must include "manifest.json". */
  files: Record<string, Record<string, unknown>>;
  /** Assembles the typed artifact from the validated, parsed files. */
  assemble: (parsed: Map<string, unknown>, manifest: ManifestLike) => T;
  /** Referential checks JSON Schema alone cannot express; throws ArtifactValidationError. */
  crossValidate?: (artifact: T) => void;
  /** Actionable remediation text appended to every ArtifactValidationError message. */
  remediation: string;
}

function readJson(dir: string, rel: string, remediation: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(join(dir, rel), "utf8");
  } catch (err) {
    throw new ArtifactValidationError(
      rel,
      `cannot read file (${String(err)})`,
      remediation,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new ArtifactValidationError(
      rel,
      `not valid JSON (${String(err)})`,
      remediation,
    );
  }
}

function buildValidators(
  files: Record<string, Record<string, unknown>>,
): Map<string, ValidateFunction> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const out = new Map<string, ValidateFunction>();
  for (const [rel, schema] of Object.entries(files)) {
    out.set(rel, ajv.compile(schema));
  }
  return out;
}

/**
 * Load and validate a versioned data artifact against its own schema set,
 * manifest hash map, and (optional) referential checks. Throws
 * ArtifactValidationError with an actionable message on any schema
 * violation, hash mismatch, or missing file.
 */
export function loadArtifactGeneric<T>(
  dir: string,
  opts: LoadArtifactOptions<T>,
): T {
  const validators = buildValidators(opts.files);
  const parsed = new Map<string, unknown>();

  for (const rel of Object.keys(opts.files)) {
    const data = readJson(dir, rel, opts.remediation);
    const validate = validators.get(rel) as ValidateFunction;
    if (!validate(data)) {
      const first = validate.errors?.[0];
      throw new ArtifactValidationError(
        rel,
        `schema violation at "${first?.instancePath ?? ""}": ${first?.message ?? "unknown"}`,
        opts.remediation,
      );
    }
    parsed.set(rel, data);
  }

  const manifest = parsed.get("manifest.json") as ManifestLike;

  // Manifest hashes must match the files on disk (integrity of the seam).
  for (const [rel, expected] of Object.entries(manifest.sha256)) {
    if (rel === "manifest.json") continue;
    const actual = sha256(readFileSync(join(dir, rel), "utf8"));
    if (actual !== expected) {
      throw new ArtifactValidationError(
        rel,
        `sha256 mismatch (manifest ${expected.slice(0, 12)}…, file ${actual.slice(0, 12)}…)`,
        opts.remediation,
      );
    }
  }

  const artifact = opts.assemble(parsed, manifest);
  opts.crossValidate?.(artifact);
  return artifact;
}
