---
collection: bigt-variables
count: 3
---

# Big-T notation variables

## Requests, or input size {slug=n}

- symbol: n
- description: Covers two things that often move together: how many requests hit the workload, and how large each request's input is. Either or both can be the scaling dimension.
- provenance.document: big-t-notation
- provenance.section: notation
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## Model calls per request {slug=k}

- symbol: k
- description: Reasoning steps, multi-turn chains, tool calls that replay context. The trap: k is usually invisible. It rarely appears in the request itself.
- provenance.document: big-t-notation
- provenance.section: notation
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0

## Agent depth {slug=a}

- symbol: a
- description: Sub-agents calling sub-agents. An orchestrator spawning workers multiplies everything above it in the tree.
- provenance.document: big-t-notation
- provenance.section: notation
- provenance.source_url: https://www.tokeneconomics.com/projects/big-t-notation/
- provenance.license: CC-BY-4.0
