import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bigtSlug,
  extractBigT,
  extractCacheMetrics,
  extractCacheProviders,
  ExtractError,
  extractFocusTracker,
  extractLayers,
  extractPersonas,
  extractProseMetrics,
  extractStages,
  extractValue,
  prov,
} from "./entities.js";
import { formulaLines, renderSections, spacedText } from "./render.js";
import { load } from "cheerio";

const fx = (slug: string) =>
  readFileSync(
    join(import.meta.dirname, "../fixtures", `${slug}.html`),
    "utf8",
  );

describe("cache explainer extraction", () => {
  it("linearizes the stacked-fraction formulas from the page's own text", () => {
    const m = extractCacheMetrics(fx("cache-explainer"));
    expect(m.map((x) => x.slug)).toEqual([
      "cache-hit-rate",
      "cache-cost-efficiency",
      "uncached-equivalent-cost",
    ]);
    expect(m[0]?.targets[0]).toMatch(/^climb toward your workload's ceiling/);
    expect(m[1]?.definition_md).toContain("zero at break-even");
  });

  it("reads the provider snapshot with its review date", () => {
    const p = extractCacheProviders(fx("cache-explainer"));
    expect(p.map((x) => x.slug)).toEqual(["anthropic", "openai", "google"]);
    expect(p[2]?.write_charge).toContain("No write charge");
  });
});

describe("stack, Big-T, personas, value, FOCUS", () => {
  it("extracts five layers with levers and components", () => {
    const l = extractLayers(fx("five-layer-stack-paper"));
    expect(l.map((x) => x.name)).toEqual([
      "Silicon",
      "Capacity",
      "Inference stack",
      "Model management and selection",
      "Routing and governance",
    ]);
    expect(l[2]?.primary_levers).toContain("prefix and KV cache");
    expect(l[4]?.components.length).toBeGreaterThan(0);
  });

  it("extracts the Big-T notation, variables and ladder in order", () => {
    const b = extractBigT(fx("big-t-notation"));
    expect(b.variables.map((v) => v.symbol)).toEqual(["n", "k", "a"]);
    expect(b.classes.map((c) => c.notation)).toEqual([
      "T(1)",
      "T(log n)",
      "T(n)",
      "T(n·k)",
      "T(n·k·a)",
      "T(∞)",
    ]);
    expect(bigtSlug("T(n·k·a)")).toBe("t-n-k-a");
    expect(bigtSlug("T(∞)")).toBe("t-infinity");
  });

  it("extracts stages, personas (with stages from data-stage) and value", () => {
    expect(
      extractStages(fx("personas-operating-model")).map((s) => s.slug),
    ).toEqual(["production", "consumption", "value"]);
    const p = extractPersonas(fx("personas-operating-model"));
    expect(p.filter((x) => x.core)).toHaveLength(8);
    expect(p.find((x) => x.slug === "engineering")?.stages).toEqual([
      "production",
      "consumption",
    ]);
    const v = extractValue(fx("value-classification"));
    expect(v.categories).toHaveLength(10);
    expect(v.booking).toHaveLength(5);
  });

  it("extracts FOCUS tracker cards with buckets and identifiers", () => {
    const f = extractFocusTracker(fx("focus-1-5-for-ai"));
    const cache = f.find((x) => x.identifiers.includes("TokenCacheAction"));
    expect(cache?.bucket).toBe("flight");
    expect(new Set(f.map((x) => x.bucket))).toEqual(
      new Set(["done", "flight", "consider", "out"]),
    );
  });

  it("quotes prose-stated metrics verbatim", () => {
    const m = extractProseMetrics({
      definition: fx("what-is-tokenomics"),
      value: fx("value-classification"),
      tca: fx("total-cost-of-ai"),
    });
    expect(m.find((x) => x.slug === "cost-per-token")?.formula_text).toBe(
      "hardware cost divided by tokens produced",
    );
    expect(m.find((x) => x.slug === "risk-expected-loss")?.formula_text).toBe(
      "incidents per period x cost per incident",
    );
    expect(m.find((x) => x.slug === "net-benefit")?.formula).toContain(
      "= net benefit",
    );
  });
});

describe("failure modes", () => {
  it("throws ExtractError instead of guessing when structure is missing", () => {
    const empty = "<html><body><main><h1>x</h1></main></body></html>";
    expect(() => extractStages(empty)).toThrow(ExtractError);
    expect(() => extractLayers(empty)).toThrow(ExtractError);
    expect(() => extractBigT(empty)).toThrow(ExtractError);
    expect(() =>
      extractProseMetrics({ definition: empty, value: empty, tca: empty }),
    ).toThrow(ExtractError);
    expect(() => prov("not-a-doc", null)).toThrow(ExtractError);
  });
});

describe("render", () => {
  it("renders tables, lists, emphasis, code, links and sections", () => {
    const $ = load(
      `<main><p>intro <a href="/x/">in</a> <a href="https://evil.example/">out</a></p>
       <h2 id="a">A<br>B</h2><p><strong>b</strong> <em>i</em> <code>C</code></p>
       <ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul>
       <table><tr><th>H|1</th><th>H2</th></tr><tr><td>x</td></tr></table>
       <section id="s"><h2>Second</h2><h2>Second</h2><h4>deep</h4><button>no</button></section>
       <div class="tc-formula"><div class="tc-mathrow"><span class="tc-eq">R =</span><span class="tc-frac"><span class="tc-num">a + b</span><span class="tc-den">c</span></span></div><span class="tc-where">c = d</span></div></main>`,
    );
    const r = renderSections($, $("main"), {
      origin: "https://www.tokeneconomics.com",
    });
    expect(r.preamble).toContain("[in](https://www.tokeneconomics.com/x/)");
    expect(r.preamble).not.toContain("evil.example");
    expect(r.sections.map((s) => s.id)).toEqual(["a", "s", "s-second"]);
    expect(r.sections[0]?.title).toBe("A B");
    expect(r.sections[0]?.body).toContain("| H\\|1 | H2 |");
    expect(r.sections[0]?.body).toContain("  - nested");
    expect(r.sections[2]?.body).toContain("#### deep");
    expect(r.sections[2]?.body).toContain("`R = (a + b) / c`");
    expect(r.sections[2]?.body).not.toContain("no");
    expect(formulaLines($, $(".tc-formula"))).toEqual([
      "R = (a + b) / c",
      "c = d",
    ]);
    expect(spacedText($, $("h2").first())).toBe("A B");
  });
});
