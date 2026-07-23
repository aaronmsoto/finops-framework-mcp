// Injection heuristics for crawled third-party content (critique M2).
// Crawled prose is served to LLM agents as trusted framework guidance, so a
// refresh must FAIL loudly if instruction-like insertions appear.

const INJECTION_PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: "ignore-previous",
    re: /ignore (all )?(previous|prior|above) (instructions|context)/i,
  },
  { name: "system-prompt", re: /\b(system prompt|developer message)\b/i },
  {
    name: "direct-imperative",
    re: /\byou (must|should) (now |immediately )?(run|execute|call|fetch|visit|send)\b/i,
  },
  { name: "tool-coercion", re: /\b(call|invoke) the [a-z_]+ tool\b/i },
  {
    name: "exfiltration",
    re: /\b(send|post|upload) (this|your|the) (data|conversation|context|credentials)\b/i,
  },
  { name: "base64-blob", re: /[A-Za-z0-9+/]{120,}={0,2}/ },
  { name: "html-comment", re: /<!--/ },
  { name: "script-tag", re: /<script\b/i },
  { name: "data-uri", re: /data:[a-z]+\/[a-z0-9.+-]+;base64/i },
];

export interface InjectionHit {
  pattern: string;
  excerpt: string;
  where: string;
}

export function scanForInjection(where: string, text: string): InjectionHit[] {
  const hits: InjectionHit[] = [];
  for (const { name, re } of INJECTION_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      const start = Math.max(0, m.index - 60);
      hits.push({
        pattern: name,
        excerpt: text.slice(start, m.index + m[0].length + 60),
        where,
      });
    }
  }
  return hits;
}
