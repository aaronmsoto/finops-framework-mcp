# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

**T-056 done** (2026-08-02, this session): dual-launch hygiene (review
L3/L4) — see `.agents/journal/20260802-t056-dual-launch-hygiene.md` for full
detail. Added root `SECURITY.md` (GitHub Security Advisories as the report
channel, no personal email published) and `CONTRIBUTING.md` (points at
AGENTS.md), plus `.github/ISSUE_TEMPLATE/bug_report.md`
(`.github/workflows/` untouched). Both `package.json`s gained
`author`/`homepage`/`bugs` and `engines.node` bumped `>=20` → `>=22`
(confirmed CI already only tests node 22). Verified: `./scripts/agentic
gates` all green (392 tests); `npm pack --dry-run` succeeds from both repo
root and `packages/finops-focus-mcp/` (prepack staging still works).

**T-055 done** (2026-08-02, this session): docs coherence pass (review
DOC-1/3/4, L5) — see `.agents/journal/20260802-t055-docs-coherence.md` for
full detail. MEMORY.md rewritten for v1 reality via the `update-memory`
skill (two servers, Worker+demo, four critique gates + final review passed,
publish owner-gated; "inferred edges" invariant dropped; 50 lines).
`evals/focus/combined-scenario.xml` step 4 rewritten to match the T-045
mapping shape (live-probed: 1.2 columns for the three commitment KPIs grow
to include CommitmentDiscountQuantity/CommitmentDiscountUnit, caveat is a
single version-neutral string). `docs/architecture.md` and `AGENTS.md` got
short "Now built" pointers to the FOCUS server/Worker/demo/critique-3+4
(no rewrite of historical rationale; AGENTS.md still 66 lines).
`docs/deploy-worker.md` Notes/limits now documents the Worker's
no-auth/no-rate-limit posture as deliberate, pointing at Cloudflare Rate
Limiting rules. Verified: `./scripts/agentic gates` (392 tests) all green;
`memory lint` 0 warnings.

**T-054 done** (2026-08-02, earlier same session): built `docs/mcp-surface.md` — the
prompts→resources→tools hierarchy for both servers, generated (not
hand-typed) from live MCP protocol output.
- `evals/framework/mcp-call.mjs` gained `list-resources`,
  `list-resource-templates`, `list-prompts` (same bridge pattern as
  `list-tools`, which stays byte-identical per the T-028 contract).
- `scripts/gen-mcp-surface.mjs` (new, `npm run gen:mcp-surface`) connects
  live to both built servers (+ framework with `FINOPS_MCP_EXPERIMENTAL=1`
  to set-diff out `get_actions`), pages every list endpoint, probes
  `completion/complete` on every resource-template variable to detect
  completion support, separates fixed resources from template-expanded
  ones by regex-matching live `uriTemplate`s against `resources/list`
  output, and reads tool param type/required/default/limits straight from
  live `inputSchema`. `[UNOFFICIAL/EXPERIMENTAL]` badges come from a
  case-insensitive scan of title/description — nothing hardcoded. Supports
  `--check` (diff vs committed file, exit 1 on drift).
- `src/servers/mcp-surface.test.ts` (new) is the always-on drift guard:
  InMemoryTransport against TS source (no dist build, stays fast-tier),
  asserts every live tool/prompt/template name + fixed-resource URI + the
  per-server counts appear in the committed doc. Full byte-for-byte
  verification is `gen-mcp-surface.mjs --check` (needs `dist/`, run by
  hand — the fast `test` gate runs before the full-tier `build` gate, so a
  vitest test requiring dist would break on a fresh unbuilt checkout).
- Both READMEs link to the doc.
- Verified: `node scripts/gen-mcp-surface.mjs --check` clean after a full
  `npm run build`; `vitest run src/servers/mcp-surface.test.ts` 3/3;
  `./scripts/agentic gates --tier all` PASS (392 tests).
