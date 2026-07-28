// Generic MCP tool-response infra shared by every server built on this
// framework: read-only annotations, opaque pagination cursors, and the
// content-block/structuredContent response shape.
import { createHash } from "node:crypto";

export const RO = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export interface Cursor {
  v: string;
  o: number;
  /** Context fingerprint binding the cursor to its tool + query/filter set. */
  h: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString()) as Cursor;
    return typeof c.o === "number" && typeof c.v === "string" ? c : null;
  } catch {
    return null;
  }
}

/**
 * Stable fingerprint of the pagination context. A cursor is only valid for
 * the exact tool + query/filter combination that issued it; reusing one
 * across queries used to silently apply the stale offset to the new result
 * set (critique-3 A1-protocol-1). `limit` is deliberately excluded — page
 * size may change between pages of the same listing.
 */
export function cursorContext(
  tool: string,
  params: Record<string, unknown>,
): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return createHash("sha256")
    .update(`${tool}\n${JSON.stringify(entries)}`)
    .digest("base64url")
    .slice(0, 12);
}

export type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "resource_link";
      uri: string;
      name: string;
      description?: string;
      mimeType?: string;
    };

export type ToolResult = {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function err(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function ok(
  structured: Record<string, unknown>,
  summary?: string,
): ToolResult {
  return {
    content: [
      { type: "text", text: summary ?? JSON.stringify(structured, null, 2) },
    ],
    structuredContent: structured,
  };
}

export function isErr(x: unknown): x is ToolResult {
  return typeof x === "object" && x !== null && "isError" in (x as ToolResult);
}

/**
 * Slices `items` at the offset encoded in `cursorRaw` (or 0), validating the
 * cursor against the current `dataVersion` and the caller-supplied `context`
 * fingerprint. Returns a `ToolResult` error in place of a page when the
 * cursor is invalid, stale, or was issued for a different query.
 */
export function paginate<T>(
  items: T[],
  limit: number,
  cursorRaw: string | undefined,
  context: string,
  dataVersion: string,
): { page: T[]; nextCursor?: string } | ToolResult {
  let offset = 0;
  if (cursorRaw) {
    const c = decodeCursor(cursorRaw);
    if (!c) return err("Invalid cursor. Restart the listing without a cursor.");
    if (c.v !== dataVersion) {
      return err(
        `Stale cursor: it was issued for data version ${c.v} but the server now serves ${dataVersion}. Restart the listing without a cursor.`,
      );
    }
    if (c.h !== context) {
      return err(
        "Cursor mismatch: this cursor was issued for a different query, filter set, or tool. Restart the listing without a cursor.",
      );
    }
    offset = c.o;
  }
  const page = items.slice(offset, offset + limit);
  return {
    page,
    ...(offset + limit < items.length
      ? {
          nextCursor: encodeCursor({
            v: dataVersion,
            o: offset + limit,
            h: context,
          }),
        }
      : {}),
  };
}
