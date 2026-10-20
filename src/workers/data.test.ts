// Pure-function tests for loadWorkerData's Map rehydration (review R2 —
// bundle-data.test.ts already pins the generated JSON modules against a
// fresh data/ load, but never exercised loadWorkerData() itself, so a
// rehydration bug — e.g. forgetting a field, or returning the raw object
// instead of a Map — would have shipped undetected).
import { describe, expect, it } from "vitest";
import { loadWorkerData } from "./data.js";
import frameworkArtifact from "./generated/framework-artifact.js";
import focusStoreData from "./generated/focus-store.js";
import tokenomicsArtifactData from "./generated/tokenomics-artifact.js";

describe("loadWorkerData", () => {
  it("returns the generated framework artifact unchanged", () => {
    const { frameworkArtifact: loaded } = loadWorkerData();
    expect(loaded).toEqual(frameworkArtifact);
  });

  it("rehydrates focusStore.versions and sampleCsv as Maps with the source data's entries", () => {
    const { focusStore } = loadWorkerData();

    expect(focusStore.versions).toBeInstanceOf(Map);
    expect(Object.fromEntries(focusStore.versions)).toEqual(
      focusStoreData.versions,
    );

    expect(focusStore.sampleCsv).toBeInstanceOf(Map);
    expect(Object.fromEntries(focusStore.sampleCsv)).toEqual(
      focusStoreData.sampleCsv,
    );
  });

  it("passes through the non-Map focusStore fields unchanged", () => {
    const { focusStore } = loadWorkerData();

    expect(focusStore.index).toEqual(focusStoreData.index);
    expect(focusStore.diff).toEqual(focusStoreData.diff);
    expect(focusStore.kpiMapping).toEqual(focusStoreData.kpiMapping);
    expect(focusStore.sampleManifest).toEqual(focusStoreData.sampleManifest);
  });

  it("rehydrates tokenomicsArtifact.documentBodies as a Map and passes the rest through", () => {
    const { tokenomicsArtifact } = loadWorkerData();

    expect(tokenomicsArtifact.documentBodies).toBeInstanceOf(Map);
    expect(Object.fromEntries(tokenomicsArtifact.documentBodies)).toEqual(
      tokenomicsArtifactData.documentBodies,
    );
    expect(tokenomicsArtifact.documentBodies.size).toBe(
      tokenomicsArtifact.documents.length,
    );
    expect({ ...tokenomicsArtifact, documentBodies: null }).toEqual({
      ...tokenomicsArtifactData,
      documentBodies: null,
    });
  });

  it("is pure — repeated calls return equal but independent Map instances", () => {
    const first = loadWorkerData();
    const second = loadWorkerData();

    expect(first.focusStore.versions).not.toBe(second.focusStore.versions);
    expect(first.focusStore.versions).toEqual(second.focusStore.versions);
  });
});
