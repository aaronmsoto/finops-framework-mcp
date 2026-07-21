// Design doc pipeline: scaffold, validate, and publish rich SELF-CONTAINED
// single-file HTML design documents (docs/designs/ by default). Markdown specs
// stay the machine contract; the HTML is the owner-facing artifact. `design
// check` enforces the privacy contract: a design must render with zero
// network traffic when opened.
import fs from "node:fs";
import path from "node:path";
import type { AgenticConfig } from "./config.js";
import { CliError, UsageError, readTextIfExists, run, logErr } from "./util.js";

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const TEMPLATE_NAME = "TEMPLATE.html";

/** Void elements: no closing tag expected. */
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);

/** Network-capable JS literals forbidden in inline scripts. */
const SCRIPT_NETWORK_LITERALS = ["fetch(", "XMLHttpRequest", "navigator.sendBeacon", "new WebSocket", "EventSource("];

// ---------------------------------------------------------------------------
// design new
// ---------------------------------------------------------------------------

export interface DesignNewResult {
  /** Repo-relative path of the created design doc. */
  design: string;
  /** Repo-relative path of the created spec, or null when not created. */
  spec: string | null;
}

export function designNew(rootDir: string, config: AgenticConfig, slug: string, title?: string): DesignNewResult {
  if (!SLUG_RE.test(slug)) {
    throw new UsageError(
      `design new: invalid slug "${slug}" — must match ${SLUG_RE} (lowercase letters, digits, hyphens; starts with a letter or digit).`,
    );
  }
  const designsDir = path.join(rootDir, config.designs.dir);
  const templateFile = path.join(designsDir, TEMPLATE_NAME);
  const template = readTextIfExists(templateFile);
  if (template === null) {
    throw new CliError(
      `${config.designs.dir}/${TEMPLATE_NAME} not found — \`design new\` scaffolds from it. Create the template first (or fix designs.dir in agentic.config.json).`,
    );
  }
  const designFile = path.join(designsDir, `${slug}.html`);
  const designRel = path.relative(rootDir, designFile);
  if (fs.existsSync(designFile)) {
    throw new CliError(`${designRel} already exists — refusing to overwrite. Pick another slug or delete the file first.`);
  }
  const effectiveTitle = title !== undefined && title !== "" ? title : slug;
  const filled = template
    .replaceAll("{{TITLE}}", effectiveTitle)
    .replaceAll("{{SLUG}}", slug)
    .replaceAll("{{DATE}}", localIsoDate());
  fs.writeFileSync(designFile, filled);

  let specRel: string | null = null;
  const specTemplate = readTextIfExists(path.join(rootDir, ".agents", "specs", "TEMPLATE.md"));
  const specFile = path.join(rootDir, ".agents", "specs", `${slug}.md`);
  if (specTemplate !== null && !fs.existsSync(specFile)) {
    const heading = `# ${effectiveTitle}`;
    const lines = specTemplate.split("\n");
    const content = /^#\s/.test(lines[0] ?? "") ? [heading, ...lines.slice(1)].join("\n") : `${heading}\n\n${specTemplate}`;
    fs.writeFileSync(specFile, content);
    specRel = path.relative(rootDir, specFile);
  }
  return { design: designRel, spec: specRel };
}

/** ISO yyyy-mm-dd in local time (design docs are human-dated). */
export function localIsoDate(now = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ---------------------------------------------------------------------------
// design check
// ---------------------------------------------------------------------------

export interface DesignCheckResult {
  /** Repo-relative paths of the checked design docs. */
  files: string[];
  failures: string[];
  warnings: string[];
  notice?: string;
}

export function designCheck(rootDir: string, config: AgenticConfig): DesignCheckResult {
  const designsDir = path.join(rootDir, config.designs.dir);
  if (!fs.existsSync(designsDir)) {
    return { files: [], failures: [], warnings: scanStrayHtml(rootDir, config.designs.dir), notice: `${config.designs.dir}/ does not exist — no design docs to check.` };
  }
  const names = fs
    .readdirSync(designsDir)
    .filter((f) => f.toLowerCase().endsWith(".html") && f !== TEMPLATE_NAME)
    .sort();
  if (names.length === 0) {
    return { files: [], failures: [], warnings: scanStrayHtml(rootDir, config.designs.dir), notice: `${config.designs.dir}/ has no design docs (${TEMPLATE_NAME} is excluded) — nothing to check.` };
  }
  const failures: string[] = [];
  const warnings: string[] = [];
  const files: string[] = [];
  for (const name of names) {
    const file = path.join(designsDir, name);
    if (!fs.statSync(file).isFile()) continue;
    files.push(path.relative(rootDir, file));
    checkDesignFile(rootDir, file, failures, warnings);
  }
  warnings.push(...scanStrayHtml(rootDir, config.designs.dir));
  return { files, failures, warnings };
}

/** Documentation trees scanned for misplaced HTML (format rule: markdown for
 * machine contracts, rich HTML only in designs.dir). App/source trees are
 * deliberately out of scope. */
const STRAY_HTML_ROOTS = ["docs", ".agents"];
/** Never descend into build output or dependency dirs. */
const STRAY_HTML_SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".git"]);