- **Reminder for whoever does T-055..T-059 next**: if a change touches any
  prompt/resource/tool, re-run `npm run gen:mcp-surface` and commit the
  diff, or `mcp-surface.test.ts` fails.

**T-053 done** (2026-08-02, earlier same session): added the `map-kpi-to-focus-columns`
prompt to `src/servers/focus/prompts.ts` (review MCP-4 — the flagship
`get_kpi_mapping`/`calculate_kpi` workflow had no guided prompt).
- Third prompt, mirroring `explain-focus`/`map-column-across-versions`:
  optional `kpi` (completable KPI slug), `capability` (completable, from
  `related_capability_slugs` across the mapping), and `version` (completable
  spec version, default `DEFAULT_VERSION`) args.
- With `kpi`: embeds the mapped FOCUS columns' resource docs (`columnMd`,
  same as `map-column-across-versions`) then an UNOFFICIAL-framed
  instruction to call `get_kpi_mapping` for the formula and `calculate_kpi`
  for a computed sample value. Unknown `kpi` returns guidance instead of
  erroring (mirrors the framework server's `assess-capability-maturity`
  unknown-capability handling). With `capability` or with neither arg: pure
  tool-call guidance (no resource to embed — there's no per-KPI renderer),
  pointing at `get_kpi_mapping(capability: ...)` or a bare listing call.
- **Fixed a latent bug found while wiring completion**: `completable(...).optional()`
  silently drops completions. The SDK's `completable()` mutates the schema
  object in place with a non-enumerable symbol property; zod v4's
  `.optional()` clones into a *new* `ZodOptional` wrapper, so the marker
  never survives being applied after `completable()` (confirmed by
  reproducing with a 4-line node script against the installed SDK). Fixed
  by moving `.optional()` *inside* `completable()`'s input schema (before
  the outermost call) for `versionArg`, and applying the same shape to the
  new `kpiArg`/`kpiCapabilityArg` helpers — this incidentally also fixes
  `explain-focus`'s previously-silent `version` completion.
- Verified: `vitest run src/servers/focus/server.test.ts` (59/59, incl. new
  prompt-list/get/completion tests) then `./scripts/agentic gates --tier all`
  all green (389 tests total). Live probe against built `dist/` via
  `InMemoryTransport`: `prompts/list` includes all three names;
  `getPrompt({kpi: "effective-savings-rate-percentage"})` returns 4 embedded
  column resources + UNOFFICIAL instruction text; `complete` returns real
  values for `kpi` ("effective" → 2 matches), `capability` ("rate" →
  `rate-optimization`), and `version` ("1" → `1.0`, `1.2`).
- Remaining backlog: T-054..T-059 queued (git log); rest of the 19-MINOR
  list in `docs/final-status-review.md` still open (MEMORY.md refresh,
  derive-pipeline integration test, worker index/data tests,
  `combined-scenario.xml` step-4 fix, SECURITY/CONTRIBUTING, npm metadata).

**T-051/T-052 done** (2026-08-02, earlier same day): tool-description fixes
(TN-1/2/3 — exact param names, `assess_maturity_path` descriptions, corpus
counts interpolated not hardcoded) and MCP-protocol polish (MCP-1/2/3 —
pagination text parity, Worker 405 on GET/DELETE, `listChanged` doc fix).
Full detail in `.agents/journal/20260802-t051-*.md` and `-t052-*.md`.

**v1 close-out is COMPLETE on `claude/session-k75rxy`; publish is
owner-gated.** State as of 2026-08-02:

- FOCUS build batch T-027..T-038 (12/12) + critique gate 4
  (`docs/critique-4-focus-gate.md`, SHIP-after-fixes, 2 BLOCKER / 8 MAJOR /
  5 MINOR, 0 refuted) + fix batch T-039..T-047 (9/9, loop run
  `.agents/journal/20260730-loop-build-134141.md`) all landed. Every fix
  hand-verified live this session (probe notes in `docs/eval-results.md`
  Focus Run 2).
