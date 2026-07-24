export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&amp;|&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug from a finops.org URL path, e.g. .../capabilities/allocation/ → allocation. */
export function slugFromUrl(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0] as number;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j] as number;
      row[j] = Math.min(
        (row[j] as number) + 1,
        (row[j - 1] as number) + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return row[n] as number;
}

/** Closest candidates to an unknown slug, for actionable error messages. */
export function nearestMatches(
  input: string,
  candidates: readonly string[],
  max = 3,
): string[] {
  const needle = slugify(input);
  return candidates
    .map((c) => ({ c, d: levenshtein(needle, c) }))
    .sort((x, y) => x.d - y.d || x.c.localeCompare(y.c))
    .slice(0, max)
    .filter(({ c, d }) => d <= Math.max(3, Math.floor(c.length / 2)))
    .map(({ c }) => c);
}
