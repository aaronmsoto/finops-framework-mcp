import { describe, expect, it } from "vitest";
import { parseRobots } from "./http.js";

describe("parseRobots (critique m14 guardrail)", () => {
  it("collects disallow rules and crawl-delay from the * group only", () => {
    const rules = parseRobots(
      [
        "User-agent: SpecialBot",
        "Disallow: /everything/",
        "",
        "User-agent: *",
        "Disallow: /wp-admin/",
        "Disallow: /tool_service/ # comment",
        "Crawl-delay: 2",
      ].join("\n"),
    );
    expect(rules.disallow).toEqual(["/wp-admin/", "/tool_service/"]);
    expect(rules.crawlDelayMs).toBe(2000);
    expect(rules.disallow).not.toContain("/everything/");
  });

  it("returns permissive defaults for an empty file", () => {
    expect(parseRobots("")).toEqual({ disallow: [], crawlDelayMs: 0 });
  });
});
