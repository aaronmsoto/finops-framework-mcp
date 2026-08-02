# T-046 — Fix 'official' phrasing in focus-spec-mcp README (gate4 C2-fidelity-3)

## What

`packages/focus-spec-mcp/README.md:14` described the sibling
`finops-framework-mcp` package as "the official FinOps Framework server" —
grammatically, "official" modified the *server* (this project's software),
not the upstream Framework. That directly contradicted the same package's
own `NOTICE.md` ("independent, unofficial integration ... not affiliated
with or endorsed by the FinOps Foundation") and the repo's no-endorsement
posture: a reader could cite the sibling package as "the official FinOps
Framework MCP server" in a vendor evaluation.

Fixed per the spec's suggested rephrasing — "official" now attaches to the
Framework, never to the software:

> ...decoupled from the companion `finops-framework-mcp` package (the
> companion unofficial server for the FinOps Framework published at
> finops.org/framework).

## Grep sweep for other bindings

Per the fix's second requirement, grepped both package READMEs, both
package.json descriptions, and both server.json files for `official`:

- Root `README.md`: "the official FinOps Framework", "the official
  Crawl/Walk/Run [rubric]" — both modify the upstream Framework/rubric, not
  this software. Fine as-is.
- `packages/focus-spec-mcp/README.md` (post-fix): "derived, unofficial
  extensions", "no official FOCUS-to-FinOps-KPI mapping exists upstream",
  "official sample dataset" — all modify FOCUS/the mapping/the dataset, not
  the software.
- Root `package.json` / `server.json` description: "exposing the official
  FinOps Framework" — modifies the Framework.
- `packages/focus-spec-mcp/package.json` / `server.json`: no "official"
  occurrences at all.

No other binding of "official" to the software itself found.

## Result

- Gates: PASS (format, lint, typecheck, test, designs, integrity, memory;
  coverage skipped — no bound command). `./scripts/agentic gates` full
  output confirms.
- Docs-only change; no artifact regen needed, per acceptance criteria.

## Next

Gate-4 fix batch continues with T-047 (final item in the critique-4 series
per `.agents/tasks.json`).
