// Zero-dependency localhost preview server for design docs and specs.
// Privacy contract: binds STRICTLY to 127.0.0.1 (never 0.0.0.0) and never
// serves a path that escapes the served root — traversal is rejected after
// URL-decoding, and symlinks are realpath-checked against the root.
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { CliError, logErr } from "./util.js";

export const DEFAULT_PORT = 4177;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

export function contentTypeFor(file: string): string {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Decode the request URL and resolve it against the served root. Returns null
 * for anything that escapes the root (".." traversal — including
 * percent-encoded forms, which decodeURIComponent unfolds before the resolve),
 * for undecodable URLs, and for NUL bytes. Symlink escapes are caught later
 * with a realpath prefix check; this function is pure path arithmetic.
 */
export function resolveRequestPath(rootDir: string, rawUrl: string): { target: string; pathname: string } | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, "http://127.0.0.1/").pathname);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;
  // Git internals are never served: any decoded ".git" path segment is a 404.
  if (pathname.split("/").includes(".git")) return null;
  const target = path.resolve(rootDir, "." + path.posix.normalize("/" + pathname));
  if (target !== rootDir && !target.startsWith(rootDir + path.sep)) return null;
  return { target, pathname };
}

export interface ServeHandle {
  server: http.Server;
  port: number;
  url: string;
}

/** Start the server on 127.0.0.1. port 0 picks an ephemeral port. */
export function startServer(dir: string, port: number): Promise<ServeHandle> {
  let rootReal: string;
  try {
    rootReal = fs.realpathSync(dir);
  } catch {
    throw new CliError(`serve: directory not found: ${dir}`);
  }
  if (!fs.statSync(rootReal).isDirectory()) throw new CliError(`serve: not a directory: ${dir}`);
  const server = http.createServer((req, res) => handleRequest(rootReal, req, res));
  return new Promise((resolve, reject) => {
    server.once("error", (err) => reject(new CliError(`serve: ${err.message}`)));
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({ server, port: addr.port, url: `http://127.0.0.1:${addr.port}/` });
    });
  });
}

function handleRequest(rootReal: string, req: http.IncomingMessage, res: http.ServerResponse): void {
  const method = req.method ?? "GET";
  const rawUrl = req.url ?? "/";
  const send = (status: number, headers: Record<string, string>, body?: Buffer | string): void => {
    const payload = body === undefined ? undefined : typeof body === "string" ? Buffer.from(body, "utf8") : body;
    res.writeHead(status, {
      "Cache-Control": "no-store",
      ...(payload !== undefined ? { "Content-Length": String(payload.length) } : {}),
      ...headers,
    });
    res.end(method === "HEAD" ? undefined : payload);
    logErr(`[serve] ${method} ${rawUrl} -> ${status}`);
  };
  const notFound = (): void => send(404, { "Content-Type": "text/plain; charset=utf-8" }, "404 not found\n");

  if (method !== "GET" && method !== "HEAD") {
    send(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" }, "405 method not allowed\n");
    return;
  }

  const resolved = resolveRequestPath(rootReal, rawUrl);
  if (resolved === null) {
    notFound();
    return;
  }

  // Realpath prefix check: a symlink inside the root pointing outside it must
  // not be followed.
  let real: string;
  let stat: fs.Stats;
  try {
    real = fs.realpathSync(resolved.target);
    stat = fs.statSync(real);
  } catch {
    notFound();
    return;
  }
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
    notFound();
    return;
  }

  if (stat.isDirectory()) {
    if (!resolved.pathname.endsWith("/")) {
      // Relative links inside index pages only resolve with a trailing slash.
      send(301, { Location: encodeURI(resolved.pathname + "/") });
      return;
    }
    const index = path.join(real, "index.html");
    let indexReal: string | null = null;
    try {
      indexReal = fs.realpathSync(index);
      if (indexReal !== rootReal && !indexReal.startsWith(rootReal + path.sep)) indexReal = null;
      else if (!fs.statSync(indexReal).isFile()) indexReal = null;
    } catch {
      indexReal = null;
    }
    if (indexReal !== null) {
      send(200, { "Content-Type": contentTypeFor(indexReal) }, fs.readFileSync(indexReal));
    } else {
      send(200, { "Content-Type": "text/html; charset=utf-8" }, directoryListing(real, resolved.pathname));
    }
    return;
  }

  if (!stat.isFile()) {
    notFound();
    return;
  }
  send(200, { "Content-Type": contentTypeFor(real) }, fs.readFileSync(real));
}

function directoryListing(dir: string, pathname: string): string {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.name !== ".git") // git internals never appear in listings
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => {
      const suffix = e.isDirectory() ? "/" : "";
      return `    <li><a href="${encodeURIComponent(e.name)}${suffix}">${escapeHtml(e.name)}${suffix}</a></li>`;
    });
  const title = escapeHtml(pathname);
  const parent = pathname === "/" ? [] : ['    <li><a href="../">../</a></li>'];
  return [
    "<!doctype html>",
    '<html lang="en">',
    `<head><meta charset="utf-8"><title>Index of ${title}</title></head>`,
    "<body>",
    `  <h1>Index of ${title}</h1>`,
    "  <ul>",
    ...parent,
    ...entries,
    "  </ul>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
