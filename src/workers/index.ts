// Cloudflare Worker entry point (T-037, wrangler.toml `main`). Loads both
// data artifacts once per isolate (module scope — reused across requests
// until the isolate recycles) and reads the Origin allowlist from a
// wrangler.toml `[vars]` binding so the owner can change it per environment
// without a code change. See docs/deploy-worker.md for the deploy
// checklist; this file is never exercised by wrangler in tests — app.test.ts
// drives src/workers/app.ts directly with native Request objects.
import { createFetchHandler } from "./app.js";
import { loadWorkerData } from "./data.js";

export interface Env {
  /** Comma-separated list of allowed Origin header values. Unset/empty means
   * only requests with no Origin header (non-browser MCP clients) succeed. */
  ALLOWED_ORIGINS?: string;
}

const { frameworkArtifact, focusStore } = loadWorkerData();

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = createFetchHandler({
      frameworkArtifact,
      focusStore,
      allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    });
    return handler(request);
  },
};
