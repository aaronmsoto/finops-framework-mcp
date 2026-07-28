// Fs-free assembly of the two MCP data artifacts for the Cloudflare Worker
// (T-037). The worker is stateless and must never touch node:fs at runtime
// (data is loaded from disk, ajv-validated, and hashed only at build time by
// scripts/bundle-worker-data.mjs) — this module only imports the generated
// JSON modules under ./generated/ and rehydrates FocusStore's two Map
// fields, which aren't JSON-representable, back from plain objects.
//
// NOTE: the `Artifact`/`FocusVersionArtifact` types are imported here as
// `import type` only, so they are erased at compile time and never make
// node:fs (transitively reachable from ../shared/focus/artifact.js) part of
// this module's runtime import graph.
import type { Artifact } from "../shared/types.js";
import type {
  FocusVersionArtifact,
  FocusStore,
} from "../shared/focus/artifact.js";
import type {
  FocusDiff,
  FocusIndex,
  FocusSampleManifest,
  KpiMapping,
} from "../shared/focus/types.js";
import frameworkArtifact from "./generated/framework-artifact.js";
import focusStoreData from "./generated/focus-store.js";

/** The JSON-safe shape scripts/bundle-worker-data.mjs emits for FocusStore:
 * identical except the two Map fields are plain objects. */
export interface SerializedFocusStore {
  index: FocusIndex;
  versions: Record<string, FocusVersionArtifact>;
  diff: FocusDiff;
  kpiMapping: KpiMapping;
  sampleManifest: FocusSampleManifest;
  sampleCsv: Record<string, string>;
}

export interface WorkerData {
  frameworkArtifact: Artifact;
  focusStore: FocusStore;
}

/** Rebuilds the Map fields from the generated plain-object modules. Pure —
 * safe to call once per worker isolate (module scope) or per request. */
export function loadWorkerData(): WorkerData {
  const serialized: SerializedFocusStore = focusStoreData;
  const focusStore: FocusStore = {
    index: serialized.index,
    versions: new Map(Object.entries(serialized.versions)),
    diff: serialized.diff,
    kpiMapping: serialized.kpiMapping,
    sampleManifest: serialized.sampleManifest,
    sampleCsv: new Map(Object.entries(serialized.sampleCsv)),
  };
  return { frameworkArtifact, focusStore };
}
