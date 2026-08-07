# Spec: Consume @aaronmsoto/agentic-harness from GitHub Packages (Phase C)

## Problem

This repo runs a vendored harness fork (`.agentic/harness/`,
`@agentic-starter/harness` 0.1.0, private) that is ~307 approvals.ts lines
behind the published template harness — no versioned surface markers, no
`approvals.lock.json`, no `agentic upgrade`, no Copilot native-hooks
surface, no version-skew warning. `@aaronmsoto/agentic-harness@0.1.0` is
now live on GitHub Packages; every day on the fork widens the drift the
extraction existed to kill. Constraint discovered up front: the harness
CANNOT be a root `package.json` devDependency — `gates-fast` runs `npm ci`
at the root and must stay registry-free for forks and public consumers of
the product packages.

## Outcome

- The harness arrives via a **separate manifest** `.agentic/package.json`
  (sole devDependency `@aaronmsoto/agentic-harness`, own lockfile) plus a
  committed `.agentic/.npmrc` (scope registry line + `${NPM_TOKEN}` auth
  reference). Root package.json/lockfile untouched; product CI jobs never
  see the registry.
- `scripts/agentic` becomes npm-first: resolve
  `.agentic/node_modules/@aaronmsoto/agentic-harness/dist/cli.js`, then
  root `node_modules`, then the vendored path, with a clear error naming
  the install command. Harness gate entries in `agentic.config.json`
  (`designs`/`integrity`/`memory`) invoke `./scripts/agentic <cmd>` so the
  resolution logic lives in one place.
- Generated surfaces are recompiled by the NEW harness via
  `agentic upgrade`, and the diff (markers + `_generated` keys +
  `approvals.lock.json` + new `.github/hooks/copilot-cli-policy.json` +
  `scripts/hooks/copilot-policy.mjs` + settings hook-block re-ownership +
  any semantic ruleset/CODEOWNERS changes from the 307-line drift) is
  REVIEWED file-by-file in the journal, not blind-committed. This is the
  honest end-to-end test of Phase B.
- CI governance job's "Acquire harness" step swaps
  `./scripts/bootstrap.sh` → `npm ci --prefix .agentic` with auth per the
  owner's Q2 answer; the fork no-op (`FORK_PR` exit 0) is unchanged —
  forks can never read a private package, which is exactly why governance
  no-ops there.
- The vendored `.agentic/harness/` is deleted; `bootstrap.sh` reinstalls
  via npm instead of building it; docs (AGENTS.md command table note,
  architecture/operations references) updated. Parity proof at the end:
  `gates --tier all` PASS, `verify` PASS, one `loop --runner mock`
  iteration green — all on the npm harness only.

## Non-goals

- Publishing new harness versions (owner release, in the template repo).
- Fixing the template's ruleset self-approval deadlock or making the
  SessionStart hook shim-aware (queued template work, tracked there).
- Phase D (INSTANTIATE.md npx-first flow) — template repo.
- Back-porting any finops-local harness patches upstream beyond what the
  surface-diff review flags (none are known; the fork predates T-025/26
  fixes which were already ported).

## Acceptance criteria

- [ ] `.agentic/package.json` + lockfile + `.agentic/.npmrc` committed;
      root `package.json`/`package-lock.json` byte-unchanged; `npm ci` at
      root still succeeds with NO registry auth present.
- [ ] `./scripts/agentic --help` resolves the npm copy when installed,
      the vendored copy when not (until deletion), and errors actionably
      when neither exists.
- [ ] `agentic upgrade` run with the npm harness; every changed surface
      reviewed in the journal with a sentence on WHY it changed;
      `approvals check` clean afterwards; `gates` skew warning absent.
- [ ] Protected-path edits are explicitly authorized per task:
      `agentic.config.json` gate commands (shim indirection),
      `.claude/settings.json` (recompiled surface), `.github/workflows/`
      "Acquire harness" step, and the approvals.yaml
      `.agentic/harness/tests/**` cleanup — nothing else in those files.
- [ ] Governance CI job installs the harness from GitHub Packages (auth
      per Q2), product jobs remain registry-free; fork no-op preserved.
- [ ] Vendored `.agentic/harness/` deleted only after a same-branch
      baseline: `gates --tier all` PASS before and after the swap, plus
      `verify` PASS and one mock-loop iteration on the npm harness.
- [ ] `git grep -l "agentic-starter/harness\|.agentic/harness/dist"`
      returns only historical files (journals/specs/decisions) — no live
      code, config, docs, or CI references.

## Open questions

All four resolved by the owner on 2026-08-06. Recorded as decisions:

1. **Branching — RESOLVED: recreate `dev`, keep integration mode.**
   `dev` was recreated from `main` in the planning session (plain branch
   push, no policy change). approvals.yaml stays `mode: integration`;
   `integration-branch.json` stays a compiled surface; task PRs target
   `dev` again with release PRs `dev` → `main`. Rejected: flipping to
   trunk (would have matched the temporary main-only flow but abandons
   the auto-merge integration lane the repo was designed around).
2. **CI auth — RESOLVED: package access grant.** The owner grants
   `finops-framework-mcp` read access in the package's settings (package
   page → Package settings → Manage Actions access), and the governance
   job authenticates with its built-in `GITHUB_TOKEN` — no long-lived
   secret. `NPM_TOKEN` PAT stays documented as the fallback and remains
   how LOCAL machines and agent sessions authenticate.
3. **Deletion timing — RESOLVED: this phase, after the parity proof.**
   Git history is the rollback; no fallback release.
4. **approvals.yaml glob — RESOLVED: remove** `.agentic/harness/tests/**`
   in the deletion task, as an explicitly authorized single-line edit
   plus surface recompile.
