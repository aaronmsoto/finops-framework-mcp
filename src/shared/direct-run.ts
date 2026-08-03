import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * True when `process.argv[1]` resolves to the same file as `moduleUrl`
 * (typically a caller's own `import.meta.url`) — used to gate a bin
 * module's side-effecting entry point so it only runs on direct invocation,
 * not when imported by tests. npm installs bins as a node_modules/.bin
 * symlink whose argv[1] is the UNRESOLVED link path (critique-3 BLOCKER
 * A4-community-1), so realpaths are compared instead of a string suffix.
 */
export function isDirectRunOf(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
