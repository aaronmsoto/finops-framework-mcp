// `agentic serve` — spawns the built CLI as a child process on an ephemeral
// port (--port 0) and exercises the HTTP surface with global fetch, plus raw
// http.request for traversal paths that WHATWG URL clients normalize away
// before they ever reach the server.
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLI_PATH, hermeticEnv, makeTempDir, rmDir, writeConfig, writeFileIn } from "./helpers.js";

let dir: string;
let child: ChildProcess;
let stderrLog = "";
let base = ""; // http://127.0.0.1:<port>/
let port = 0;

beforeAll(async () => {
  dir = makeTempDir();
  writeConfig(dir);
  // secret.txt lives OUTSIDE the served root (site/): reachable only via traversal.
  writeFileIn(dir, "secret.txt", "TOP SECRET\n");
  writeFileIn(dir, "site/hello.txt", "hello world\n");
  writeFileIn(dir, "site/page.html", "<!doctype html><html lang=\"en\"><head><title>p</title></head><body>page</body></html>\n");
  writeFileIn(dir, "site/sub/index.html", "<!doctype html><p>sub index</p>\n");
  fs.symlinkSync(path.join(dir, "secret.txt"), path.join(dir, "site", "leak.txt"));
  // Fake git internals inside the served root: must never be served or listed.
  writeFileIn(dir, "site/.git/config", "[core]\n\trepositoryformatversion = 0\n");
  writeFileIn(dir, "site/sub/.git", "gitdir: ../../.git/worktrees/sub\n");

  child = spawn(process.execPath, [CLI_PATH, "serve", "--port", "0", "--dir", "site"], {
    cwd: dir,
    env: hermeticEnv(),
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr!.on("data", (c: Buffer) => {
    stderrLog += c.toString("utf8");
  });
  base = await waitFor(() => /serving .* at (http:\/\/127\.0\.0\.1:(\d+)\/)/.exec(stderrLog)?.[1], "server URL on stderr");
  port = Number(new URL(base).port);
}, 15_000);

afterAll(async () => {
  if (child && child.exitCode === null && !child.killed) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
  rmDir(dir);
});

async function waitFor<T>(probe: () => T | undefined, what: string, timeoutMs = 10_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = probe();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}; stderr so far:\n${stderrLog}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/** Send the path verbatim — no client-side ".." normalization. */
function rawRequest(rawPath: string, method = "GET"): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: rawPath, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("agentic serve", () => {
  it("prints the served dir and bound URL to stderr", () => {
    expect(stderrLog).toMatch(/serving .*site at http:\/\/127\.0\.0\.1:\d+\//);
    expect(base.startsWith("http://127.0.0.1:")).toBe(true); // never 0.0.0.0
  });

  it("serves an existing file with the right content-type and no-store", async () => {
    const res = await fetch(base + "hello.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("hello world\n");

    const html = await fetch(base + "page.html");
    expect(html.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await html.text()).toContain("page");
    expect(stderrLog).toContain("GET /hello.txt"); // request lines are logged
  });

  it("rejects traversal out of the root with 404 (plain, raw, and percent-encoded)", async () => {
    // fetch normalizes /../ client-side; it must still 404 (no /secret.txt in the root).
    expect((await fetch(base + "../secret.txt")).status).toBe(404);
    expect((await fetch(base + "%2e%2e/secret.txt")).status).toBe(404);
    // Raw paths hit the server unnormalized and exercise the prefix check.
    for (const p of ["/../secret.txt", "/%2e%2e/secret.txt", "/%2e%2e%2fsecret.txt", "/sub/../../secret.txt"]) {
      const res = await rawRequest(p);
      expect(res.status, `raw path ${p}`).toBe(404);
      expect(res.body).not.toContain("TOP SECRET");
    }
  });

  it("does not follow symlinks that escape the root", async () => {
    const res = await fetch(base + "leak.txt");
    expect(res.status).toBe(404);
  });

  it("answers 405 to non-GET/HEAD and supports HEAD", async () => {
    const post = await fetch(base + "hello.txt", { method: "POST", body: "x" });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
    const head = await fetch(base + "hello.txt", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  it("serves index.html for directories that have one (with redirect to trailing slash)", async () => {
    const direct = await fetch(base + "sub/");
    expect(direct.status).toBe(200);
    expect(await direct.text()).toContain("sub index");
    const redirected = await fetch(base + "sub"); // fetch follows the 301
    expect(redirected.status).toBe(200);
    expect(await redirected.text()).toContain("sub index");
  });

  it("generates a listing for directories without index.html", async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const body = await res.text();
    expect(body).toContain("Index of /");
    expect(body).toContain('href="hello.txt"');
    expect(body).toContain('href="sub/"');
  });

  it("404s any request whose decoded path contains a .git segment", async () => {
    for (const p of ["/.git/config", "/.git/", "/%2Egit/config", "/sub/.git", "/sub/%2e%67it"]) {
      const res = await rawRequest(p);
      expect(res.status, `path ${p}`).toBe(404);
      expect(res.body).not.toContain("repositoryformatversion");
      expect(res.body).not.toContain("gitdir:");
    }
  });

  it("never lists .git in generated directory listings", async () => {
    const root = await (await fetch(base)).text();
    expect(root).not.toContain(".git");
    expect(root).toContain('href="hello.txt"'); // the listing itself still works
    const sub = await (await fetch(base + "sub/../")).text(); // same dir, normalized
    expect(sub).not.toContain(".git");
  });

  it("exits 0 on SIGINT", async () => {
    child.kill("SIGINT");
    const code = await new Promise<number | null>((resolve) => child.once("exit", (c) => resolve(c)));
    expect(code).toBe(0);
  });
});