/** WARN per .html/.htm file under the documentation trees, outside designs.dir. */
function scanStrayHtml(rootDir: string, designsDirRel: string): string[] {
  const warnings: string[] = [];
  const designsAbs = path.resolve(rootDir, designsDirRel);
  const walk = (dirAbs: string): void => {
    if (path.resolve(dirAbs) === designsAbs) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return; // unreadable dir: nothing to report
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        if (!STRAY_HTML_SKIP_DIRS.has(entry.name)) walk(abs);
      } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        warnings.push(
          `${path.relative(rootDir, abs)}: HTML outside ${designsDirRel}/ — markdown is the format for machine contracts and docs; rich HTML belongs in ${designsDirRel}/ (designs gate).`,
        );
      }
    }
  };
  for (const root of STRAY_HTML_ROOTS) {
    const abs = path.join(rootDir, root);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) walk(abs);
  }
  return warnings;
}

function checkDesignFile(rootDir: string, file: string, failures: string[], warnings: string[]): void {
  const rel = path.relative(rootDir, file);
  const raw = fs.readFileSync(file, "utf8");
  const masked = maskComments(raw);
  const scripts = extractBlocks(masked, "script");
  const styles = extractBlocks(masked, "style");
  // Markup with raw script/style bodies blanked: tag/attribute scans must not
  // trip over JS strings or CSS that merely mention "src=".
  const markup = blankRawContent(masked);

  // (a) Balanced structure.
  for (const problem of scanStructure(markup)) failures.push(`${rel}: malformed HTML — ${problem}`);

  // (b)-(d) Attribute-based resource checks.
  checkTags(rootDir, file, rel, markup, failures, warnings);

  // (b) Inline scripts must not contain network-capable calls.
  for (const block of scripts) {
    for (const literal of SCRIPT_NETWORK_LITERALS) {
      const idx = block.content.indexOf(literal);
      if (idx >= 0) {
        const line = block.line + countNewlines(block.content.slice(0, idx));
        failures.push(`${rel}: inline script contains "${literal}" at line ${line} — designs must render with zero network.`);
      }
    }
  }

  // (b) CSS in <style> blocks.
  for (const block of styles) {
    for (const finding of cssExternalRefs(block.content)) {
      const line = block.line + countNewlines(block.content.slice(0, finding.index));
      failures.push(`${rel}: external CSS reference ${finding.detail} at line ${line} — designs must be self-contained.`);
    }
  }

  // (e) Title + lang warnings.
  if (!/<title[\s>]/i.test(markup)) warnings.push(`${rel}: missing <title> — add one so the doc is identifiable in a browser tab.`);
  const htmlTag = /<html((?:"[^"]*"|'[^']*'|[^"'>])*)>/i.exec(markup);
  if (htmlTag === null || !/\blang\s*=/i.test(htmlTag[1]!)) {
    warnings.push(`${rel}: missing lang attribute on <html> — add e.g. <html lang="en">.`);
  }
}

/** Replace HTML comment interiors with spaces, preserving newlines/offsets. */
function maskComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

/** Blank the raw content of <script>/<style> blocks, preserving offsets. */
function blankRawContent(text: string): string {
  return text.replace(
    /(<(script|style)\b(?:"[^"]*"|'[^']*'|[^"'>])*>)([\s\S]*?)(<\/\2\s*>)/gi,
    (_m, open: string, _tag: string, body: string, close: string) => open + body.replace(/[^\n]/g, " ") + close,
  );
}

interface RawBlock {
  content: string;
  /** 1-based line of the opening tag. */
  line: number;
}

function extractBlocks(text: string, tag: "script" | "style"): RawBlock[] {
  const re = new RegExp(`<${tag}\\b(?:"[^"]*"|'[^']*'|[^"'>])*>([\\s\\S]*?)</${tag}\\s*>`, "gi");
  const blocks: RawBlock[] = [];
  for (const m of text.matchAll(re)) {
    blocks.push({ content: m[1]!, line: 1 + countNewlines(text.slice(0, m.index)) });
  }
  return blocks;
}

function countNewlines(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") n++;
  return n;
}

/**
 * Stack scanner over comment-masked, script/style-blanked markup. Reports
 * unclosed/stray tags with approximate line numbers. Void elements and
 * self-closing <tag/> forms never enter the stack.
 */
function scanStructure(markup: string): string[] {
  const problems: string[] = [];
  const stack: Array<{ name: string; line: number }> = [];
  const n = markup.length;
  let line = 1;
  let i = 0;
  const advanceTo = (target: number): void => {
    for (; i < target && i < n; i++) if (markup[i] === "\n") line++;
  };
  while (i < n) {
    const lt = markup.indexOf("<", i);
    if (lt < 0) break;
    advanceTo(lt);
    if (markup[i + 1] === "!") {
      // <!doctype ...> or masked-comment leftovers.
      const end = markup.indexOf(">", i);
      advanceTo(end < 0 ? n : end + 1);
      continue;
    }
    const isClose = markup[i + 1] === "/";
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(markup.slice(i + (isClose ? 2 : 1)));
    if (nameMatch === null) {
      advanceTo(i + 1); // stray "<" in text content
      continue;
    }
    const name = nameMatch[0].toLowerCase();
    const tagLine = line;
    // Find the tag end, respecting quoted attribute values.
    let j = i + (isClose ? 2 : 1) + nameMatch[0].length;
    let quote: string | null = null;
    while (j < n) {
      const ch = markup[j]!;
      if (quote !== null) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === ">") break;
      j++;
    }
    if (j >= n) {
      problems.push(`unterminated <${isClose ? "/" : ""}${name}> tag at line ${tagLine}`);
      break;
    }
    const selfClosing = markup[j - 1] === "/";
    advanceTo(j + 1);
    if (isClose) {
      if (stack.length > 0 && stack[stack.length - 1]!.name === name) {
        stack.pop();
      } else {
        const openIdx = stack.map((s) => s.name).lastIndexOf(name);
        if (openIdx < 0) {
          problems.push(`stray closing </${name}> at line ${tagLine} (no matching open tag)`);
        } else {
          for (let k = stack.length - 1; k > openIdx; k--) {
            problems.push(`unclosed <${stack[k]!.name}> opened at line ${stack[k]!.line} (still open at </${name}>, line ${tagLine})`);
          }
          stack.length = openIdx;
        }
      }
      continue;
    }
    if (!VOID_TAGS.has(name) && !selfClosing) stack.push({ name, line: tagLine });
  }
  for (const open of stack) problems.push(`unclosed <${open.name}> opened at line ${open.line}`);
  return problems;
}

/** Does a URL-ish attribute value point off-machine? */
function isExternalUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value.trim());
}

