import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";
import type { FocusStore } from "../../shared/focus/artifact.js";
import { columnMd, diffMd, overviewMd } from "./render.js";
import { URI } from "./uris.js";

// Prompts render server-side with embedded-resource content blocks so the
// workflow survives hosts that never surface resources to the model
// (mirrors the framework server's prompts.ts pattern).

type Msg = {
  role: "user" | "assistant";
  content:
    | { type: "text"; text: string }
    | {
        type: "resource";
        resource: { uri: string; mimeType: string; text: string };
      };
};

function embedded(uri: string, text: string): Msg {
  return {
    role: "user",
    content: {
      type: "resource",
      resource: { uri, mimeType: "text/markdown", text },
    },
  };
}

function instruction(text: string): Msg {
  return { role: "user", content: { type: "text", text } };
}

export function registerPrompts(server: McpServer, store: FocusStore): void {
  const versionSlugs = store.index.versions.map((v) => v.spec_version);
  const latestArtifact = store.versions.get(store.index.latest);
  if (!latestArtifact) {
    throw new Error(
      `focus store: latest version "${store.index.latest}" has no loaded artifact`,
    );
  }
  const versionArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      versionSlugs.filter((s) => s.startsWith(v)),
    );
  const columnArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      latestArtifact.columns
        .map((c) => c.id)
        .filter((s) => s.toLowerCase().startsWith(v.toLowerCase())),
    );

  server.registerPrompt(
    "explain-focus",
    {
      title: "Explain the FOCUS spec",
      description:
        "Guided orientation to the FOCUS (FinOps Open Cost & Usage Specification): what it standardizes, how versions differ, and how to look up columns.",
      argsSchema: {
        version: versionArg(
          `Which version to focus on (${versionSlugs.join("|")}); default latest`,
        ).optional(),
      },
    },
    ({ version }) => {
      const v = version ?? store.index.latest;
      const artifact = store.versions.get(v) ?? latestArtifact;
      return {
        messages: [
          embedded(
            URI.overview,
            overviewMd({ latest: store.index.latest, versionSlugs }, artifact),
          ),
          instruction(
            `Using the embedded overview above, explain FOCUS ${v} to someone new to it: what problem it solves ` +
              `(a common billing data schema across cloud/SaaS providers), the Mandatory vs Conditional vs ` +
              `Recommended feature levels (call list_columns to show real examples of each), and how to look up ` +
              `a specific column (get_column) or its normative requirements (get_requirements). Close by noting ` +
              `this server also serves other versions (${versionSlugs.join(", ")}) via compare_versions.`,
          ),
        ],
      };
    },
  );

  server.registerPrompt(
    "map-column-across-versions",
    {
      title: "Trace one column across FOCUS versions",
      description:
        "For one Column ID, show its record in each served version and the 1.0→1.2 diff status, citing sources.",
      argsSchema: {
        column: columnArg("Column ID, e.g. 'BilledCost'"),
      },
    },
    ({ column }) => {
      const messages: Msg[] = [];
      for (const [version, artifact] of store.versions) {
        const c = artifact.columns.find(
          (x) => x.id.toLowerCase() === column.toLowerCase(),
        );
        if (c)
          messages.push(
            embedded(
              URI.column(version, c.slug),
              columnMd(artifact, version, c),
            ),
          );
      }
      messages.push(
        embedded(
          URI.changes(store.diff.from, store.diff.to),
          diffMd(store.diff),
        ),
      );
      messages.push(
        instruction(
          `Using the embedded column document(s) and diff above for "${column}", summarize: which versions ` +
            `define it, whether its content constraints changed, and (via compare_versions(column: "${column}") ` +
            `if you need the machine-readable form) its exact diff status between ${store.diff.from} and ${store.diff.to}.`,
        ),
      );
      return { messages };
    },
  );
}
