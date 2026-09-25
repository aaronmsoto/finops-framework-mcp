---
collection: bigt-classes
count: 6
expansion: requests × model calls per request × agent depth
notation: T(n · k · a)
---

# Big-T complexity ladder

## T(1) {slug=t-1}

- order: 1
- name: Constant
- headline: The model is not called per request.
- description: The model is not called per request. A cache hit, a static lookup, an embedding search. Reuse of a precomputed answer. The O(1) of AI.
- fix: Cache and precompute aggressively.
- provenance.document: big-t-notation
- provenance.section: ladder
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## T(log n) {slug=t-log-n}

- order: 2
- name: Sublinear
- headline: Deterministic code shrinks the input before the model sees it.
- description: Deterministic code shrinks the input before the model sees it. The class most organizations miss entirely. RAG done right; code is the new cache layer. Published results: SQL views shrinking clinical data from ~240,000 tokens to 19,000 before the model is called, and retrieval pipelines eliminating better than 99.9 percent of a million-token corpus.
- fix: Filter and retrieve before inference, not after.
- provenance.document: big-t-notation
- provenance.section: ladder
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## T(n) {slug=t-n}

- order: 3
- name: Linear
- headline: One model call per request, cost proportional to input size.
- description: One model call per request, cost proportional to input size. Summarize, answer, translate. The healthy default, and what most budgets implicitly assume. Watch for fixed per-call overhead from large tool catalogs.
- fix: Trim per-call overhead; keep this the default.
- provenance.document: big-t-notation
- provenance.section: ladder
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## T(n·k) {slug=t-n-k}

- order: 4
- name: Multiplicative
- headline: k model calls per request, and k is usually invisible.
- description: k model calls per request, and k is usually invisible. Extended thinking can burn over a hundred thousand tokens per request while producing a few hundred visible ones. Non-composable tools that replay full context each turn can make a five-step chain cost 10 to 20x the composed version.
- fix: Compose tool pipelines; instrument for hidden k.
- provenance.document: big-t-notation
- provenance.section: ladder
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## T(n·k·a) {slug=t-n-k-a}

- order: 5
- name: Agent-multiplicative
- headline: An orchestrator spawns sub-agents that spawn tool calls.
- description: An orchestrator spawns sub-agents that spawn tool calls. The O(n²) of AI: architecturally powerful, economically dangerous if unmonitored. The danger is not delegation; it is unbounded depth and unscoped context running unwatched.
- fix: Bound agent depth; add circuit breakers and budgets.
- provenance.document: big-t-notation
- provenance.section: ladder
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## T(∞) {slug=t-infinity}

- order: 6
- name: Unbounded
- headline: Loops with no termination condition.
- description: Loops with no termination condition. Retry-on-failure with no cap, recursive self-rewriting. The infinite loops of the token economy, and they exist today in production systems that lack circuit breakers.
- fix: Hard termination conditions and circuit breakers. Always.
- provenance.document: big-t-notation
- provenance.section: ladder
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0