/** Iterate open tags + their attributes in blanked markup. */
function checkTags(
  rootDir: string,
  file: string,
  rel: string,
  markup: string,
  failures: string[],
  warnings: string[],
): void {
  const docDir = path.dirname(file);
  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;
  const attrRe = /([a-zA-Z][a-zA-Z0-9_:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (const tagMatch of markup.matchAll(tagRe)) {
    const tag = tagMatch[1]!.toLowerCase();
    const attrsText = tagMatch[2]!;
    const line = 1 + countNewlines(markup.slice(0, tagMatch.index));
    for (const attrMatch of attrsText.matchAll(attrRe)) {
      const attr = attrMatch[1]!.toLowerCase();
      const value = (attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? "").trim();
      if (attr === "src" || attr === "poster") {
        if (isExternalUrl(value)) {
          failures.push(`${rel}: external resource <${tag} ${attr}="${value}"> at line ${line} — designs must be self-contained.`);
        } else {
          checkRelativeTarget(rootDir, docDir, rel, tag, attr, value, line, failures);
        }
      } else if (attr === "srcset") {
        for (const candidate of value.split(",")) {
          const url = candidate.trim().split(/\s+/)[0] ?? "";
          if (isExternalUrl(url)) {
            failures.push(`${rel}: external resource <${tag} srcset> entry "${url}" at line ${line} — designs must be self-contained.`);
          }
        }
      } else if (attr === "href") {
        if (isExternalUrl(value)) {
          if (tag === "a") {
            warnings.push(`${rel}: external link <a href="${value}"> at line ${line} — leaves the private server when clicked.`);
          } else {
            failures.push(`${rel}: external resource <${tag} href="${value}"> at line ${line} — designs must be self-contained.`);
          }
        } else {
          checkRelativeTarget(rootDir, docDir, rel, tag, attr, value, line, failures);
        }
      } else if (attr === "style") {
        for (const finding of cssExternalRefs(value)) {
          failures.push(`${rel}: external CSS reference ${finding.detail} in style attribute at line ${line} — designs must be self-contained.`);
        }
      }
    }
  }
}

/** (d) Dead relative links: the target must exist on disk. */
function checkRelativeTarget(
  rootDir: string,
  docDir: string,
  rel: string,
  tag: string,
  attr: string,
  value: string,
  line: number,
  failures: string[],
): void {
  if (value === "" || value.startsWith("#")) return;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return; // mailto:, data:, javascript:, tel:, ...
  let target = value.split(/[?#]/, 1)[0]!;
  if (target === "") return;
  try {
    target = decodeURIComponent(target);
  } catch {
    // keep the raw form; a weird escape will simply fail the existence check
  }
  const abs = target.startsWith("/") ? path.join(rootDir, target) : path.resolve(docDir, target);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: dead relative link <${tag} ${attr}="${value}"> at line ${line} — target does not exist.`);
  }
}

interface CssFinding {
  index: number;
  detail: string;
}

/** External url(...) or @import references in CSS text. */
function cssExternalRefs(css: string): CssFinding[] {
  const findings: CssFinding[] = [];
  for (const m of css.matchAll(/url\(\s*("([^"]*)"|'([^']*)'|([^)"']*))\s*\)/gi)) {
    const url = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (isExternalUrl(url)) findings.push({ index: m.index, detail: `url(${url})` });
  }
  for (const m of css.matchAll(/@import\s+("([^"]+)"|'([^']+)')/gi)) {
    const url = (m[2] ?? m[3] ?? "").trim();
    if (isExternalUrl(url)) findings.push({ index: m.index, detail: `@import ${url}` });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// design publish
// ---------------------------------------------------------------------------

/** Resolve a slug or path to the design file; run designs.publishCommand. */
export async function designPublish(rootDir: string, config: AgenticConfig, slugOrPath: string): Promise<number> {
  const looksLikePath = slugOrPath.includes("/") || slugOrPath.toLowerCase().endsWith(".html");
  const file = looksLikePath ? path.resolve(rootDir, slugOrPath) : path.join(rootDir, config.designs.dir, `${slugOrPath}.html`);
  if (!fs.existsSync(file)) {
    throw new CliError(`design publish: ${path.relative(rootDir, file) || file} not found — scaffold it with \`agentic design new\`.`);
  }
  const command = config.designs.publishCommand;
  if (command === undefined) {
    throw new CliError("set designs.publishCommand in agentic.config.json to enable publishing");
  }
  const slug = path.basename(file).replace(/\.html?$/i, "");
  logErr(`[design] publishing ${path.relative(rootDir, file)} via: ${command}`);
  const res = await run("sh", ["-c", command], {
    cwd: rootDir,
    env: { ...process.env, DESIGN_FILE: file, DESIGN_SLUG: slug },
    onStdoutLine: (l) => logErr(`[publish] ${l}`),
    onStderrLine: (l) => logErr(`[publish] ${l}`),
  });
  return res.exitCode ?? 1;
}
