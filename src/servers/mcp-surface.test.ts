// Drift guard for docs/mcp-surface.md (T-054): every prompt/resource/tool
// each server actually advertises must be named in that server's section of
// the doc, and the section's summary counts must match. This runs against
// the TS source via InMemoryTransport (no dist build required, so it stays
// in the fast gate tier) — it does not re-render the doc; regeneration is
// scripts/gen-mcp-surface.mjs, run and committed by hand after a surface
// change.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { loadArtifact, loadFocusStore } from "../shared/index.js";
import { createServer as createFocusServer } from "./focus/server.js";
import { createServer as createFrameworkServer } from "./framework/server.js";

const DOC_PATH = join(import.meta.dirname, "../../docs/mcp-surface.md");
const doc = readFileSync(DOC_PATH, "utf8");

function section(heading: string): string {
  const start = doc.indexOf(`## ${heading}`);
  expect(
    start,
    `"${heading}" section missing from docs/mcp-surface.md`,
  ).toBeGreaterThanOrEqual(0);
  const next = doc.indexOf("\n## ", start + 1);
  return doc.slice(start, next === -1 ? doc.length : next);
}

// Mirrors scripts/gen-mcp-surface.mjs's templateRegex: turns a URI template
// into a matcher so template-expanded concrete resources (e.g. every
// capability under {slug}) can be told apart from truly fixed ones.
function templateRegex(uriTemplate: string): RegExp {
  const escapeLiteral = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = uriTemplate
    .split(/(\{[^}]+\})/g)
    .map((part) => (/^\{[^}]+\}$/.test(part) ? "[^/]+" : escapeLiteral(part)))
    .join("");
  return new RegExp(`^${pattern}$`);
}

async function linked(server: McpServer): Promise<Client> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "mcp-surface-test", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

async function assertSectionMatchesLiveSurface(
  client: Client,
  heading: string,
) {
  const doc_section = section(heading);
  const tools = (await client.listTools()).tools;
  const resources = (await client.listResources()).resources;
  const templates = (await client.listResourceTemplates()).resourceTemplates;
  const prompts = (await client.listPrompts()).prompts;

  for (const t of tools) {
    expect(
      doc_section,
      `tool "${t.name}" missing from "${heading}" doc section`,
    ).toContain(`\`${t.name}\``);
  }
  for (const p of prompts) {
    expect(
      doc_section,
      `prompt "${p.name}" missing from "${heading}" doc section`,
    ).toContain(`\`${p.name}\``);
  }
  for (const rt of templates) {
    expect(
      doc_section,
      `resource template "${rt.uriTemplate}" missing from "${heading}" doc section`,
    ).toContain(`\`${rt.uriTemplate}\``);
  }
  const templateRegexes = templates.map((t) => templateRegex(t.uriTemplate));
  const fixed = resources.filter(
    (r) => !templateRegexes.some((re) => re.test(r.uri)),
  );
  for (const r of fixed) {
    expect(
      doc_section,
      `fixed resource "${r.uri}" missing from "${heading}" doc section`,
    ).toContain(`\`${r.uri}\``);
  }

  expect(doc_section).toContain(`${prompts.length} prompt(s)`);
  expect(doc_section).toContain(`${fixed.length} fixed resource(s)`);
  expect(doc_section).toContain(`${templates.length} template(s)`);
  expect(doc_section).toContain(`${tools.length} tool(s)`);
}

describe("docs/mcp-surface.md matches the live server surface", () => {
  it("documents the framework server's default-posture surface", async () => {
    const artifact = loadArtifact(
      join(import.meta.dirname, "../../data/framework"),
    );
    const client = await linked(
      createFrameworkServer(artifact, { experimental: false }),
    );
    await assertSectionMatchesLiveSurface(client, "finops-framework server");
    await client.close();
  });

  it("documents the framework server's experimental extras", async () => {
    const artifact = loadArtifact(
      join(import.meta.dirname, "../../data/framework"),
    );
    const client = await linked(
      createFrameworkServer(artifact, { experimental: true }),
    );
    const tools = (await client.listTools()).tools;
    for (const t of tools) {
      expect(
        doc,
        `experimental tool "${t.name}" missing from docs/mcp-surface.md`,
      ).toContain(`\`${t.name}\``);
    }
    await client.close();
  });

  it("documents the focus server's surface", async () => {
    const store = loadFocusStore(join(import.meta.dirname, "../../data/focus"));
    const client = await linked(createFocusServer(store));
    await assertSectionMatchesLiveSurface(client, "finops-focus server");
    await client.close();
  });
});
