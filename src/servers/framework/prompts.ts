import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";
import type { Artifact } from "../../shared/index.js";
import { capabilityMd, collectionMd, overviewMd } from "./render.js";
import type { ServerOptions } from "./server.js";
import { URI } from "./uris.js";

// Prompts render server-side with embedded-resource content blocks so the
// workflow survives hosts that never surface resources to the model
// (critique M8). Content comes from the same renderers as resources (M10).

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

export function registerPrompts(
  server: McpServer,
  artifact: Artifact,
  opts: ServerOptions = {},
): void {
  const experimental = opts.experimental ?? false;
  const capSlugs = artifact.capabilities.map((c) => c.slug);
  const personaSlugs = artifact.personas.map((p) => p.slug);
  // .describe() must be applied INSIDE completable(): zod v4 clones on
  // describe and would drop the SDK's completable marker (critique-2 M1').
  const capabilityArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      capSlugs.filter((s) => s.startsWith(v)),
    );
  // assess_maturity_path only ever accepts crawl|walk|run (never pre-crawl,
  // regardless of the experimental flag — see spec §4), so this completion
  // stays official-only in both modes.
  const currentLevelArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      ["crawl", "walk", "run"].filter((l) => l.startsWith(v)),
    );
  const targetLevelArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      ["crawl", "walk", "run"].filter((l) => l.startsWith(v)),
    );
  const personaArg = (desc: string) =>
    completable(z.string().describe(desc), (v) =>
      personaSlugs.filter((s) => s.startsWith(v)),
    );

  server.registerPrompt(
    "explain-framework",
    {
      title: "Explain the FinOps Framework",
      description:
        "Guided onboarding tour of the framework, tailored to an audience (e.g. 'engineering leadership', 'new FinOps hire').",
      argsSchema: {
        audience: z.string().optional().describe("Who the explanation is for"),
      },
    },
    ({ audience }) => ({
      messages: [
        embedded(URI.overview, overviewMd(artifact, experimental)),
        embedded(URI.domains, collectionMd(artifact, "domains")),
        instruction(
          `Using the embedded overview and domains above, give ${
            audience ?? "a newcomer"
          } a guided tour of the FinOps Framework: the operating model in one paragraph, the six principles in one line each (read finops://framework/principles or call search_framework if needed), the Inform/Optimize/Operate loop, then the four domains with 2-3 example capabilities each (use list_capabilities). Close with how maturity works (Crawl/Walk/Run${
            experimental
              ? ` — note that "Pre-Crawl" used by this server is an unofficial extension`
              : ""
          }) and suggest three concrete next questions they could ask this server.`,
        ),
      ],
    }),
  );

  server.registerPrompt(
    "assess-capability-maturity",
    {
      title: "Assess a capability's maturity",
      description: experimental
        ? "Structured interview to place an organization's maturity (pre-crawl/crawl/walk/run) for one capability, citing assessment characteristics as evidence."
        : "Structured interview to place an organization's maturity (crawl/walk/run) for one capability, citing the official assessment text as evidence.",
      argsSchema: {
        capability: capabilityArg("Capability slug, e.g. 'allocation'"),
      },
    },
    ({ capability }) => {
      const c = artifact.capabilities.find((x) => x.slug === capability);
      if (!c) {
        return {
          messages: [
            instruction(
              `Unknown capability "${capability}". Call list_capabilities, pick a slug, and re-invoke this prompt.`,
            ),
          ],
        };
      }
      return {
        messages: [
          embedded(URI.capability(c.slug), capabilityMd(artifact, c)),
          instruction(
            `You are assessing the organization's maturity in the "${c.title}" capability using the embedded document above. ` +
              (experimental
                ? `Call get_actions(capability: "${c.slug}") to get the per-level assessment characteristics (note: they are rubric states, an unofficial parsing — not official steps). `
                : `Call get_maturity_assessment(capability: "${c.slug}") to get the official per-level assessment text. `) +
              `Then interview me: ask at most 5 focused questions, one at a time, each probing whether specific Crawl, Walk, or Run characteristics hold. ` +
              `When confident, deliver a verdict: the level${experimental ? ` (say "pre-crawl" only as this server's unofficial below-Crawl extension)` : ""}, the 3-5 statements that anchored it (quote them), what blocks the next level, and which KPIs from get_kpis(capability: "${c.slug}") would evidence progress.`,
          ),
        ],
      };
    },
  );

  server.registerPrompt(
    "plan-maturity-roadmap",
    {
      title: "Plan a maturity roadmap",
      description:
        "Ordered plan to move one capability from a current to a target maturity level, citing the official assessment text as evidence.",
      argsSchema: {
        capability: capabilityArg("Capability slug"),
        current: currentLevelArg("Current level: crawl|walk|run"),
        target: targetLevelArg("Target level: crawl|walk|run"),
      },
    },
    ({ capability, current, target }) => {
      const c = artifact.capabilities.find((x) => x.slug === capability);
      const order = ["crawl", "walk", "run"];
      if (!c || order.indexOf(target) <= order.indexOf(current)) {
        return {
          messages: [
            instruction(
              !c
                ? `Unknown capability "${capability}". Call list_capabilities, pick a slug, and re-invoke this prompt.`
                : `target ("${target}") must be above current ("${current}"). Re-invoke with a higher target level.`,
            ),
          ],
        };
      }
      return {
        messages: [
          embedded(
            URI.capability(c.slug),
            capabilityMd(artifact, c, ["summary", "definition"]),
          ),
          instruction(
            `Build a maturity roadmap for capability "${capability}" from "${current}" to "${target}".\n` +
              `1. Call assess_maturity_path(capability: "${capability}", current_level: "${current}", target_level: "${target}") — the gap assessment text is evidence to aim for, not literal tasks.\n` +
              `2. Call get_kpis(capability: "${capability}") and attach 2-3 KPIs as progress measures per phase of the plan.\n` +
              `Deliver: a phased roadmap (quarters or stages), each phase with target characteristics, owning personas (map_personas(capability: "${capability}")), and KPIs. Remind the reader that maturing beyond business value is explicitly discouraged by the framework's maturity model.`,
          ),
        ],
      };
    },
  );

  server.registerPrompt(
    "map-personas-to-capabilities",
    {
      title: "Map personas to capabilities",
      description:
        "Engagement guide: what a persona (or every persona) does across the framework's capabilities.",
      argsSchema: {
        persona: personaArg(
          "Persona slug (finops-practitioner, finance, itam, …); omit for all",
        ).optional(),
      },
    },
    ({ persona }) => ({
      messages: [
        embedded(URI.personasIndex, collectionMd(artifact, "personas-index")),
        instruction(
          persona
            ? `Using map_personas(persona: "${persona}") and the persona document at finops://framework/personas/${persona}, produce an engagement guide for the ${persona} persona: their goals, the capabilities they work in (grouped by domain via list_capabilities), their concrete activities in each, and where they must coordinate with other personas. If the persona is allied, state clearly that the framework maps allied personas to capabilities collectively, not individually.`
            : `Using the embedded persona index, call map_personas(persona: <slug>) for each core persona and produce a matrix: personas × the domains/capabilities they are most active in, with one-line activity summaries. Note that allied personas are mapped at group level.`,
        ),
      ],
    }),
  );
}
