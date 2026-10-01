import { doc, guard, ComposeError } from "../../../shared/markdown/compose.js";
import {
  parseFrontmatter,
  type FrontmatterValue,
} from "../../../shared/markdown/frontmatter.js";
import {
  parseFlatBulletList,
  parseSlugHeading,
  splitHeadingSections,
} from "../../../shared/markdown/derive.js";

// Generic record dialect for the tokenomics entity collections: one file per
// collection, one `## Title {slug=x}` H2 per record, scalar fields as
// `- key: value` bullets, list fields as `### key` + bullets, markdown
// fields as `### key` + verbatim body, nested structures as `### key` +
// fenced JSON. Derive is the exact inverse of compose, driven by the same
// field spec, so JSON is always regenerable from the markdown (spec
// "Pipeline"). Absent scalar line ⇔ null.

export type FieldType =
  "text" | "text?" | "int" | "int?" | "bool" | "list" | "md" | "md?" | "json";

export interface FieldSpec {
  key: string;
  type: FieldType;
}

export interface CollectionSpec {
  collection: string;
  heading: string;
  titleKey: string;
  fields: FieldSpec[];
}

type Rec = Record<string, unknown>;

const BLOCK_TYPES = new Set<FieldType>(["list", "md", "md?", "json"]);

function flatten(rec: Rec): Rec {
  const out: Rec = { ...rec };
  const p = rec.provenance as Rec | undefined;
  if (p) {
    delete out.provenance;
    for (const [k, v] of Object.entries(p)) out[`provenance.${k}`] = v;
  }
  return out;
}

function unflatten(rec: Rec): Rec {
  const out: Rec = {};
  const p: Rec = {};
  for (const [k, v] of Object.entries(rec)) {
    if (k.startsWith("provenance.")) p[k.slice(11)] = v;
    else out[k] = v;
  }
  if (Object.keys(p).length) out.provenance = p;
  return out;
}

export const PROVENANCE_FIELDS: FieldSpec[] = [
  { key: "provenance.document", type: "text" },
  { key: "provenance.section", type: "text?" },
  { key: "provenance.source_url", type: "text" },
  { key: "provenance.license", type: "text" },
];

function checkMdBody(text: string, where: string): string {
  for (const line of text.split("\n")) {
    if (/^#{1,3} /.test(line)) {
      throw new ComposeError(
        `${where}: markdown field contains a level-1..3 heading ("${line.slice(0, 40)}"), which would break the record dialect`,
      );
    }
  }
  return text;
}

export function composeCollection(
  spec: CollectionSpec,
  records: Rec[],
  extraFrontmatter: Record<string, FrontmatterValue> = {},
): string {
  const blocks: string[] = [`# ${spec.heading}`];
  for (const raw of records) {
    const rec = flatten(raw);
    const slug = String(rec.slug);
    const where = `${spec.collection}/${slug}`;
    const title = guard(String(rec[spec.titleKey]), `${where} title`);
    const scalars: string[] = [];
    const sub: string[] = [];
    for (const f of spec.fields) {
      if (f.key === "slug") continue;
      const v = rec[f.key];
      if (BLOCK_TYPES.has(f.type)) {
        if (f.type === "list") {
          const items = (v as string[]) ?? [];
          sub.push(
            `### ${f.key}\n\n` +
              (items.length
                ? items
                    .map((i) => `- ${guard(i, `${where}.${f.key}`)}`)
                    .join("\n")
                : "(none)"),
          );
        } else if (f.type === "json") {
          sub.push(
            `### ${f.key}\n\n\`\`\`json\n${JSON.stringify(v, null, 2)}\n\`\`\``,
          );
        } else if (v !== null && v !== undefined) {
          sub.push(
            `### ${f.key}\n\n${checkMdBody(String(v), `${where}.${f.key}`)}`,
          );
        }
        continue;
      }
      if (v === null || v === undefined) {
        if (!f.type.endsWith("?")) {
          throw new ComposeError(
            `${where}: required field "${f.key}" is missing`,
          );
        }
        continue;
      }
      scalars.push(`- ${f.key}: ${guard(String(v), `${where}.${f.key}`)}`);
    }
    blocks.push(`## ${title} {slug=${slug}}`, scalars.join("\n"), ...sub);
  }
  return doc(
    { collection: spec.collection, count: records.length, ...extraFrontmatter },
    blocks,
  );
}

function parseScalar(f: FieldSpec, raw: string): unknown {
  if (f.type.startsWith("int")) {
    if (!/^-?\d+$/.test(raw))
      throw new Error(`field ${f.key}: "${raw}" is not an integer`);
    return Number(raw);
  }
  if (f.type === "bool") {
    if (raw !== "true" && raw !== "false")
      throw new Error(`field ${f.key}: "${raw}" is not a boolean`);
    return raw === "true";
  }
  return raw;
}

export function deriveCollection(
  spec: CollectionSpec,
  text: string,
): { frontmatter: Record<string, FrontmatterValue>; records: Rec[] } {
  const { data, body } = parseFrontmatter(text);
  if (data.collection !== spec.collection) {
    throw new Error(
      `expected collection "${spec.collection}", got "${String(data.collection)}"`,
    );
  }
  const { sections } = splitHeadingSections(body, 2);
  const records = sections.map((s) => {
    const { label, slug } = parseSlugHeading(s.title);
    const rec: Rec = { slug, [spec.titleKey]: label };
    const { preamble, sections: subs } = splitHeadingSections(s.body, 3);
    const scalarLines = new Map<string, string>();
    for (const line of preamble.split("\n")) {
      const m = /^- ([a-z_.]+): (.*)$/.exec(line);
      if (m) scalarLines.set(m[1] as string, m[2] as string);
    }
    const subMap = new Map(subs.map((x) => [x.title, x.body]));
    for (const f of spec.fields) {
      if (f.key === "slug" || f.key === spec.titleKey) continue;
      if (f.type === "list") {
        const b = subMap.get(f.key) ?? "";
        rec[f.key] = b.trim() === "(none)" ? [] : parseFlatBulletList(b);
      } else if (f.type === "json") {
        const b = subMap.get(f.key);
        const m = b ? /^```json\n([\s\S]*)\n```$/.exec(b.trim()) : null;
        if (!m)
          throw new Error(`${slug}: field ${f.key} has no fenced JSON block`);
        rec[f.key] = JSON.parse(m[1] as string) as unknown;
      } else if (f.type === "md" || f.type === "md?") {
        const b = subMap.get(f.key);
        if (b === undefined && f.type === "md") {
          throw new Error(`${slug}: required markdown field ${f.key} missing`);
        }
        rec[f.key] = b ?? null;
      } else {
        const raw = scalarLines.get(f.key);
        if (raw === undefined) {
          if (!f.type.endsWith("?"))
            throw new Error(`${slug}: required field ${f.key} missing`);
          rec[f.key] = null;
        } else {
          rec[f.key] = parseScalar(f, raw);
        }
      }
    }
    return unflatten(rec);
  });
  if (typeof data.count === "number" && data.count !== records.length) {
    throw new Error(
      `${spec.collection}: front-matter count ${data.count} ≠ ${records.length} records`,
    );
  }
  return { frontmatter: data, records };
}
