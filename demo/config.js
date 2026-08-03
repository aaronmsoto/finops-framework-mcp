// Single endpoint-config object for the demo (T-038,
// .agents/specs/focus-mcp-v1.md "Packaging / worker / demo"). Points at a
// deployed Worker (docs/deploy-worker.md) serving both MCP servers over
// HTTPS. Override `workerBaseUrl` here, or leave the default and change it
// from the page's "Worker URL" field at runtime (kept in memory only, never
// persisted).
export const CONFIG = {
  workerBaseUrl: "http://localhost:8787",
  routes: {
    framework: "/mcp/framework",
    focus: "/mcp/focus",
  },
};

export function endpointUrl(server, baseUrl) {
  const base = (baseUrl ?? CONFIG.workerBaseUrl).replace(/\/+$/, "");
  return `${base}${CONFIG.routes[server]}`;
}
