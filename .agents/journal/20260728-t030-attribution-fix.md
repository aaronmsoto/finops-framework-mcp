## T-030 rework: get_attribute missing CC BY footer — 2026-07-28T00:00:00Z

- context: prior iteration's build for T-030 (commit a79c09d) passed gates but
  the independent verifier (`.agents/.cache/verify/T-030-1785225144803.md`)
  failed the task: `get_attribute` built its text response inline in
  `tools.ts` instead of calling `render.ts`'s `attributeMd()`, so it never got
  the CC BY 4.0 footer that `get_column`, the resource handlers, and the
  glossary all carry. The loop reverted `.agents/tasks.json` T-030 to
  `pending` (uncommitted) and left the failure journal
  `.agents/journal/20260728-loop-build-073521.md` in place — everything else
  in that verifier's criteria 1/3 passed.
- did: `src/servers/focus/tools.ts` `get_attribute` handler now calls
  `attributeMd(resolved.artifact, resolved.version, a)` for its text response
  (mirrors `get_column`'s `columnMd(...)` call), so the footer rides on every
  content-bearing response as the spec requires. Added the missing assertion
  to `get_attribute`'s test (`server.test.ts`) — `expect(res.content[0]?.text
  ).toContain("CC BY 4.0")` — mirroring the check `get_column`'s test already
  had, closing the coverage gap the verifier flagged.
- result: `./scripts/agentic gates` → PASS (format/lint/typecheck/test/
  designs/integrity/memory all green, 268/268 tests). Rebuilt
  (`npm run build`) and reproduced the fix live: `node evals/framework/
  mcp-call.mjs call get_attribute '{"slug":"CurrencyFormat"}' --server=focus`
  now shows the `© FinOps Foundation, licensed CC BY 4.0 ...` footer in
  `content[0].text` (it was absent before the fix). `node dist/servers/focus/
  main.js --version` still prints `focus-spec-mcp v1.0.0 (FOCUS spec
  versions: 1.0, 1.2; latest 1.2)`.
- next: run `./scripts/agentic tasks complete T-030 --commit --summary "..."`
  to re-close the task with this fix folded in, then continue T-031 onward
  per the spec.
