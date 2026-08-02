#!/usr/bin/env node
// Generates docs/mcp-surface.md from LIVE MCP protocol output — tools/list,
// resources/list, resources/templates/list, prompts/list, plus
// completion/complete probes for resource-template arguments — against both
// built stdio servers. Same client bridge as evals/framework/mcp-call.mjs,
// connected directly here so full inputSchema/argument detail (not the
// name+description-only shape mcp-call.mjs's list-tools intentionally keeps
// stable) is available for rendering. Nothing in the doc is hand-typed.
//
// Usage:
//   node scripts/gen-mcp-surface.mjs           # regenerate docs/mcp-surface.md
//   node scripts/gen-mcp-surface.mjs --check   # verify committed doc matches live output (exit 1 on drift)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = join(import.meta.dirname, "..");
const OUT_PATH = join(ROOT, "docs/mcp-surface.md");
const UNOFFICIAL_RE = /\bunofficial\b|\bexperimental\b/i;

function ensureBuilt() {
  if (
    !existsSync(join(ROOT, "dist/servers/framework/main.js")) ||
    !existsSync(join(ROOT, "dist/servers/focus/main.js"))
  ) {
    execFileSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
  }
}

async function connect(serverName, extraEnv = {}) {
  const client = new Client({ name: "mcp-surface-gen", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: [`dist/servers/${serverName}/main.js`],
      env: { ...getDefaultEnvironment(), ...extraEnv },
      stderr: "ignore",
    }),
  );
  return client;
}

