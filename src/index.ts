/** Repo scaffold entry: re-exports the framework MCP server. */
export {
  createServer,
  SERVER_NAME,
  SERVER_VERSION,
} from "./servers/framework/server.js";

/** Starter export shipped by the typescript preset — kept for the scaffold test. */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
