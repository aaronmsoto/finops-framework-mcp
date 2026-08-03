import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { nearestMatches } from "./slugs.js";

const RESOURCE_NOT_FOUND = -32002;

/** Throws the MCP resource-not-found error (-32002) both servers use for an
 * unresolved slug/version in a resource URI, with nearest-match suggestions
 * for an actionable message. */
export function notFound(
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
