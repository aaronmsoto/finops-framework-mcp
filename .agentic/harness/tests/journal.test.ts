import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendJournalEntry, journalTail, localDateStamp, sanitizeSlug } from "../src/journal.js";
import { makeTempDir, readFileIn, rmDir, writeFileIn } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
});
afterEach(() => {
  rmDir(dir);
});

describe("appendJournalEntry", () => {
  it("creates .agents/journal/<YYYYMMDD>-<slug>.md with a dated header on first write", () => {
    const file = appendJournalEntry(dir, { slug: "fix-login", title: "fix login flow", lines: ["- did: patched auth"] });
    expect(path.basename(file)).toBe(`${localDateStamp()}-fix-login.md`);
    const text = readFileIn(dir, `.agents/journal/${localDateStamp()}-fix-login.md`);
    // header line: "## <title> — <ISO date>"
    expect(text).toMatch(/^## fix login flow — \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(text).toContain("- did: patched auth");
  });

  it("appends same-day same-slug entries to the same file as further sections", () => {
    appendJournalEntry(dir, { slug: "my-session", lines: ["- did: step one"] });
    appendJournalEntry(dir, { slug: "my-session", lines: ["- did: step two"] });
    const journalDir = path.join(dir, ".agents", "journal");
    expect(fs.readdirSync(journalDir)).toHaveLength(1);
    const text = readFileIn(dir, `.agents/journal/${localDateStamp()}-my-session.md`);
    expect(text.match(/^## my-session — /gm)).toHaveLength(2); // title defaults to the slug
    expect(text.indexOf("step one")).toBeLessThan(text.indexOf("step two"));
  });

  it("sanitizes an invalid slug instead of throwing", () => {
    expect(sanitizeSlug("Fix Login!! Flow")).toBe("fix-login-flow");
    expect(sanitizeSlug("---")).toBe("entry");
    const file = appendJournalEntry(dir, { slug: "  Weird__SLUG/09 ", lines: ["- ok"] });
    expect(path.basename(file)).toBe(`${localDateStamp()}-weird-slug-09.md`);
  });
});

describe("journalTail", () => {
  it("returns the newest n entry files oldest-first, excluding README.md and non-.md files", () => {
    writeFileIn(dir, ".agents/journal/20250101-alpha.md", "## alpha — old\n");
    writeFileIn(dir, ".agents/journal/20250102-beta.md", "## beta — mid\n");
    writeFileIn(dir, ".agents/journal/20250103-gamma.md", "## gamma — new\n");
    writeFileIn(dir, ".agents/journal/README.md", "# convention doc — never an entry\n");
    writeFileIn(dir, ".agents/journal/notes.txt", "not markdown\n");
    const tail = journalTail(dir, 2);
    expect(tail).toEqual(["## beta — mid", "## gamma — new"]); // oldest-first, trimmed
    expect(journalTail(dir, 10)).toHaveLength(3); // README/non-md never counted
  });

  it("falls back to the legacy .agents/journal.md when the directory has no entries", () => {
    writeFileIn(dir, ".agents/journal.md", "# Journal\n\n## first — a\n- x\n\n## second — b\n- y\n");
    writeFileIn(dir, ".agents/journal/README.md", "# convention only\n");
    const tail = journalTail(dir, 1);
    expect(tail).toEqual(["## second — b\n- y"]);
  });

  it("prefers directory entries over the legacy file once any exist", () => {
    writeFileIn(dir, ".agents/journal.md", "## legacy entry\n- old\n");
    appendJournalEntry(dir, { slug: "new-layout", lines: ["- new"] });
    const tail = journalTail(dir, 5);
    expect(tail).toHaveLength(1);
    expect(tail[0]).toContain("new-layout");
    expect(tail[0]).not.toContain("legacy");
  });

  it("returns [] when neither layout exists", () => {
    expect(journalTail(dir, 3)).toEqual([]);
  });
});
