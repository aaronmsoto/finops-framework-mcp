// DEFAULT_VERSION is a hand-maintained constant, while the server
// instructions and version-param descriptions advertise it as the default.
// This guard fails the test gate the moment a new FOCUS version lands in
// data/focus with a newer `latest`, forcing a conscious default bump (or a
// deliberate decision to pin) instead of silent drift between the shipped
// data and the advertised default.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFocusStore } from "../../shared/index.js";
import { DEFAULT_VERSION } from "./tools.js";

const FOCUS_DIR = join(import.meta.dirname, "../../../data/focus");

describe("DEFAULT_VERSION tracks the shipped data's latest version", () => {
  it("equals data/focus index.latest", () => {
    const store = loadFocusStore(FOCUS_DIR);
    expect(DEFAULT_VERSION).toBe(store.index.latest);
  });
});
