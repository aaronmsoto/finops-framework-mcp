# 20260805 — T-065: collapse product gate commands into root npm scripts

## T-065 done — 2026-08-05

- Did: first task of the CI product/governance split
  (`.agents/specs/ci-product-governance-split.md`). Root `package.json`
  gained `format:check` (`prettier --check src tests demo`), `lint`
  (`eslint src tests`), and `typecheck` (`tsc --noEmit`) — bodies are
  byte-identical to the commands previously inlined in the
  `agentic.config.json` gate entries. The `format`, `lint`, `typecheck`,
  and `test` gate entries now invoke `npm run <script>`; `build` already
  invoked `npm run build --if-present` and is unchanged. After this change
  no tool binary (prettier/eslint/tsc/vitest) is named in both files —
  `package.json` scripts are the single source of truth, as the spec
  requires so CI product jobs and gates cannot drift.
- Protected path: the `agentic.config.json` gates-block edit is explicitly
  AUTHORIZED by the spec ("Authorized protected-path edits" section) and by
  this task's acceptance criteria. The supervised-edit marker
  (`.agents/.cache/policy-edit-ok`) was placed for the single edit and
  removed immediately after. `approvals.yaml` and `.claude/settings.json`
  untouched. The `coverage` gate entry was deliberately NOT touched — its
  removal is T-066's scope.
- Result: `./scripts/agentic gates --tier all` PASS on the changed tree —
  format/lint/typecheck/test/designs/integrity/memory/build all green, 407
  tests (37 files) passed, coverage summary unchanged at
  75.6/65.21/75.6/76.72. Gate output confirms each product gate now runs
  via npm (`> finops-framework-mcp@1.0.0 format:check` etc.) and executes
  the identical underlying command, proving the indirection changed no
  behavior.
- Next: T-066 (vitest coverage thresholds + remove the unbound `coverage`
  gate entry), then T-067 (CI workflow split + `.agentic/` stash
  fork-simulation evidence).
