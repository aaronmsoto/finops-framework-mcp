# 2026-08-07 — Merge reconciliation: main → dev, T-073(main) renumbered T-078

**Why:** rolling release PR #17 (dev → main) reported conflicts after PR #18
merged to dev — `main` carried PR #15 (guide large-viewport widening from a
parallel session) that dev lacked.

**Conflicts (2):**

1. `.agents/tasks.json` — task-ID collision, the second occurrence of the
   known harness weakness (starter-repo feedback item 13): main's T-073
   "Widen the guide's large-viewport container" vs this chain's T-073
   "Consume the npm harness via manifest". Resolution follows the
   2026-08-06 precedent (T-065..T-067 → T-067..T-069): kept dev's chain
   T-001..T-077 intact, appended main's task renumbered **T-078** with
   evidence preserved, recomputed its hash per the harness scheme
   (`sha256(prevHash + id + canonicalJson(evidence))`, tasks.js:91) and set
   chainHead to it. `./scripts/agentic tasks validate`: **task chain
   valid**. Journal `20260806-t073-guide-wide-viewport.md` keeps its old ID
   (journals are historical record).
2. `.agents/memory/activeContext.md` — kept the T-077 rewrite, folded in
   PR #15's surviving facts: the T-078 note, the pre-existing guide mobile
   overflow (414/360px) as an open question, and the upstream-port status
   (toggles already shipped in 0.2.0; spec from PR #15 retained as the
   fuller brief).

**Auto-merged cleanly:** `docs/guide/*.html` (verified both change sets
present: 4 `--wrap` hits AND the unofficial/`npx -y` edits),
`20260806-t073-guide-wide-viewport.md`,
`.agents/specs/upstream-port-to-agentic-starter-repo.md`.

**Evidence:** `tasks validate` valid; `gates` PASS (see commit); after this
lands on dev, PR #17 refreshes conflict-free for the owner's merge.
