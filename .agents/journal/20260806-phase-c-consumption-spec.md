# 2026-08-06 — Spec: consume @aaronmsoto/agentic-harness (Phase C planning)

**Mode:** interactive planning (plan-feature). Spec + tasks, no
implementation. Prerequisite landed this morning:
`@aaronmsoto/agentic-harness@0.1.0` published to GitHub Packages by the
owner (see agentic-starter-repo journal 20260806-harness-published.md).

**Sized large:** registry auth, a protected-path CI edit, deletion of a
protected-path tree, and a 307-line approvals.ts drift to reconcile.
Spec: `.agents/specs/harness-npm-consumption.md`.

**Key constraint found while studying the code:** the harness CANNOT be a
root devDependency — `gates-fast` runs `npm ci` at the root and must stay
registry-free for forks/public consumers. Design: separate
`.agentic/package.json` manifest + committed `.agentic/.npmrc`; the shim
probes `.agentic/node_modules` → root `node_modules` → vendored.

**Owner resolved all four questions in-session:** (1) recreate `dev`,
keep integration mode — dev was pushed back from main this session
(plain branch create, no policy edit); (2) CI auth via package access
grant + built-in GITHUB_TOKEN, PAT fallback documented; (3) vendored
copy deleted this phase after the parity proof; (4) the dead
`.agentic/harness/tests/**` protected glob is removed in the deletion
task as an authorized single-line approvals.yaml edit.

**Tasks queued (chain valid):** T-073 manifest+shim, T-074 CI swap,
T-075 upgrade+drift review, T-076 delete+parity proof. The other
session's T-070..T-072 occupied the next IDs — numbering is sequential
after them, no collision this time (single live branch).

**Owner prerequisites before/while the build runs:** (a) package access
grant: package page → Package settings → Manage Actions access → add
`finops-framework-mcp` (read) — needed for T-074's green CI run; (b) a
`read:packages` token available to the implementing session as
`NPM_TOKEN` (the publish PAT was advised revoked) — needed for T-073's
install; setting it as an environment variable in the Claude Code
environment settings avoids pasting it in chat.

**Next:** `/next-task` (or the loop) picks up T-073 in a fresh context.
