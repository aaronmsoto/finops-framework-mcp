// The owner's cert-prep AI Tokenomics curriculum as an EXPERIMENTAL local
// overlay (spec "Curriculum overlay"). It is private material and this repo
// is public, so the overlay is produced locally by
// `cli.js import-curriculum` and never committed or packaged; the server
// loads it only when FINOPS_MCP_EXPERIMENTAL=1 AND TOKENOMICS_MCP_CURRICULUM
// point at it. Every output built from it is labeled unofficial.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export interface CurriculumSlide {
  id: string;
  title: string;
  body: string;
  source_line: string | null;
  notes: string | null;
}

export interface CurriculumModule {
  id: string;
  title: string;
  level: number | null;
  minutes: number | null;
  personas: string[];
  prerequisites_required: string[];
  prerequisites_recommended: string[];
  objectives: string[];
  agenda: string[];
  deliverable: string | null;
  anchors: { source: string; section: string }[];
  refresh_triggers: string[];
  slides: CurriculumSlide[];
}

export interface CurriculumTerm {
  term: string;
  definition: string;
  section: string;
}

export interface CurriculumNumber {
  figure: string;
  wording: string;
  cite_as: string;
}

export interface CurriculumOverlay {
  kind: "cert-prep-curriculum";
  official: false;
  imported_at: string;
  modules: CurriculumModule[];
  glossary: CurriculumTerm[];
  numbers: CurriculumNumber[];
}

export const CURRICULUM_FILE = "curriculum.json";

const s = { type: "string" } as const;
const ns = { type: ["string", "null"] } as const;
const ni = { type: ["integer", "null"] } as const;
const arr = (items: unknown) => ({ type: "array", items }) as const;
const o = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const curriculumSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "tokenomics-overview-mcp/curriculum",
  ...o({
    kind: { const: "cert-prep-curriculum" },
    official: { const: false },
    imported_at: s,
    modules: arr(
      o({
        id: s,
        title: s,
        level: ni,
        minutes: ni,
        personas: arr(s),
        prerequisites_required: arr(s),
        prerequisites_recommended: arr(s),
        objectives: arr(s),
        agenda: arr(s),
        deliverable: ns,
        anchors: arr(o({ source: s, section: s })),
        refresh_triggers: arr(s),
        slides: arr(
          o({ id: s, title: s, body: s, source_line: ns, notes: ns }),
        ),
      }),
    ),
    glossary: arr(o({ term: s, definition: s, section: s })),
    numbers: arr(o({ figure: s, wording: s, cite_as: s })),
  }),
};

export function loadCurriculumOverlay(dir: string): CurriculumOverlay {
  const path = join(dir, CURRICULUM_FILE);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(
      `curriculum overlay unreadable at ${path} (${String(e)}). Build it with ` +
        '"node dist/crawlers/tokenomics/cli.js import-curriculum --from <cert-prep>/ai-tokenomics".',
      { cause: e },
    );
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const validate = ajv.compile(curriculumSchema);
  if (!validate(data)) {
    const e = validate.errors?.[0];
    throw new Error(
      `curriculum overlay invalid at "${e?.instancePath ?? ""}": ${e?.message ?? "unknown"}; re-run import-curriculum.`,
    );
  }
  return data as unknown as CurriculumOverlay;
}
