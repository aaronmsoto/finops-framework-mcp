// design new/check/publish — hermetic: every test runs in a temp repo with
// its own fixture TEMPLATE.html (the real docs/designs/ is never touched).
import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadAgenticConfig, validateAgenticConfig } from "../src/config.js";
import { makeTempDir, readFileIn, rmDir, runCli, writeConfig, writeFileIn } from "./helpers.js";

const TEMPLATE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{TITLE}}</title>
  <style>body { font: 16px/1.5 sans-serif; }</style>
</head>
<body>
  <h1>{{TITLE}}</h1>
  <p>slug: {{SLUG}} — created {{DATE}}</p>
</body>
</html>
`;

const VALID_DESIGN = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>ok</title><style>h1 { color: rebeccapurple; }</style></head>
<body>
  <h1>Self-contained</h1>
  <p><a href="#top">fragment</a> <a href="mailto:me@example.com">mail</a></p>
  <script>document.title = "still ok";</script>
</body>
</html>
`;

let dir: string;
beforeEach(() => {
  dir = makeTempDir();
  writeConfig(dir);
});
afterEach(() => {
  rmDir(dir);
});

function writeDesign(name: string, content: string): void {
  writeFileIn(dir, `docs/designs/${name}`, content);
}

describe("designs config section", () => {
  it("defaults to docs/designs with no publishCommand when absent", () => {
    const config = loadAgenticConfig(dir); // writeConfig omits "designs"
    expect(config.designs).toEqual({ dir: "docs/designs" });
  });

  it("accepts overrides and rejects wrong types with path-qualified errors", () => {
    writeConfig(dir, { designs: { dir: "design-docs", publishCommand: "true" } });
    expect(loadAgenticConfig(dir).designs).toEqual({ dir: "design-docs", publishCommand: "true" });

    const base = { project: { name: "p" }, gates: {} };
    expect(() => validateAgenticConfig({ ...base, designs: [] })).toThrow(/designs must be an object/);
    expect(() => validateAgenticConfig({ ...base, designs: { dir: 7 } })).toThrow(/designs\.dir must be a string/);
    expect(() => validateAgenticConfig({ ...base, designs: { publishCommand: "" } })).toThrow(
      /designs\.publishCommand must be a non-empty string/,
    );
  });
});

