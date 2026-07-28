import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import type { FocusStore } from "../../shared/focus/artifact.js";
import { nearestMatches } from "../../shared/index.js";
import {
  attributeMd,
  columnMd,
  diffMd,
  glossaryMd,
  overviewMd,
} from "./render.js";
import { TEMPLATES, URI } from "./uris.js";

const RESOURCE_NOT_FOUND = -32002;

function notFound(
  uri: string,
  kind: string,
  input: string,
  candidates: string[],
): never {
  const near = nearestMatches(input, candidates);
  throw new McpError(
    RESOURCE_NOT_FOUND,
    `Resource not found: unknown ${kind} "${input}"` +
      (near.length ? ` — did you mean: ${near.join(", ")}?` : ""),
    { uri },
  );
}

const MD = "text/markdown";
const JSONM = "application/json";

export function registerResources(server: McpServer, store: FocusStore): void {
  const versionSlugs = store.index.versions.map((v) => v.spec_version);
  const latestArtifact = store.versions.get(store.index.latest);
  if (!latestArtifact) {
    throw new Error(
      `focus store: latest version "${store.index.latest}" has no loaded artifact`,
    );
  }
  const lastModified = latestArtifact.manifest.crawled_at;
  const std = (extra?: Record<string, unknown>) => ({
    mimeType: MD,
    annotations: { lastModified, ...(extra ?? {}) },
  });
  const text = (uri: string, body: string, mimeType = MD) => ({
    contents: [{ uri, mimeType, text: body }],
  });

  server.registerResource(
    "overview",
    URI.overview,
    {
      title: "FOCUS spec server overview",
      description:
        "Start here: what this server covers and how to navigate its version-pinned tools.",
      ...std({ priority: 0.9 }),
    },
    (uri) =>
      text(
        uri.href,
        overviewMd(
          { latest: store.index.latest, versionSlugs },
          latestArtifact,
        ),
      ),
  );

  server.registerResource(
    "versions",
    URI.versions,
    {
      title: "FOCUS spec versions",
      description:
        "Every FOCUS spec version served, with source tag and counts.",
      mimeType: JSONM,
      annotations: { lastModified },
    },
    (uri) =>
      text(
        uri.href,
        JSON.stringify(
          {
            latest: store.index.latest,
            versions: store.index.versions.map((v) => ({
              ...v,
              counts: store.versions.get(v.spec_version)?.manifest.counts,
            })),
          },
          null,
          2,
        ),
        JSONM,
      ),
  );

  server.registerResource(
    "column",
    new ResourceTemplate(TEMPLATES.column, {
      list: () => ({
        resources: [...store.versions.entries()].flatMap(([version, a]) =>
          a.columns.map((c) => ({
            uri: URI.column(version, c.slug),
            name: `${c.display_name} (FOCUS ${version})`,
            description: c.description_md.slice(0, 180),
            mimeType: MD,
          })),
        ),
      }),
      complete: {
        version: (v) => versionSlugs.filter((s) => s.startsWith(v)),
        slug: (v, context) => {
          const version = context?.arguments?.version ?? store.index.latest;
          const artifact = store.versions.get(version) ?? latestArtifact;
          return artifact.columns
            .map((c) => c.slug)
            .filter((s) => s.startsWith(v));
        },
      },
    }),
    {
      title: "FOCUS column document",
      description:
        "Full column record: description, content constraints, allowed values, normative requirements.",
      ...std(),
    },
    (uri, vars) => {
      const version = String(vars.version);
      const slug = String(vars.slug);
      const artifact = store.versions.get(version);
      if (!artifact)
        notFound(uri.href, "FOCUS spec version", version, versionSlugs);
      const c = artifact.columns.find((x) => x.slug === slug);
      if (!c) {
        notFound(
          uri.href,
          "column",
          slug,
          artifact.columns.map((x) => x.slug),
        );
      }
      return text(uri.href, columnMd(artifact, version, c));
    },
  );

  server.registerResource(
    "attribute",
    new ResourceTemplate(TEMPLATES.attribute, {
      list: () => ({
        resources: [...store.versions.entries()].flatMap(([version, a]) =>
          a.attributes.map((at) => ({
            uri: URI.attribute(version, at.slug),
            name: `${at.display_name} (FOCUS ${version})`,
            description: at.description_md.slice(0, 180),
            mimeType: MD,
          })),
        ),
      }),
      complete: {
        version: (v) => versionSlugs.filter((s) => s.startsWith(v)),
        slug: (v, context) => {
          const version = context?.arguments?.version ?? store.index.latest;
          const artifact = store.versions.get(version) ?? latestArtifact;
          return artifact.attributes
            .map((a) => a.slug)
            .filter((s) => s.startsWith(v));
        },
      },
    }),
    {
      title: "FOCUS attribute document",
      description:
        "Full attribute record: description, normative requirements, exceptions.",
      ...std(),
    },
    (uri, vars) => {
      const version = String(vars.version);
      const slug = String(vars.slug);
      const artifact = store.versions.get(version);
      if (!artifact)
        notFound(uri.href, "FOCUS spec version", version, versionSlugs);
      const a = artifact.attributes.find((x) => x.slug === slug);
      if (!a) {
        notFound(
          uri.href,
          "attribute",
          slug,
          artifact.attributes.map((x) => x.slug),
        );
      }
      return text(uri.href, attributeMd(artifact, version, a));
    },
  );

  server.registerResource(
    "glossary",
    new ResourceTemplate(TEMPLATES.glossary, {
      list: () => ({
        resources: versionSlugs.map((version) => ({
          uri: URI.glossary(version),
          name: `FOCUS ${version} glossary`,
          description: `Term glossary for FOCUS ${version}`,
          mimeType: MD,
        })),
      }),
      complete: {
        version: (v) => versionSlugs.filter((s) => s.startsWith(v)),
      },
    }),
    {
      title: "FOCUS glossary",
      description: "Term glossary for one spec version.",
      ...std(),
    },
    (uri, vars) => {
      const version = String(vars.version);
      const artifact = store.versions.get(version);
      if (!artifact)
        notFound(uri.href, "FOCUS spec version", version, versionSlugs);
      return text(uri.href, glossaryMd(artifact));
    },
  );

  server.registerResource(
    "changes",
    URI.changes(store.diff.from, store.diff.to),
    {
      title: `FOCUS ${store.diff.from}→${store.diff.to} diff`,
      description:
        "Unofficial column diff between the two pinned spec versions, source-cited.",
      ...std(),
    },
    (uri) => text(uri.href, diffMd(store.diff)),
  );
}
