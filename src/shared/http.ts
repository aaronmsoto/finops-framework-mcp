import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_HTML_LENGTH = 2000;
const THROTTLE_MS = 1000;

interface CacheEntry {
  url: string;
  status: number;
  fetched_at: string;
  body: string;
}

export interface RobotsRules {
  disallow: string[];
  crawlDelayMs: number;
}

export function parseRobots(text: string): RobotsRules {
  // Minimal parser: rules in the "User-agent: *" group.
  const rules: RobotsRules = { disallow: [], crawlDelayMs: 0 };
  let applies = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(":");
    const key = (keyRaw ?? "").trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = value === "*";
    } else if (applies && key === "disallow" && value) {
      rules.disallow.push(value);
    } else if (applies && key === "crawl-delay") {
      rules.crawlDelayMs = Math.max(0, Number(value) * 1000 || 0);
    }
  }
  return rules;
}

function bodyLooksValid(url: string, body: string): boolean {
  if (url.includes("/wp-json/") || url.endsWith(".xml")) {
    return body.length > 2;
  }
  return body.length >= MIN_HTML_LENGTH && /<h1[\s>]/i.test(body);
}

export interface FetchReport {
  fromCache: string[];
  fetched: string[];
  skippedByRobots: string[];
}

export interface CachedFetcherOptions {
  /** Site origin, e.g. "https://www.finops.org" — used for the robots.txt
   * URL and to scope which fetched URLs robots.txt disallow rules apply to. */
  origin: string;
  userAgent: string;
  /** Overrides the default HTML-page validity check (min length + <h1>) —
   * e.g. for crawlers fetching raw markdown/JSON instead of rendered pages. */
  isValidBody?: (url: string, body: string) => boolean;
}

/**
 * Polite cached fetcher: honors robots.txt on every run, throttles to 1 rps
 * (or the site's crawl-delay if larger), caches only validated 200 responses,
 * 7-day TTL.
 */
export class CachedFetcher {
  private robots: RobotsRules | null = null;
  private lastRequestAt = 0;
  private readonly origin: string;
  private readonly userAgent: string;
  private readonly isValidBody: (url: string, body: string) => boolean;
  readonly report: FetchReport = {
    fromCache: [],
    fetched: [],
    skippedByRobots: [],
  };

  constructor(
    private readonly cacheDir: string,
    private readonly useCache: boolean,
    opts: CachedFetcherOptions,
  ) {
    mkdirSync(cacheDir, { recursive: true });
    this.origin = opts.origin;
    this.userAgent = opts.userAgent;
    this.isValidBody = opts.isValidBody ?? bodyLooksValid;
  }

  private cachePath(url: string): string {
    const key = createHash("sha1").update(url).digest("hex");
    return join(this.cacheDir, `${key}.json`);
  }

  private readCache(url: string): CacheEntry | null {
    if (!this.useCache) return null;
    const p = this.cachePath(url);
    if (!existsSync(p)) return null;
    try {
      const entry = JSON.parse(readFileSync(p, "utf8")) as CacheEntry;
      if (Date.now() - Date.parse(entry.fetched_at) > CACHE_TTL_MS) return null;
      if (entry.status !== 200) return null;
      return entry;
    } catch {
      return null;
    }
  }

  private async throttle(): Promise<void> {
    const delay = Math.max(THROTTLE_MS, this.robots?.crawlDelayMs ?? 0);
    const wait = this.lastRequestAt + delay - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestAt = Date.now();
  }

  private async ensureRobots(): Promise<RobotsRules> {
    if (this.robots) return this.robots;
    const res = await fetch(`${this.origin}/robots.txt`, {
      headers: { "User-Agent": this.userAgent },
    });
    this.robots = parseRobots(res.ok ? await res.text() : "");
    return this.robots;
  }

  private isDisallowed(url: string): boolean {
    if (!url.startsWith(this.origin)) return false;
    const path = new URL(url).pathname;
    return (this.robots?.disallow ?? []).some((rule) => path.startsWith(rule));
  }

  async text(url: string): Promise<string> {
    await this.ensureRobots();
    if (this.isDisallowed(url)) {
      this.report.skippedByRobots.push(url);
      throw new Error(`robots.txt disallows ${url}`);
    }
    const cached = this.readCache(url);
    if (cached) {
      this.report.fromCache.push(url);
      return cached.body;
    }
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.throttle();
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
        });
        const body = await res.text();
        if (res.status === 200 && this.isValidBody(url, body)) {
          const entry: CacheEntry = {
            url,
            status: 200,
            fetched_at: new Date().toISOString(),
            body,
          };
          writeFileSync(this.cachePath(url), JSON.stringify(entry));
          this.report.fetched.push(url);
          return body;
        }
        lastError = new Error(
          `unexpected response for ${url}: status ${res.status}, ${body.length} bytes`,
        );
      } catch (err) {
        lastError = err;
      }
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
    throw new Error(
      `fetch failed after retries: ${url} (${String(lastError)})`,
    );
  }

  async json<T>(url: string): Promise<T> {
    return JSON.parse(await this.text(url)) as T;
  }
}
