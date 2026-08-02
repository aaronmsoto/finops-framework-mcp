# 2026-08-02 — T-054: docs/mcp-surface.md hierarchy doc

## Task

`docs/final-status-review.md` follow-up: no single document showed the full
prompts/resources/tools hierarchy of either server. Build a generator that
produces `docs/mcp-surface.md` from LIVE MCP protocol output (not
hand-typed), extend the eval bridge with the three missing `list-*`
commands, and link both READMEs to the result.

## What I did

- **`evals/framework/mcp-call.mjs`**: added `list-resources`,
  `list-resource-templates`, `list-prompts` commands, same
  `--server=<name>`/`MCP_EVAL_SERVER` bridge pattern as the existing
  `list-tools`/`call`. Each pages through `cursor` via a small
  `listAllPages()` helper (defensive — both servers return everything in one
  page today) and prints the full SDK-returned fields (uri/uriTemplate,
  name, title, description, mimeType, prompt arguments). Left `list-tools`
  byte-identical — T-028 established that output as a stable contract other
  evidence has diffed against.
- **`scripts/gen-mcp-surface.mjs`** (new): connects directly to both built
  stdio servers (own `StdioClientTransport`, `ensureBuilt()` guard mirroring
  `bundle-worker-data.mjs`/`pack-focus.mjs`) and to the framework server a
  second time with `FINOPS_MCP_EXPERIMENTAL=1`. For each connection it pages
  `tools/list`, `resources/list`, `resources/templates/list`,
  `prompts/list`, then runs `completion/complete` probes (empty-string
  argument) against every `{var}` in every resource template's URI to
  detect and sample completion support live — nothing about which
  args are completable is hardcoded. "Fixed" resources are separated from
  template-expanded ones by turning each live `uriTemplate` into a regex
  and filtering `resources/list`'s output against it (the protocol doesn't
  otherwise distinguish them). Tool params (type, required, default,
  min/max/enum) are read straight from each tool's live `inputSchema` JSON
  Schema. Entries whose title/description contains "unofficial" or
  "experimental" (case-insensitive) get an inline `[UNOFFICIAL/EXPERIMENTAL]`
  badge — also live-derived, not a maintained list. Framework tools present
  only under `FINOPS_MCP_EXPERIMENTAL=1` (currently just `get_actions`) are
  set-diffed out into their own subsection. Supports `--check` (diff against
  the committed file, exit 1 on drift, no write) alongside the default
  regenerate-and-write mode. Added `npm run gen:mcp-surface` mirroring
  `bundle:worker`.
- **`docs/mcp-surface.md`** (generated): prompts → resources (fixed +
  templates with completion notes) → tools hierarchy for both servers, with
  per-server prompt/resource/tool counts and the legend.
- **`src/servers/mcp-surface.test.ts`** (new): a fast-tier drift guard, not
  a re-implementation of the generator. Connects to both servers via
  `InMemoryTransport` against the TS source directly (no dist build needed,
  matching `server.test.ts`'s existing pattern) and asserts every live
  tool/prompt/template name and every live fixed-resource URI appears
  (as a backtick-quoted string) in that server's section of the committed
  doc, and that the section's `N prompt(s)/fixed resource(s)/template(s)/
  tool(s)` counts match. Catches "surface changed, doc wasn't regenerated"
  without needing to re-run the full generator (which does need `dist/`) as
  part of the fast gate tier.
- Linked both READMEs (`README.md` "Sibling server" section,
  `packages/finops-focus-mcp/README.md` after "Tool surface").

## Why not a full-text reproducibility test

Considered a vitest test that shells out to the generator and diffs its
output byte-for-byte against the committed file, but the fast `test` gate
runs before the full-tier `build` gate (`.agentic/harness/src/tasks.ts`
completion path only re-runs the fast tier), so a test requiring `dist/`
would fail in any fresh checkout that hasn't built yet. `gen-mcp-surface.mjs
--check` is the byte-for-byte verifier (I ran it by hand below); the
committed `mcp-surface.test.ts` is the always-on structural guard.

## Verification

- `node scripts/gen-mcp-surface.mjs` then `node scripts/gen-mcp-surface.mjs
  --check` → `docs/mcp-surface.md is up to date.` (run again after the full
  `npm run build` inside `./scripts/agentic gates --tier all`, same result —
  confirms the doc is deterministic, no wall-clock content).
- `node evals/framework/mcp-call.mjs list-resource-templates` / `list-prompts`
  / `--server=focus list-resources` — spot-checked live output shape.
- `npx vitest run src/servers/mcp-surface.test.ts` — 3/3 passed.
- `./scripts/agentic gates --tier all` — PASS (format, lint, typecheck, 392
  tests, designs, integrity, memory, build).

## Next

T-055..T-059 remain queued (docs coherence, dual-launch hygiene,
architecture periphery, derive integration test, demo format-gate). Note
for whichever of those changes a prompt/resource/tool: re-run `npm run
gen:mcp-surface` and commit the diff, or `mcp-surface.test.ts` will fail.
