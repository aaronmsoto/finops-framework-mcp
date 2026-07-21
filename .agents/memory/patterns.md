# Patterns — conventions agents must follow in this repo

## Harness code (`harness/src/`)

- TypeScript, `strict: true`, ES2022 modules, ESM only (no `require`).
- Node builtins imported with the `node:` prefix (`node:fs`, `node:crypto`).
- No runtime dependencies except `yaml`. Do not add packages to fix a problem
  you can solve with ~30 lines of stdlib code.
- Hand-rolled argv parsing in `cli.ts`; commands exit 0 success / 1 failure /
  2 usage error; `--json` prints machine-readable output to stdout only.
- Errors: fail with a message naming the offending file/path; no bare throws.

## Tests

- Vitest unit tests live in `harness/tests/*.test.ts` (a protected path — never
  edit tests in the same change as the implementation without saying so).
- Pure functions preferred so compiler/gate outputs can be snapshot-tested.
- Never `.only`/`fit`/`fdescribe`; the integrity gate fails on focus markers.

## Hook scripts (`scripts/hooks/`)

- Zero-dependency Node ESM (`.mjs`). Defensive: any internal error means
  allow (exit 0) with a stderr note — a broken hook must never brick a session.
- Exit 2 is the only blocking exit; put the reason on stderr in one line.

## Docs

- `.agentic/docs/architecture.md` is normative; change code and contract together.
- Prose is dense and factual; no marketing language; line width ~100 chars.

## Commits

- One commit per task. Imperative subject <= 72 chars; body explains why.
- No AI attribution in git artifacts: the `prepare-commit-msg` hook strips
  bot trailers/session links/"Generated with" footers, and the integrity gate
  fails new commits that carry them. Write commit messages without them.

## PR bodies (learned 2026-07-15)

- PR-creation tooling can auto-append AI-attribution footers AFTER the body
  you submit. After creating any PR, read the body back and strip such
  footers (updates don't re-append; only creation does). CI's "PR body
  carries no AI attribution" check is the backstop.
