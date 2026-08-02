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

**T-053 done** (2026-08-02, this session): added the `map-kpi-to-focus-columns`
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
4. Next agent session: work the 19-MINOR backlog from
   `docs/final-status-review.md` — start with the MEMORY.md rewrite
   (update-memory skill) and the `combined-scenario.xml` step-4 expectation
   fix (T-045 made the server correct; that eval prose is now stale).

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

2026-08-02 — T-053 session (map-kpi-to-focus-columns prompt, review MCP-4;
also fixed a latent completable()+optional() bug in focus/prompts.ts).
