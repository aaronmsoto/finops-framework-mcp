import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Kpi } from "../types.js";
import type { FocusColumn, KpiMapping } from "./types.js";

const ROOT = join(import.meta.dirname, "../../../data");

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as T;
}

const kpiMapping = readJson<KpiMapping>("focus/derived/kpi-mapping.json");
const frameworkKpis = readJson<Kpi[]>("framework/content/kpis.json");
const frameworkCapabilities = readJson<{ slug: string }[]>(
  "framework/content/capabilities.json",
);
const columnsByVersion: Record<string, FocusColumn[]> = {
  "1.0": readJson<FocusColumn[]>("focus/1.0/columns.json"),
  "1.2": readJson<FocusColumn[]>("focus/1.2/columns.json"),
};

describe("data/focus/derived/kpi-mapping.json (T-033 acceptance)", () => {
  it("maps 15-20 KPIs, methodology present, every record official:false", () => {
    expect(kpiMapping.official).toBe(false);
    expect(kpiMapping.methodology.length).toBeGreaterThan(50);
    expect(kpiMapping.kpis.length).toBeGreaterThanOrEqual(15);
    expect(kpiMapping.kpis.length).toBeLessThanOrEqual(20);
    for (const entry of kpiMapping.kpis) {
      expect(entry.official).toBe(false);
    }
  });

  it("covers the ESR, commitment-discount, forecast-accuracy, and unit-economics groups", () => {
    const categories = new Set(kpiMapping.kpis.map((k) => k.category));
    expect(categories).toContain("effective_savings_rate");
    expect(categories).toContain("commitment_discounts");
    expect(categories).toContain("forecast_accuracy");
    expect(categories).toContain("unit_economics");
  });

  it("has no duplicate kpi_slug entries", () => {
    const slugs = kpiMapping.kpis.map((k) => k.kpi_slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cross-validates every kpi_slug against data/framework/content/kpis.json", () => {
    const frameworkSlugs = new Set(frameworkKpis.map((k) => k.slug));
    for (const entry of kpiMapping.kpis) {
      expect(
        frameworkSlugs.has(entry.kpi_slug),
        `kpi_slug "${entry.kpi_slug}" not found in framework kpis.json`,
      ).toBe(true);
    }
  });

  it("kpi_title matches the framework KPI's title", () => {
    const byslug = new Map(frameworkKpis.map((k) => [k.slug, k]));
    for (const entry of kpiMapping.kpis) {
      expect(byslug.get(entry.kpi_slug)?.title).toBe(entry.kpi_title);
    }
  });

  it("cross-validates every related_capability_slugs entry against data/framework/content/capabilities.json", () => {
    const capSlugs = new Set(frameworkCapabilities.map((c) => c.slug));
    for (const entry of kpiMapping.kpis) {
      for (const cap of entry.related_capability_slugs) {
        expect(
          capSlugs.has(cap),
          `KPI "${entry.kpi_slug}" references unknown capability "${cap}"`,
        ).toBe(true);
      }
    }
  });

  it("cross-validates every referenced column against its target FOCUS version artifact", () => {
    for (const entry of kpiMapping.kpis) {
      expect(Object.keys(entry.columns_by_version).length).toBeGreaterThan(0);
      for (const [version, columnIds] of Object.entries(
        entry.columns_by_version,
      )) {
        const knownColumns = columnsByVersion[version];
        expect(
          knownColumns,
          `KPI "${entry.kpi_slug}" references unknown FOCUS version "${version}"`,
        ).toBeDefined();
        const knownIds = new Set(
          (knownColumns as FocusColumn[]).map((c) => c.id),
        );
        expect(columnIds.length).toBeGreaterThan(0);
        for (const id of columnIds) {
          expect(
            knownIds.has(id),
            `KPI "${entry.kpi_slug}" references unknown column "${id}" for FOCUS ${version}`,
          ).toBe(true);
        }
      }
    }
  });

  it("every focus_formula names at least one of its mapped columns", () => {
    for (const entry of kpiMapping.kpis) {
      const anyVersionColumns = Object.values(entry.columns_by_version)[0] as
        string[] | undefined;
      expect(anyVersionColumns).toBeDefined();
      const mentioned = (anyVersionColumns as string[]).some((id) =>
        entry.focus_formula.includes(id),
      );
      expect(
        mentioned,
        `KPI "${entry.kpi_slug}" formula doesn't mention any mapped column`,
      ).toBe(true);
    }
  });
});
