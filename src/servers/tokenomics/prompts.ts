import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";
import type { TokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import { bigtLadderMd, documentMd, docBySlug, metricMd } from "./render.js";
import { URI } from "./uris.js";

// Prompts render server-side with embedded-resource content blocks so the
// workflow survives hosts that never surface resources to the model (same
// pattern as the framework and FOCUS servers).

type Msg = {
  role: "user" | "assistant";
  content:
    | { type: "text"; text: string }
    | {
        type: "resource";
        resource: { uri: string; mimeType: string; text: string };
      };
};

const embedded = (uri: string, text: string): Msg => ({
  role: "user",
  content: {
    type: "resource",
    resource: { uri, mimeType: "text/markdown", text },
  },
});
const instruction = (text: string): Msg => ({
  role: "user",
  content: { type: "text", text },
});

export function registerPrompts(
  server: McpServer,
  a: TokenomicsArtifact,
): void {
  const metric = (slug: string) => {
    const m = a.metrics.find((x) => x.slug === slug);
    return m ? embedded(URI.metric(slug), metricMd(a, m, [], [])) : null;
  };
  const layersTable = () =>
    `| Layer | Moves the multiplier? | Key metric | Primary levers |\n| --- | --- | --- | --- |\n` +
    a.layers
      .map(
        (l) =>
          `| ${l.table_label} | ${l.multiplier_effect} | ${l.key_metric} | ${l.primary_levers.join("; ")} |`,
      )
      .join("\n");
  const cacheDoc = docBySlug(a, "cache-explainer");

  server.registerPrompt(
    "optimize_consumption",
    {
      title: "Optimize an AI workload's token consumption",
      description:
        "Walks a workload through Big-T classification, the stack layers and their levers, cache metrics, and the FinOps/FOCUS cross-links — grounded in Tokenomics Foundation guidance.",
      argsSchema: {
        workload: z
          .string()
          .describe(
            "Describe the workload: what it does, models, agents, volumes",
          ),
      },
    },
    ({ workload }) => ({
      messages: [
        instruction(
          `Help me reduce the token cost of this AI workload without degrading outcomes:\n\n${workload}\n\n` +
            "Work in this order, citing each source's status (drafts are not standards):\n" +
            "1. Classify it on the Big-T ladder (get_bigt_class) — name n, k, and a explicitly; hidden k (reasoning, context replay) counts.\n" +
            "2. If the class can change, recommend the architectural fix first (class beats constants).\n" +
            "3. Within the class, pick levers by layer (list_levers with layer / bigt_class): L3 caching before L4 right-sizing before L5 routing, and check routing does not break a warm cache.\n" +
            "4. Say which metrics to instrument (get_metric cache-hit-rate / cache-cost-efficiency; calculate_cache_metrics on real counts).\n" +
            "5. Point to the FinOps capability and FOCUS columns that carry this in billing data (get_crosslinks).",
        ),
        embedded(URI.bigt, bigtLadderMd(a)),
        instruction(`Five-Layer Stack summary:\n\n${layersTable()}`),
      ],
    }),
  );

  server.registerPrompt(
    "assess_prompt_caching",
    {
      title: "Assess prompt caching for a workload",
      description:
        "Checks a prompt layout against the cache explainer's three rules, then measures Cache Hit Rate and Cache Cost Efficiency with the published formulas.",
      argsSchema: {
        workload: z
          .string()
          .optional()
          .describe(
            "Prompt layout, provider/model, and token counts if you have them",
          ),
      },
    },
    ({ workload }) => {
      const msgs: Msg[] = [
        instruction(
          (workload ? `Workload:\n\n${workload}\n\n` : "") +
            "Assess this workload's prompt caching:\n" +
            "1. Check the prompt order against the three rules (matches from the start, exactly, in blocks with expiry): stable content first, growing content next, per-request content last.\n" +
            "2. Flag anything that silently breaks the prefix (timestamps, re-serialized JSON, tool list churn, model switches, router spreading load).\n" +
            "3. If token counts are available, run calculate_cache_metrics; otherwise list the three buckets to log (cache read, cache write, uncached input).\n" +
            "4. Compare per workload, not blended, and use get_provider_cache_snapshot for dated provider behavior.",
        ),
        embedded(
          URI.document(cacheDoc.slug),
          documentMd(a, cacheDoc, "tcthreerules"),
        ),
      ];
      for (const s of ["cache-hit-rate", "cache-cost-efficiency"]) {
        const m = metric(s);
        if (m) msgs.push(m);
      }
      return { messages: msgs };
    },
  );

  const classSlugs = a.bigt.classes.map((c) => c.notation);
  server.registerPrompt(
    "bigt_review",
    {
      title: "Big-T architecture review",
      description:
        "Reviews an architecture with Big-T notation: identifies n, k, and a, places it on the ladder, and proposes bounds (depth caps, budgets, circuit breakers) where it is agent-multiplicative or unbounded.",
      argsSchema: {
        architecture: z
          .string()
          .describe("The agent/pipeline architecture to review"),
        suspected_class: completable(
          z
            .string()
            .optional()
            .describe("Optional starting guess, e.g. T(n·k)"),
          (v = "") => classSlugs.filter((s) => s.startsWith(v)),
        ),
      },
    },
    ({ architecture, suspected_class }) => ({
      messages: [
        instruction(
          `Review this architecture with Big-T notation:\n\n${architecture}\n\n` +
            (suspected_class
              ? `Suspected class: ${suspected_class}.\n\n`
              : "") +
            "Answer the two questions in order: (1) what class is it, and is that class justified by the value it produces; (2) how cheaply does it run within its class. " +
            "Name the bounds any T(n·k·a) or T(∞) path needs, and compare classes at a stated quality floor.",
        ),
        embedded(URI.bigt, bigtLadderMd(a)),
      ],
    }),
  );
}
