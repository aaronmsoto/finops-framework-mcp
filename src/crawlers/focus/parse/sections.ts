/** H2-section splitting for FOCUS column/attribute files: H1 + prose intro,
 * then a flat run of `## Heading` sections (spec: "Column file format"). */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Body text of the first `## <title>` section (case-insensitive), or null
 * if that heading is absent. Stops at the next top-level `## ` heading. */
export function sectionBody(lines: string[], title: string): string | null {
  const heading = new RegExp(`^##\\s+${escapeRegExp(title)}\\s*$`, "i");
  const idx = lines.findIndex((l) => heading.test(l.trim()));
  if (idx < 0) return null;
  let end = idx + 1;
  while (end < lines.length && !/^##\s+\S/.test(lines[end] as string)) end++;
  return lines
    .slice(idx + 1, end)
    .join("\n")
    .trim();
}

/** The H1 + prose introduction, before the first `## ` heading. */
export function introSection(lines: string[]): string {
  const idx = lines.findIndex((l) => /^##\s+\S/.test(l));
  const body = idx < 0 ? lines.join("\n") : lines.slice(0, idx).join("\n");
  return body.replace(/^#[^\n]*\n?/, "").trim();
}

export function h1Title(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? (m[1] as string).trim() : null;
}
