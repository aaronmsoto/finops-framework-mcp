import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { notFound } from "../../shared/mcp-not-found.js";
import type { TokenomicsArtifact } from "../../shared/tokenomics/artifact.js";
import {
  bigtClassMd,
  bigtLadderMd,
  documentMd,
  focusTrackerMd,
  glossaryMd,
  layerMd,
  leverMd,
  metricMd,
  personaMd,
  startMd,
} from "./render.js";
import { TEMPLATES, URI } from "./uris.js";

const MD = "text/markdown";

export function registerResources(
  server: McpServer,
  a: TokenomicsArtifact,
  opts: { experimental: boolean; curriculum: boolean },
): void {
  const lastModified = a.manifest.crawled_at;
  const std = (extra?: Record<string, unknown>) => ({
    mimeType: MD,
    annotations: { lastModified, ...(extra ?? {}) },
  });
  const text = (uri: string, body: string, mimeType = MD) => ({
    contents: [{ uri, mimeType, text: body }],
  });
  const cw = (type: string, slug: string) =>
    opts.experimental
      ? a.crosswalk.filter((c) => c.from.type === type && c.from.slug === slug)
      : [];
  const links = (type: string, slug: string) =>
    a.crosslinks.filter((l) => l.from.type === type && l.from.slug === slug);

  server.registerResource(
    "start",
    URI.start,
    {
      title: "Tokenomics server overview",
      description: "Start here: sources, their statuses, and how to navigate.",
      ...std({ priority: 0.9 }),
    },
    (uri) => text(uri.href, startMd(a, opts)),
  );
  server.registerResource(
    "bigt",
    URI.bigt,
    {
      title: "Big-T notation and complexity ladder",
      description:
        "T(n · k · a), its three variables, and the six classes with fixes.",
      ...std({ priority: 0.8 }),
    },
    (uri) => text(uri.href, bigtLadderMd(a)),
  );
  server.registerResource(
    "glossary",
    URI.glossary,
    {
      title: "Tokenomics glossary",
      description: "Terms from the definition page and the cache explainer.",
      ...std(),
    },
    (uri) => text(uri.href, glossaryMd(a)),
  );
  server.registerResource(
    "focus-tracker",
    URI.focusTracker,
    {
      title: "FOCUS 1.5 AI-cost tracker",
      description:
        "What FOCUS 1.5 does (and does not) do for AI cost, by status bucket.",
      ...std(),
    },
    (uri) => text(uri.href, focusTrackerMd(a)),
  );
  server.registerResource(
    "manifest",
    URI.manifest,
    {
      title: "Data artifact manifest",
      description:
        "Data version, crawl time, counts, parse warnings, unregistered pages.",
      mimeType: "application/json",
      annotations: { lastModified },
    },
    (uri) => {
      const { sha256: _omit, ...rest } = a.manifest;
      void _omit;
      return text(uri.href, JSON.stringify(rest, null, 2), "application/json");
    },
  );

  const template = (
    name: string,
    tpl: string,
    slugs: () => string[],
    title: string,
    description: string,
    render: (slug: string, href: string) => string,
    kind: string,
  ) =>
    server.registerResource(
      name,
      new ResourceTemplate(tpl, {
        list: () => ({
          resources: slugs().map((s) => ({
            uri: tpl.replace("{slug}", s),
            name: s,
            mimeType: MD,
          })),
        }),
        complete: { slug: (v) => slugs().filter((s) => s.startsWith(v)) },
      }),
      { title, description, ...std() },
      (uri, vars) => {
        const slug = String(vars.slug);
        if (!slugs().includes(slug)) notFound(uri.href, kind, slug, slugs());
        return text(uri.href, render(slug, uri.href));
      },
    );

  template(
    "document",
    TEMPLATES.document,
    () => a.documents.map((d) => d.slug),
    "Tokenomics Foundation document",
    "Canonical markdown of one source document, with its publication status.",
    (s) =>
      documentMd(
        a,
        a.documents.find((d) => d.slug === s) as (typeof a.documents)[number],
      ),
    "document",
  );
  template(
    "layer",
    TEMPLATES.layer,
    () => a.layers.map((l) => l.slug),
    "Stack layer",
    "One layer of the Five-Layer Tokenomics Stack.",
    (s) => {
      const l = a.layers.find((x) => x.slug === s) as (typeof a.layers)[number];
      return layerMd(
        a,
        l,
        a.levers.filter((x) => x.layer === l.number),
      );
    },
    "layer",
  );
  template(
    "bigt-class",
    TEMPLATES.bigtClass,
    () => a.bigt.classes.map((c) => c.slug),
    "Big-T class",
    "One rung of the Big-T complexity ladder.",
    (s) => {
      const c = a.bigt.classes.find(
        (x) => x.slug === s,
      ) as (typeof a.bigt.classes)[number];
      return bigtClassMd(
        a,
        c,
        a.levers.filter((l) => l.bigt_classes.includes(c.slug)),
        a.layers.filter((l) => l.multiplier_effect.includes(c.notation)),
      );
    },
    "Big-T class",
  );
  template(
    "lever",
    TEMPLATES.lever,
    () => a.levers.map((l) => l.slug),
    "Optimization lever",
    "One consumption/efficiency lever with provenance.",
    (s) =>
      leverMd(
        a,
        a.levers.find((x) => x.slug === s) as (typeof a.levers)[number],
      ),
    "lever",
  );
  template(
    "metric",
    TEMPLATES.metric,
    () => a.metrics.map((m) => m.slug),
    "Reference metric",
    "One metric's published formula, definition, targets, and cross-links.",
    (s) =>
      metricMd(
        a,
        a.metrics.find((x) => x.slug === s) as (typeof a.metrics)[number],
        links("metric", s),
        cw("metric", s),
      ),
    "metric",
  );
  template(
    "persona",
    TEMPLATES.persona,
    () => a.personas.map((p) => p.slug),
    "Tokenomics persona",
    "One persona's responsibilities, signals, and cross-links.",
    (s) =>
      personaMd(
        a,
        a.personas.find((x) => x.slug === s) as (typeof a.personas)[number],
        links("persona", s),
        cw("persona", s),
      ),
    "persona",
  );
}