- **T-048**: FOCUS package renamed `focus-spec-mcp` → **`finops-focus-mcp`**
  (owner decision in `decisions.md`; resolves gate-4 C4-community-3). Dir is
  `packages/finops-focus-mcp/`, bin prints
  `finops-focus-mcp v1.0.0 (FOCUS spec versions: 1.0, 1.2; latest 1.2)`,
  tarball 241KB, temp-install verified. Historical docs/journals keep the
  old name on purpose.
- **Evals**: focus Run 1 10/10 (pre-fix), Run 2 10/10 (post-fix, post-rename,
  regenerated artifact), combined two-server scenario PASS —
  `docs/eval-results.md`.
- **Final pre-launch review** (`docs/final-status-review.md`, five lenses +
  adversarial verification): **GO-after-listed-fixes**, grades A-/A-/A-/B+/B-,
  zero BLOCKERs. Its two MAJORs (root README omitted the shipped FOCUS
  server/Worker/demo; root NOTICE.md lacked CC BY scope for `data/focus/**`)
  were fixed as **T-049** — landed, gates green. Its 19 MINORs are the
  post-launch backlog (list in the review doc; includes MEMORY.md refresh,
  derive-pipeline integration test, worker index/data tests, demo in the
  format gate [protected-path — owner task], SECURITY/CONTRIBUTING files,
  npm author/homepage/bugs fields, text-pagination parity, Worker
  GET/DELETE 405).
- All commits re-authored (committer noreply@anthropic.com) and pushed.
  Task-evidence commit SHAs recorded before the 2026-08-02 rebase point at
  pre-rebase objects (provenance display only; nothing resolves them).

## Next steps

1. Owner: review PR #9 (whole FOCUS v1 batch + close-out) and merge.
2. Owner: `npm publish` from `packages/finops-focus-mcp/` and (if desired)
   the root `finops-framework-mcp` package; MCP-registry submit both
   `server.json` manifests.
3. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages deploy
demo/`; smoke-test the demo against the deployed Worker (the CORS fix is
   handler-level verified, not yet wrangler-deployed).
4. Next agent session: T-057..T-059 (architecture periphery, derive
   integration test, demo format-gate). Regenerate `docs/mcp-surface.md`
   (`npm run gen:mcp-surface`) if any of those touch a prompt/resource/tool.

## Open questions

- npm publish of the root framework package: 1.0.x now vs after PR merge —
  owner call (registry manifests are ready either way).
- Trademark posture recorded in `decisions.md` (finops-focus-mcp,
  accepted-risk): revisit only if the FinOps Foundation objects.
- `agentic.config.json` format-gate scope excludes `demo/` (review MINOR):
  protected path — needs an explicit owner-approved task.
- `src/shared/index.ts` `export *` barrel: any new server code importing a
  real binding from it can silently reintroduce fs-reachability in the
  Worker; `fs-boundary.test.ts` only catches code reachable from
  `src/workers/index.ts`. Splitting the barrel is a real refactor (queued
  observation since T-037).
- `validateFocusCsv` can't validate JSON-typed columns whose
  `allowed_values` are embedded-key names (1.2 `SkuPriceDetails`); the
  generator emits null as a workaround (decisions.md 2026-07-28).
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind `FINOPS_MCP_EXPERIMENTAL`.
- MCP SDK zod validation silently strips unknown tool params
  (docs/eval-results.md #3) — revisit when the SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping);
  supervising sessions must not commit a live loop's in-flight tasks.json;
  NEW — background watchers must not `pgrep` for a pattern contained in
  their own command line (self-match false positive, this session).

## Last updated

2026-08-02 — T-056 session (dual-launch hygiene: SECURITY.md,
CONTRIBUTING.md, issue template, npm author/homepage/bugs, engines >=22).
