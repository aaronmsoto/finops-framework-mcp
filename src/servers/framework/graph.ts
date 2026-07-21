import type {
  Artifact,
  CapabilityRelationship,
  OfficialMaturityLevel,
} from "../../shared/index.js";

const LEVEL_ORDER: Record<OfficialMaturityLevel, number> = {
  crawl: 1,
  walk: 2,
  run: 3,
};

export function maxLevel(
  a: OfficialMaturityLevel,
  b: OfficialMaturityLevel,
): OfficialMaturityLevel {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b;
}

export interface PrerequisiteNode {
  capability: string;
  /** Minimum maturity implied along the path; "crawl" when unconstrained.
   *  Constraints are unofficial inferences — see edge sources. */
  min_maturity: OfficialMaturityLevel;
  depth: number;
  via: CapabilityRelationship[];
}

export interface ClosureResult {
  nodes: PrerequisiteNode[];
  official_edges: number;
  inferred_edges: number;
}

/**
 * Transitive closure over prerequisite edges ending at `target`.
 * Propagation rule (critique M7): a node's min_maturity is the max of the
 * edge constraints along the path; an edge without a constraint contributes
 * "crawl" (i.e. merely "present").
 */
export function prerequisiteClosure(
  artifact: Artifact,
  target: string,
  includeInferred: boolean,
): ClosureResult {
  const edges = [
    ...artifact.relationships_official,
    ...(includeInferred ? artifact.relationships_inferred : []),
  ].filter((r) => r.type === "prerequisite");

  const incoming = new Map<string, CapabilityRelationship[]>();
  for (const e of edges) {
    incoming.set(e.to, [...(incoming.get(e.to) ?? []), e]);
  }

  const best = new Map<string, PrerequisiteNode>();
  const queue: { cap: string; level: OfficialMaturityLevel; depth: number }[] =
    [{ cap: target, level: "crawl", depth: 0 }];
  while (queue.length > 0) {
    const cur = queue.shift() as (typeof queue)[number];
    for (const e of incoming.get(cur.cap) ?? []) {
      const constraint = e.to_min_maturity ?? "crawl";
      const level = maxLevel(cur.level, constraint);
      const existing = best.get(e.from);
      if (
        !existing ||
        LEVEL_ORDER[level] > LEVEL_ORDER[existing.min_maturity] ||
        cur.depth + 1 < existing.depth
      ) {
        best.set(e.from, {
          capability: e.from,
          min_maturity: existing
            ? maxLevel(existing.min_maturity, level)
            : level,
          depth: Math.min(existing?.depth ?? Infinity, cur.depth + 1),
          via: [...(existing?.via ?? []), e].slice(0, 8),
        });
        queue.push({ cap: e.from, level, depth: cur.depth + 1 });
      }
    }
  }

  const nodes = [...best.values()].sort((a, b) => a.depth - b.depth);
  const flatEdges = nodes.flatMap((n) => n.via);
  return {
    nodes,
    official_edges: flatEdges.filter((e) => e.source === "official").length,
    inferred_edges: flatEdges.filter((e) => e.source === "inferred").length,
  };
}

/** All non-prerequisite edges touching a capability. */
export function relatedEdges(
  artifact: Artifact,
  capability: string,
  types: ("informs" | "related")[],
): { official: CapabilityRelationship[]; inferred: CapabilityRelationship[] } {
  const match = (r: CapabilityRelationship) =>
    (r.from === capability || r.to === capability) &&
    types.includes(r.type as "informs" | "related");
  return {
    official: artifact.relationships_official.filter(match),
    inferred: artifact.relationships_inferred.filter(match),
  };
}