describe("design new", () => {
  beforeEach(() => {
    writeDesign("TEMPLATE.html", TEMPLATE_HTML);
    writeFileIn(dir, ".agents/specs/TEMPLATE.md", "# Spec title\n\n## Problem\n\nDescribe it.\n");
  });

  it("scaffolds design + spec with all tokens replaced", () => {
    const res = runCli(dir, ["design", "new", "login-flow", "--title", "Login Flow"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("created docs/designs/login-flow.html");
    expect(res.stdout).toContain("created .agents/specs/login-flow.md");
    expect(res.stdout).toContain("agentic design check");
    expect(res.stdout).toContain("agentic serve");

    const html = readFileIn(dir, "docs/designs/login-flow.html");
    expect(html).not.toMatch(/\{\{(TITLE|SLUG|DATE)\}\}/);
    expect(html).toContain("<title>Login Flow</title>");
    expect(html).toContain("<h1>Login Flow</h1>"); // ALL occurrences replaced
    expect(html).toMatch(/slug: login-flow — created \d{4}-\d{2}-\d{2}/);

    const spec = readFileIn(dir, ".agents/specs/login-flow.md");
    expect(spec.startsWith("# Login Flow\n")).toBe(true);
    expect(spec).toContain("## Problem");
  });

  it("falls back to the slug as title and skips the spec when one already exists", () => {
    writeFileIn(dir, ".agents/specs/cache-layer.md", "hand-written spec\n");
    const res = runCli(dir, ["design", "new", "cache-layer", "--json"]);
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual({ design: "docs/designs/cache-layer.html", spec: null });
    expect(readFileIn(dir, "docs/designs/cache-layer.html")).toContain("<title>cache-layer</title>");
    expect(readFileIn(dir, ".agents/specs/cache-layer.md")).toBe("hand-written spec\n"); // untouched
  });

  it("prepends a heading when the spec template has none", () => {
    writeFileIn(dir, ".agents/specs/TEMPLATE.md", "No heading here.\n");
    expect(runCli(dir, ["design", "new", "no-heading", "--title", "T"]).status).toBe(0);
    expect(readFileIn(dir, ".agents/specs/no-heading.md").startsWith("# T\n\nNo heading here.\n")).toBe(true);
  });

  it("refuses to overwrite an existing design (exit 1)", () => {
    expect(runCli(dir, ["design", "new", "dupe"]).status).toBe(0);
    const again = runCli(dir, ["design", "new", "dupe"]);
    expect(again.status).toBe(1);
    expect(again.stderr).toContain("already exists");
  });

  it("rejects invalid slugs with exit 2", () => {
    for (const bad of ["Bad", "-leading", "under_score", "has space", ""]) {
      const res = runCli(dir, ["design", "new", bad]);
      expect(res.status, `slug "${bad}"`).toBe(2);
    }
  });

  it("errors clearly when TEMPLATE.html is missing", () => {
    const bare = makeTempDir();
    try {
      writeConfig(bare);
      const res = runCli(bare, ["design", "new", "orphan"]);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("docs/designs/TEMPLATE.html not found");
    } finally {
      rmDir(bare);
    }
  });
});

describe("design check", () => {
  it("passes a valid self-contained design", () => {
    writeDesign("ok.html", VALID_DESIGN);
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("design check: ok (1 file(s), 0 warning(s))");
  });

  it("fails on an external <script src>", () => {
    writeDesign("bad.html", VALID_DESIGN.replace("</body>", '<script src="https://cdn.example.com/x.js"></script>\n</body>'));
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(1);
    expect(res.stdout).toMatch(/FAIL docs\/designs\/bad\.html: external resource <script src="https:\/\/cdn\.example\.com\/x\.js">/);
  });

  it("fails on an external CSS url(...) and @import", () => {
    writeDesign(
      "css.html",
      VALID_DESIGN.replace(
        "<style>h1 { color: rebeccapurple; }</style>",
        "<style>@import \"https://fonts.example.com/f.css\";\nbody { background: url(//cdn.example.com/bg.png); }</style>",
      ),
    );
    const res = runCli(dir, ["design", "check", "--json"]);
    expect(res.status).toBe(1);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.failures.some((f: string) => f.includes("url(//cdn.example.com/bg.png)"))).toBe(true);
    expect(parsed.failures.some((f: string) => f.includes("@import https://fonts.example.com/f.css"))).toBe(true);
  });

  it("fails on inline fetch( in a script", () => {
    writeDesign("fetchy.html", VALID_DESIGN.replace('document.title = "still ok";', 'fetch("/api/data");'));
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(1);
    expect(res.stdout).toMatch(/FAIL docs\/designs\/fetchy\.html: inline script contains "fetch\("/);
  });

  it("fails on an unbalanced <div> with the tag and line", () => {
    writeDesign("lopsided.html", VALID_DESIGN.replace("<h1>Self-contained</h1>", "<div><h1>Self-contained</h1>"));
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(1);
    expect(res.stdout).toMatch(/FAIL docs\/designs\/lopsided\.html: malformed HTML — unclosed <div> opened at line \d+/);
  });

  it("fails on a dead relative link but accepts a live one", () => {
    writeFileIn(dir, "docs/designs/assets/present.css", "body{}\n");
    writeDesign(
      "links.html",
      VALID_DESIGN.replace(
        "</head>",
        '<link rel="stylesheet" href="assets/present.css">\n<link rel="stylesheet" href="assets/missing.css">\n</head>',
      ),
    );
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(1);
    expect(res.stdout).toMatch(/FAIL docs\/designs\/links\.html: dead relative link <link href="assets\/missing\.css">/);
    expect(res.stdout).not.toContain("present.css");
  });

  it("warns (exit 0) on external <a href> navigation links", () => {
    writeDesign("nav.html", VALID_DESIGN.replace("<a href=\"#top\">fragment</a>", '<a href="https://example.com/spec">spec</a>'));
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/WARN docs\/designs\/nav\.html: external link <a href="https:\/\/example\.com\/spec">/);
    expect(res.stdout).toContain("design check: ok (1 file(s), 1 warning(s))");
  });

  it("warns on missing <title> and missing lang", () => {
    writeDesign("plain.html", "<html><body><p>hi</p></body></html>\n");
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/WARN docs\/designs\/plain\.html: missing <title>/);
    expect(res.stdout).toMatch(/WARN docs\/designs\/plain\.html: missing lang attribute on <html>/);
  });

  it("warns on stray HTML under docs/ and .agents/ but not inside the designs dir", () => {
    writeDesign("ok.html", VALID_DESIGN);
    writeFileIn(dir, "docs/foo.html", "<p>stray</p>\n");
    writeFileIn(dir, "docs/guides/legacy.htm", "<p>stray</p>\n");
    writeFileIn(dir, ".agents/x.html", "<p>stray</p>\n");
    writeFileIn(dir, "docs/node_modules/pkg/index.html", "<p>dependency</p>\n");
    writeFileIn(dir, ".agents/dist/report.html", "<p>build output</p>\n");
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/WARN docs\/foo\.html: HTML outside docs\/designs\//);
    expect(res.stdout).toMatch(/WARN docs\/guides\/legacy\.htm: HTML outside docs\/designs\//);
    expect(res.stdout).toMatch(/WARN \.agents\/x\.html: HTML outside docs\/designs\//);
    expect(res.stdout).not.toContain("node_modules");
    expect(res.stdout).not.toContain("report.html");
    expect(res.stdout).not.toContain("WARN docs/designs/ok.html");
    expect(res.stdout).toContain("design check: ok (1 file(s), 3 warning(s))");
  });

  it("does not warn about files inside the designs dir and stays clean without strays", () => {
    writeDesign("ok.html", VALID_DESIGN);
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain("HTML outside");
    expect(res.stdout).toContain("design check: ok (1 file(s), 0 warning(s))");
  });

  it("excludes TEMPLATE.html (unreplaced tokens and dead template links are fine)", () => {
    writeDesign("TEMPLATE.html", TEMPLATE_HTML.replace("</body>", '<a href="./{{SLUG}}-notes.html">notes</a>\n</body>'));
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("no design docs");
  });

  it("exits 0 with a notice when designs.dir does not exist", () => {
    const res = runCli(dir, ["design", "check"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("docs/designs/ does not exist");
  });

  it("--json reports files, failures, and warnings", () => {
    writeDesign("ok.html", VALID_DESIGN);
    writeDesign("nav.html", VALID_DESIGN.replace("<a href=\"#top\">fragment</a>", '<a href="http://example.com">x</a>'));
    const res = runCli(dir, ["design", "check", "--json"]);
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.files).toEqual(["docs/designs/nav.html", "docs/designs/ok.html"]);
    expect(parsed.failures).toEqual([]);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.notice).toBeNull();
  });
});

describe("design publish", () => {
  beforeEach(() => {
    writeDesign("TEMPLATE.html", TEMPLATE_HTML);
    runCli(dir, ["design", "new", "ship-me"]);
  });

  it("errors when designs.publishCommand is unset", () => {
    const res = runCli(dir, ["design", "publish", "ship-me"]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("set designs.publishCommand in agentic.config.json to enable publishing");
  });

  it("errors when the design file does not exist", () => {
    writeConfig(dir, { designs: { publishCommand: "true" } });
    const res = runCli(dir, ["design", "publish", "nope"]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("docs/designs/nope.html not found");
  });

  it("runs the command from the repo root with DESIGN_FILE and DESIGN_SLUG, propagating exit codes", () => {
    writeConfig(dir, { designs: { publishCommand: 'printf "%s\\n%s\\n%s\\n" "$DESIGN_FILE" "$DESIGN_SLUG" "$PWD" > publish-env.txt' } });
    const ok = runCli(dir, ["design", "publish", "ship-me"]);
    expect(ok.status).toBe(0);
    const [file, slug, cwd] = readFileIn(dir, "publish-env.txt").trim().split("\n");
    expect(file!.endsWith("docs/designs/ship-me.html")).toBe(true);
    expect(slug).toBe("ship-me");
    expect(fsRealpath(cwd!)).toBe(fsRealpath(dir)); // sh -c runs from the repo root

    writeConfig(dir, { designs: { publishCommand: "exit 7" } });
    expect(runCli(dir, ["design", "publish", "docs/designs/ship-me.html"]).status).toBe(7);
  });
});

// macOS puts tmp dirs behind /private symlinks; compare realpaths.
function fsRealpath(p: string): string {
  return fs.realpathSync(p);
}