async function listAllPages(fn) {
  const items = [];
  let cursor;
  do {
    const page = await fn({ cursor });
    const key = Object.keys(page).find((k) => Array.isArray(page[k]));
    items.push(...page[key]);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

function templateVars(uriTemplate) {
  return [...uriTemplate.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

// Splits a URI template into literal/placeholder parts so every `{var}`
// becomes a path-segment wildcard and every literal character is escaped —
// used to tell "fixed" resources.list() entries apart from the concrete
// resources a template's own list() callback expands into (both come back
// in the same resources/list response; only the live template strings can
// tell them apart, so this can't be a hardcoded list).
function templateRegex(uriTemplate) {
  const escapeLiteral = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = uriTemplate
    .split(/(\{[^}]+\})/g)
    .map((part) => (/^\{[^}]+\}$/.test(part) ? "[^/]+" : escapeLiteral(part)))
    .join("");
  return new RegExp(`^${pattern}$`);
}

async function completionNote(client, uriTemplate, argName) {
  try {
    const res = await client.complete({
      ref: { type: "ref/resource", uri: uriTemplate },
      argument: { name: argName, value: "" },
    });
    const values = res.completion?.values ?? [];
    if (values.length === 0) return `\`${argName}\`: no completion`;
    const sample = values.slice(0, 5).join(", ");
    const more = values.length > 5 ? ", …" : "";
    return `\`${argName}\`: completable (e.g. ${sample}${more})`;
  } catch {
    return `\`${argName}\`: no completion`;
  }
}

async function surfaceFor(client) {
  const tools = await listAllPages((p) => client.listTools(p));
  const resources = await listAllPages((p) => client.listResources(p));
  const resourceTemplates = await listAllPages((p) =>
    client.listResourceTemplates(p),
  );
  const prompts = await listAllPages((p) => client.listPrompts(p));

  const templateRegexes = resourceTemplates.map((t) =>
    templateRegex(t.uriTemplate),
  );
  const fixedResources = resources.filter(
    (r) => !templateRegexes.some((re) => re.test(r.uri)),
  );

  const templates = [];
  for (const t of resourceTemplates) {
    const notes = [];
    for (const v of templateVars(t.uriTemplate)) {
      notes.push(await completionNote(client, t.uriTemplate, v));
    }
    templates.push({ ...t, completionNotes: notes });
  }

  return {
    tools,
    fixedResources,
    templates,
    prompts,
    resourceCount: resources.length,
  };
}

function isUnofficial(...texts) {
  return UNOFFICIAL_RE.test(texts.filter(Boolean).join(" "));
}

function badge(...texts) {
  return isUnofficial(...texts) ? " **[UNOFFICIAL/EXPERIMENTAL]**" : "";
}

function schemaType(schema) {
  if (!schema) return "any";
  if (schema.enum) return `enum(${schema.enum.join("|")})`;
  if (schema.type === "array") {
    return `array<${schema.items ? schemaType(schema.items) : "any"}>`;
  }
  return schema.type ?? "any";
}

function schemaLimits(schema) {
  const parts = [];
  if (schema.minimum !== undefined || schema.maximum !== undefined) {
    parts.push(`range ${schema.minimum ?? "−∞"}–${schema.maximum ?? "∞"}`);
  }
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    parts.push(`length ${schema.minLength ?? 0}–${schema.maxLength ?? "∞"}`);
  }
  if (schema.minItems !== undefined || schema.maxItems !== undefined) {
    parts.push(`items ${schema.minItems ?? 0}–${schema.maxItems ?? "∞"}`);
  }
  return parts.join(", ");
}

function formatParam(name, schema, required) {
  const bits = [
    `\`${name}\``,
    required ? "required" : "optional",
    schemaType(schema),
  ];
  if (schema.default !== undefined) {
    bits.push(`default \`${JSON.stringify(schema.default)}\``);
  }
  const limits = schemaLimits(schema);
  if (limits) bits.push(limits);
  const head = bits.join(", ");
  return schema.description ? `- ${head} — ${schema.description}` : `- ${head}`;
}

function formatParams(inputSchema) {
  const props = inputSchema.properties ?? {};
  const required = new Set(inputSchema.required ?? []);
  const names = Object.keys(props);
  if (names.length === 0) return "_(no parameters)_";
  return names
    .map((n) => formatParam(n, props[n], required.has(n)))
    .join("\n");
}

function formatTool(t) {
  return (
    `#### \`${t.name}\`${badge(t.title, t.description)}\n\n` +
    `${t.title ?? t.name}\n\n${formatParams(t.inputSchema)}`
  );
}

function formatFixedResource(r) {
  const desc = r.description ? ` — ${r.description}` : "";
  return `- \`${r.uri}\` — ${r.title ?? r.name}${badge(r.title, r.description)} (${r.mimeType ?? "unknown"})${desc}`;
}

function formatTemplate(t) {
  const desc = t.description ? ` — ${t.description}` : "";
  const completion = t.completionNotes.length
    ? `\n\nCompletion: ${t.completionNotes.join("; ")}`
    : "";
  return (
    `#### \`${t.uriTemplate}\`${badge(t.title, t.description)}\n\n` +
    `${t.title ?? t.name} (${t.mimeType ?? "unknown"})${desc}${completion}`
  );
}

function formatPrompt(p) {
  const args = (p.arguments ?? []).length
    ? p.arguments
        .map(
          (a) =>
            `- \`${a.name}\` (${a.required ? "required" : "optional"})${a.description ? ` — ${a.description}` : ""}`,
        )
        .join("\n")
    : "_(no arguments)_";
  return (
    `#### \`${p.name}\`${badge(p.title, p.description)}\n\n` +
    `${p.title ?? p.name}\n\n${args}`
  );
}

function formatServerSection(heading, meta, surface) {
  return [
    `## ${heading}`,
    "",
    meta,
    "",
    `**${surface.prompts.length} prompt(s) · ${surface.fixedResources.length} fixed resource(s) + ${surface.templates.length} template(s) (${surface.resourceCount} concrete resource(s) listed) · ${surface.tools.length} tool(s)**`,
    "",
    "### Prompts",
    "",
    surface.prompts.map(formatPrompt).join("\n\n"),
    "",
    "### Resources",
    "",
    "#### Fixed",
    "",
    surface.fixedResources.map(formatFixedResource).join("\n"),
    "",
    "#### Templates",
    "",
    surface.templates.map(formatTemplate).join("\n\n"),
    "",
    "### Tools",
    "",
    surface.tools.map(formatTool).join("\n\n"),
  ].join("\n");
}

async function frameworkMeta(client) {
  const res = await client.callTool({ name: "get_framework_info", arguments: {} });
  const info = res.structuredContent;
  return `Data v${info.data_version}, crawled ${String(info.crawled_at).slice(0, 10)}. Default (non-experimental) posture — the shipped default.`;
}

async function focusMeta(client) {
  const res = await client.callTool({ name: "list_versions", arguments: {} });
  const info = res.structuredContent;
  const versions = info.versions.map((v) => v.spec_version).join(", ");
  return `FOCUS spec versions ${versions}; latest ${info.latest}.`;
}

async function main() {
  ensureBuilt();

  const fw = await connect("framework");
  const fwExp = await connect("framework", { FINOPS_MCP_EXPERIMENTAL: "1" });
  const focus = await connect("focus");

  const fwMetaLine = await frameworkMeta(fw);
  const focusMetaLine = await focusMeta(focus);

  const fwSurface = await surfaceFor(fw);
  const fwExpSurface = await surfaceFor(fwExp);
  const focusSurface = await surfaceFor(focus);

  const extraTools = fwExpSurface.tools.filter(
    (t) => !fwSurface.tools.some((x) => x.name === t.name),
  );

  await fw.close();
  await fwExp.close();
  await focus.close();

  const header = [
    "# MCP surface",
    "",
    "<!-- GENERATED by scripts/gen-mcp-surface.mjs — do not hand-edit. Re-run " +
      "`node scripts/gen-mcp-surface.mjs` after any prompt/resource/tool change " +
      "and commit the diff. -->",
    "",
    "Live prompts → resources → tools hierarchy of both MCP servers shipped " +
      "from this repo, captured from each server's own `tools/list`, " +
      "`resources/list`, `resources/templates/list`, and `prompts/list` " +
      "responses (plus `completion/complete` probes for resource-template " +
      "arguments) — the same client-bridge pattern as " +
      "`evals/framework/mcp-call.mjs`, not hand-maintained prose.",
    "",
    "## Legend",
    "",
    '- **[UNOFFICIAL/EXPERIMENTAL]** — title or description contains ' +
      '"unofficial" or "experimental": content derived/parsed by this ' +
      "server rather than published or endorsed by the FinOps Foundation " +
      "or the FOCUS project (`official: false` in structured output), " +
      "and/or gated behind an opt-in environment flag. Unmarked entries " +
      "are official framework/FOCUS content, restructured.",
  ].join("\n");

  const experimentalSection = extraTools.length
    ? [
        "### Experimental extensions (`FINOPS_MCP_EXPERIMENTAL=1`)",
        "",
        `Adds ${extraTools.length} tool(s) not present in the default posture above:`,
        "",
        extraTools.map(formatTool).join("\n\n"),
      ].join("\n")
    : null;

  const doc =
    [
      header,
      formatServerSection("finops-framework server", fwMetaLine, fwSurface),
      experimentalSection,
      formatServerSection("finops-focus server", focusMetaLine, focusSurface),
    ]
      .filter(Boolean)
      .join("\n\n") + "\n";

  if (process.argv.includes("--check")) {
    const existing = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : "";
    if (existing !== doc) {
      console.error(
        "docs/mcp-surface.md is stale — run `node scripts/gen-mcp-surface.mjs` and commit the diff.",
      );
      process.exitCode = 1;
      return;
    }
    console.error("docs/mcp-surface.md is up to date.");
    return;
  }
  writeFileSync(OUT_PATH, doc, "utf8");
  console.error(`Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
