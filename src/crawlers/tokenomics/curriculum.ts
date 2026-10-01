import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { load } from "cheerio";
import { parse as parseYaml } from "yaml";
import {
  CURRICULUM_FILE,
  type CurriculumModule,
  type CurriculumNumber,
  type CurriculumOverlay,
  type CurriculumTerm,
} from "../../shared/tokenomics/curriculum.js";

// Builds the experimental curriculum overlay from a local cert-prep
// checkout (`ai-tokenomics/`). Output goes to a local directory (default
// .cache/, gitignored); nothing from here is ever written under data/.
// Practice banks are deliberately not read (exam integrity).

type Y = Record<string, unknown>;

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];
const asNum = (v: unknown): number | null => (typeof v === "number" ? v : null);
const asStr = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

function stripMd(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

/** `| a | b |` markdown table rows (header and separator skipped). */
function tableRows(lines: string[]): string[][] {
  const rows = lines
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split(/(?<!\\)\|/)
        .map((c) => c.trim()),
    );
  return rows.filter((r, i) => i > 0 && !r.every((c) => /^:?-{3,}:?$/.test(c)));
}

export function parsePlanGlossary(plan: string): CurriculumTerm[] {
  const start = plan.indexOf("## 3.");
  const end = plan.indexOf("\n## 4.", start);
  const body = plan.slice(start, end < 0 ? undefined : end);
  const out: CurriculumTerm[] = [];
  for (const block of body.split(/\n(?=### )/)) {
    const heading = /^### (.+)$/m.exec(block)?.[1];
    if (!heading) continue;
    const lines = block.split("\n");
    const header = lines.find((l) => l.trim().startsWith("|")) ?? "";
    if (!/\|\s*Term\s*\|/i.test(header)) continue;
    for (const r of tableRows(lines)) {
      if (r.length < 2 || !r[0]) continue;
      out.push({
        term: stripMd(r[0]),
        definition: stripMd(r.slice(1).join(" — ")),
        section: stripMd(heading),
      });
    }
  }
  return out;
}

export function parsePlanNumbers(plan: string): CurriculumNumber[] {
  const start = plan.indexOf("## 4.");
  if (start < 0) return [];
  const end = plan.indexOf("\n## 5.", start);
  const lines = plan.slice(start, end < 0 ? undefined : end).split("\n");
  return tableRows(lines)
    .filter((r) => r.length >= 3)
    .map((r) => ({
      figure: stripMd(r[0] as string),
      wording: stripMd(r[1] as string),
      cite_as: stripMd(r[2] as string),
    }));
}

function parseSlide(id: string, html: string) {
  const $ = load(html);
  const notes = $("aside").text().replace(/\s+/g, " ").trim() || null;
  $("aside").remove();
  const title = $("h2").first().text().replace(/\s+/g, " ").trim();
  let source: string | null = null;
  $("p").each((_, p) => {
    const t = $(p).text().replace(/\s+/g, " ").trim();
    if (/^Source[s]?:/.test(t)) {
      source = t;
      $(p).remove();
    }
  });
  $("h2").first().remove();
  const parts: string[] = [];
  $("h3, h4, p, li, td, th").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) parts.push(t);
  });
  return {
    id,
    title: title || id,
    body: parts.join("\n"),
    source_line: source,
    notes,
  };
}

export function parseModule(dir: string): CurriculumModule {
  const y = parseYaml(readFileSync(join(dir, "module.yaml"), "utf8")) as Y;
  const pre = (y.prerequisites ?? {}) as Y;
  const deck = ((y.deck as Y | undefined)?.slides ?? []) as { id: string }[];
  const slideDir = join(dir, "deck", "project", "slides");
  const slides = deck
    .map((s) => s.id)
    .filter((sid) => existsSync(join(slideDir, `${sid}.html`)))
    .map((sid) =>
      parseSlide(sid, readFileSync(join(slideDir, `${sid}.html`), "utf8")),
    );
  return {
    id: String(y.id),
    title: String(y.title),
    level: asNum(y.level),
    minutes: asNum(y.minutes),
    personas: asStrings(y.personas),
    prerequisites_required: asStrings(pre.required),
    prerequisites_recommended: asStrings(pre.recommended),
    objectives: asStrings(y.objectives),
    agenda: ((y.agenda ?? []) as Y[]).map((a) => String(a.title ?? "")),
    deliverable: asStr(y.deliverable),
    anchors: ((y.anchors ?? []) as Y[]).map((a) => ({
      source: String(a.source ?? ""),
      section: String(a.section ?? ""),
    })),
    refresh_triggers: asStrings(y.refresh_triggers),
    slides,
  };
}

export function importCurriculum(
  from: string,
  out: string,
  now: () => string = () => new Date().toISOString(),
): { modules: number; glossary: number; numbers: number } {
  const modulesDir = join(from, "modules");
  const planPath = join(from, "curriculum", "PLAN.md");
  if (!existsSync(modulesDir) || !existsSync(planPath)) {
    throw new Error(
      `${from} does not look like cert-prep/ai-tokenomics (need modules/ and curriculum/PLAN.md)`,
    );
  }
  const modules = readdirSync(modulesDir)
    .filter((d) => existsSync(join(modulesDir, d, "module.yaml")))
    .sort()
    .map((d) => parseModule(join(modulesDir, d)));
  const plan = readFileSync(planPath, "utf8");
  const overlay: CurriculumOverlay = {
    kind: "cert-prep-curriculum",
    official: false,
    imported_at: now(),
    modules,
    glossary: parsePlanGlossary(plan),
    numbers: parsePlanNumbers(plan),
  };
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, CURRICULUM_FILE),
    `${JSON.stringify(overlay, null, 2)}\n`,
  );
  return {
    modules: modules.length,
    glossary: overlay.glossary.length,
    numbers: overlay.numbers.length,
  };
}
