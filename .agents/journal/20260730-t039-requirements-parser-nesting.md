# T-039 — requirements parser: nested bullets + RECOMMENDED/MAY — 2026-07-30T13:48:00Z

- did: fixed the two BLOCKER/MAJOR gate-4 findings that share one root
  cause (`docs/critique-4-focus-gate.md` C2-fidelity-1/2). In
  `src/crawlers/focus/parse/table.ts`:
  - `NORMATIVE` extended from `MUST NOT|MUST|SHOULD NOT|SHOULD` to the
    full RFC-2119 family FOCUS uses: `MUST NOT|MUST|SHOULD NOT|SHOULD|
    RECOMMENDED|MAY` (longest-first).
  - Replaced the indent-0-only bullet filter with `buildBulletForest`
    (stack-based, indentation defines nesting — FOCUS 1.2 nests 2 spaces
    per level, up to 3 levels observed live in `CommitmentDiscountQuantity`
    1.2) + `collectNormative` (depth-first walk, emits every normative
    bullet at any depth, nested ones prefixed with the joined chain of
    ancestor bullet text, trailing `:` stripped).
  - `parse/table.test.ts`: rewrote the old "ignoring nested bullets"
    assertion (task explicitly authorized this — it was wrong per gate 4)
    into a general nested-prefix test, plus three fixture tests using real
    bullet text from `data/focus/1.2/columns/{effectivecost,skuid,
    invoiceid}.md` pinning the recovered content.
  - Re-ran `node dist/crawlers/focus/cli.js` (built first via `npm run
    build`) — 0 network fetches (128 cached), regenerated
    `data/focus/{1.0,1.2}/{columns,attributes}.json` + manifests.
    `data/focus/derived/diff-1.0-1.2.json` came out byte-identical (the 43
    "changed" columns were already flagged changed pre-fix; recovering
    more requirements text on an already-"changed" column doesn't move the
    diff's changed-count — expected, matches gate 4's C2-fidelity-4 note
    that the diff is computed over lossy parsed requirements).
  - Re-ran `node scripts/bundle-worker-data.mjs` — `src/workers/generated/
    focus-store.ts` regenerated to match.
- result: `npx vitest run src/crawlers/focus/parse/` → 3 files, 19 tests
  passed. `./scripts/agentic gates --tier all` → PASS (format, lint,
  typecheck, test 359 passed, designs, integrity, memory, build; coverage/
  e2e optional-skip as before — no regression). Live probe via
  `node evals/framework/mcp-call.mjs --server=focus call get_requirements
  '{"column":"EffectiveCost","version":"1.2"}'`: 10 requirements returned
  (previously 7), including both `CommitmentDiscountId`-scoped nested
  MUSTs, e.g. `"...The sum of EffectiveCost where ChargeCategory is
  \"Usage\" MUST equal the sum of BilledCost where ChargeCategory is
  \"Purchase\"."`. Same probe for InvoiceId 1.2: 7 requirements (previously
  4? — actually 5 top-level pre-fix minus the two dropped
  RECOMMENDED/MAY, so previously 3 survived; now 7), including the
  RECOMMENDED presence bullet, both nullability MUSTs (previously nested
  and dropped), and the MAY pre-invoice bullet. `git diff
  data/focus/1.0/columns.json` confirms the 1.0 `tags.md` MAY-recovery
  gate 4 counted separately ("A Tag key with a null value ... MAY be
  included in the tags column depending on the provider's tag finalization
  process.").
  `packages/focus-spec-mcp/data/` is gitignored, restaged from
  `data/focus/` by `pack-focus.mjs` at prepack time (confirmed in the
  `gates` test-run log: "pack-focus: staged ... data/focus into
  packages/focus-spec-mcp/") — no separate regeneration needed there.
- next: T-040..T-047 — gate 4's remaining findings (Worker CORS
  C4-community-1 is the other BLOCKER; then the MAJOR/MINOR cluster:
  get_requirements attribution footer, compare_versions "unchanged" on
  typo'd columns + materiality caveat, focus-spec-mcp README "official"
  phrasing, calculate_kpi 0/0 guard, KPI-mapping version differentiation,
  cross-version unknown-column hints, diff artifact official:false marker,
  package trademark naming as an owner decision point). One task at a time
  per `.agents/tasks.json`.
