import { describe, expect, it } from "vitest";
import { CHEERIO_MISSING_MESSAGE, load, resolveCheerio } from "./helpers.js";

describe("resolveCheerio (missing-cheerio error path — T-018)", () => {
  it("throws an actionable error naming the dev install command when cheerio can't be resolved", () => {
    const requireFn = () => {
      throw new Error("Cannot find module 'cheerio'");
    };
    expect(() => resolveCheerio(requireFn)).toThrow(CHEERIO_MISSING_MESSAGE);
  });

  it("names `npm install --save-dev cheerio` as the fix", () => {
    expect(CHEERIO_MISSING_MESSAGE).toMatch(/npm install --save-dev cheerio/);
  });

  it("resolves the real cheerio module when it is installed", () => {
    expect(resolveCheerio().load).toBeTypeOf("function");
  });
});

describe("load (uses the memoized cheerio module)", () => {
  it("still parses HTML once cheerio is resolved", () => {
    const $ = load("<p>hi</p>");
    expect($("p").text()).toBe("hi");
  });
});
