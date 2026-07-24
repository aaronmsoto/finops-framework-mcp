# 2026-07-23 — T-008: experimental flag + official-only maturity surface

Spec: `.agents/specs/v1-official-only.md` §4.

## What I did

- `createServer(artifact, opts?: { experimental?: boolean })` — threaded an
  `experimental` flag into `registerTools`/`registerResources`/
  `registerPrompts` (each now takes an `opts: ServerOptions = {}` third
  param). `main.ts` computes
  `FINOPS_MCP_EXPERIMENTAL === "1" || argv.includes("--experimental")` and
  passes it through.
- Default surface changes (`tools.ts`):
  - `get_actions` registration wrapped in `if (experimental)`, title/
    description prefixed `EXPERIMENTAL`.
  - New `get_maturity_assessment(capability, level?)`: verbatim
    `capability.maturity_raw[level]` per level (all three if omitted),
    attribution footer, `resource_link` to the capability doc, nearest-match
    error via the existing `findCapability` helper.
  - `assess_maturity_path` reshaped: `gap: [{maturity, assessment_md}]`
    (was `characteristics: string[]` sourced from `artifact.actions`),
    `current_level`/`target_level` both `z.enum(OFFICIAL)` — dropped
    `pre-crawl` entirely, **in both modes**. This tool never actually needed
    Actions/pre-crawl once per-level `maturity_raw` was available, so it's
    identical regardless of the flag — confirmed with a dedicated
    flag-matrix test rather than assumed.
  - `get_maturity_model`: `unofficial_extension` is now optional in the
    output schema and only populated/rendered when experimental;
    `official_levels` (3 entries) always present.
- `render.ts`:
  - `overviewMd`/`collectionMd` take an `experimental` param; drop the
    pre-crawl/Actions paragraph and the "Unofficial extension: Pre-Crawl"
    section of the maturity-model collection unless experimental.
  - `maturityLevelMd` — **found while implementing, not called out in the
    spec bullets**: for official levels (crawl/walk/run) it unconditionally
    appended a "Parsed assessment characteristics" section sourced from
    `artifact.actions` (unofficial, official:false content) into the
    `capability-maturity` resource template output. That resource wasn't
    otherwise gated at all, so Actions content was leaking into the default
    server through resources even though the `get_actions` tool was hidden.
    Fixed: this section is now only appended when `experimental` is true;
    default output is just the verbatim `maturity_raw` text + footer.
- `resources.ts`: `capability-maturity` resource template's `levels` list
  (used for both completions and the "unknown level" 404 guard) is
  `OFFICIAL_MATURITY_LEVELS` by default, `ALL_MATURITY_LEVELS` when
  experimental — this alone already blocked direct `/maturity/pre-crawl`
  reads by default (404 via the existing `notFound()` path), on top of the
  `maturityLevelMd` fix above. Resource title/description strings for
  `maturity-model` and `capability-maturity` are also flag-conditional.
- `prompts.ts`: `registerPrompts` takes `opts`; `currentLevelArg` (used only
  by `plan-maturity-roadmap`, which drives `assess_maturity_path`) dropped
  `pre-crawl` unconditionally to match the tool it feeds; `explain-framework`
  and `assess-capability-maturity` instruction text mention pre-crawl/
  `get_actions` only when experimental.
- Real bug caught by manually running the built server, not by any test:
  `main.ts` originally did
  `process.argv[2] ?? defaultDir` for the artifact dir *before* checking for
  `--experimental`, so `node main.js --experimental` treated the flag itself
  as the artifact directory path and failed to load data at all. Fixed by
  filtering `--`-prefixed args out before picking the positional artifact-dir
  arg.

## Verification

- `./scripts/agentic gates --tier all`: **PASS** — format, lint, typecheck,
  test (182/182, up from 169), designs, integrity (same
  impl+tests-in-one-diff warning as T-005/T-006/T-007, expected for this
  loop), memory, build.
- `server.test.ts` now spins up two in-memory clients (`client` default,
  `expClient` experimental) via a shared `connect(experimental)` helper; a
  new `describe("flag matrix")` block asserts: default `tools/list` lacks
  `get_actions`/has `get_maturity_assessment`/no tool schema mentions
  "pre-crawl" (case-insensitive substring check over the whole
  `JSON.stringify(tools)`); experimental `tools/list` restores `get_actions`
  with an EXPERIMENTAL-labeled title+description; `get_maturity_model`'s
  `unofficial_extension` presence flips with the flag while `official_levels`
  stays at 3 in both; `assess_maturity_path` behavior (incl. rejecting
  `current_level: "pre-crawl"` as an invalid enum) is identical in both
  modes. Existing `get_actions`/pre-crawl-resource tests moved into
  experimental-mode describes rather than deleted.
- Manually built (`npm run build`) and ran `dist/servers/framework/main.js`
  with no flag, with `--experimental`, and with `FINOPS_MCP_EXPERIMENTAL=1`
  — observed the startup log line (`... [experimental]` suffix appears only
  in the flagged cases) and confirmed the artifact still loads correctly
  with `--experimental` present (this is what caught the argv bug above).
  Also probed `createServer` directly for both modes via a throwaway
  in-memory-client script: default `tools/list` has 11 tools (no
  `get_actions`), experimental has 12; `get_maturity_model.unofficial_extension`
  is `undefined` by default and a populated object when experimental;
  `get_maturity_assessment` returns real capability text.

## Next

T-009 (spec §5): regenerate artifact for v1 doc consistency, rewrite
`docs/architecture.md` §3-§6 and `README.md` for the new tool list + flag,
update `evals/framework/eval.xml` Q1/Q2/Q10, npm publish prep
(`package.json`, `server.json`, `npm pack --dry-run`).
