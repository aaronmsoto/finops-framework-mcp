# 2026-08-02 — T-056: dual-launch hygiene (SECURITY/CONTRIBUTING/issue template, npm metadata, engines)

## Task

`docs/final-status-review.md` #16 (L3) and #17 (L4): no SECURITY.md,
CONTRIBUTING.md, or issue templates; both `package.json`s missing
`author`/`homepage`/`bugs`; `engines.node >=20` declared but CI only tests
node 22.

## What I did

- **`SECURITY.md`** (root): supported-versions note (both packages, latest
  version only; notes the read-only/no-auth posture from the Worker) and a
  report channel — GitHub Security Advisories
  (`.../security/advisories/new`) rather than a public issue, so no personal
  email needed to be published in the repo.
- **`CONTRIBUTING.md`** (root): short — points at `AGENTS.md` as canonical,
  summarizes bootstrap → task → gates → PR flow, restates the protected-path
  and no-AI-attribution rules from `AGENTS.md`'s hard rules, and points bug
  reports at the new issue template and vulnerabilities at `SECURITY.md`.
- **`.github/ISSUE_TEMPLATE/bug_report.md`**: one template (package+version,
  what happened, repro steps incl. MCP client/tool/args, environment,
  additional context). `.github/workflows/` untouched.
- **`package.json`** (root) and **`packages/finops-focus-mcp/package.json`**:
  added `author: "Aaron Soto"` (matches `LICENSE` copyright holder — no
  email published, matching the SECURITY.md contact-channel choice),
  `homepage` (root README anchor; focus package's `tree/main/.../README`
  anchor since it's a subdirectory), `bugs.url` (repo issues, same for
  both since it's one repo). Bumped `engines.node` from `>=20` to `>=22` in
  both — grepped `.github/workflows/ci.yml` to confirm both CI jobs pin
  `node-version: 22` only (lines ~65, ~105), so `>=20` was untested; no
  workflow edit needed since CI already only tests 22.
- Focus package README's "See that repository for source, tests, and
  contribution docs" (line 16) now resolves: the linked monorepo has a real
  `CONTRIBUTING.md` at its root. No README edit needed — it already links to
  the repo, not a missing file.

## Verified

- `./scripts/agentic gates` (default tier): format/lint/typecheck/test (392
  tests)/designs/integrity/memory all PASS. (Integrity gate's one WARN is
  about the accumulated multi-task diff vs `origin/main` mixing impl and
  tests across the whole unpushed history — pre-existing, not from this
  task's files, which are all new docs + two `package.json` edits.)
- `npm run build` then `npm pack --dry-run` from repo root: succeeds, 196
  files, 415.0 kB tarball, includes the updated `package.json`.
- `npm pack --dry-run` from `packages/finops-focus-mcp/`: `prepack` (stages
  `dist/servers/focus`, `dist/shared`, `data/focus`) runs clean, succeeds,
  169 files, 242.9 kB tarball.
- Confirmed `.github/workflows/**` is the only protected path under
  `approvals.yaml` — `.github/ISSUE_TEMPLATE/` isn't covered, consistent
  with the acceptance criterion "workflows NOT touched" (verified: `git
  status` shows no changes under `.github/workflows/`).

## Next

T-057..T-059 remain (architecture periphery items, derive-pipeline
integration test, demo format-gate) — see `docs/final-status-review.md`
post-launch backlog.
