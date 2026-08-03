# Contributing

This repository is developed primarily by AI coding agents against a fixed
protocol. Read [`AGENTS.md`](AGENTS.md) first — it is the canonical set of
instructions for how work here gets planned, implemented, verified, and
recorded, and it applies equally to human contributors.

## Quick start

1. `./scripts/bootstrap.sh` (once per clone).
2. Pick up work via `./scripts/agentic tasks list | next` or open an issue
   describing the change first for anything nontrivial.
3. Make the smallest change that satisfies the task, matching surrounding
   code style.
4. Run `./scripts/agentic gates` (`--tier full` before shipping) and fix
   failures — see `AGENTS.md`'s "Hard rules" for what gates protect and must
   never be weakened to pass.
5. Open a pull request using the repo's PR template
   (`.github/pull_request_template.md`): what changed and why, the task ID,
   pasted gate/behavior evidence, and any approval points touched.

## Testing the servers locally

The repo ships a `.mcp.json` that loads both servers into MCP clients that
read it (Claude Code among them), pointed at the local build:

```json
{
  "finops-framework": "node dist/servers/framework/main.js",
  "finops-focus": "node dist/servers/focus/main.js"
}
```

`dist/` is gitignored, so **build first** — step 1's `bootstrap.sh` (or
`npm install && npm run build`) — otherwise the config points at files that
don't exist yet. Clients read MCP config at startup, so restart the client
after a first build.

This is the _contributor_ form. The `npx`-based config documented for
end users in [`docs/guide/index.html`](docs/guide/index.html) is
deliberately different: it runs the published packages rather than your
working tree.

For one-off calls without an MCP client, use the stdio bridge directly —
this is what the eval suites and every documented transcript use:

```bash
node evals/framework/mcp-call.mjs list-tools
node evals/framework/mcp-call.mjs --server=focus call list_versions '{}'
```

## Ground rules

- One task per PR.
- Never edit `approvals.yaml`, `.claude/settings.json`,
  `agentic.config.json` gate definitions, or `.github/workflows/` unless the
  task explicitly calls for it — these are owner-approval points.
- No AI-attribution footers or trailers in commits or PR text (CI checks
  this).
- Bug reports: use the issue template under `.github/ISSUE_TEMPLATE/`.
  Security vulnerabilities: see [`SECURITY.md`](SECURITY.md) instead of a
  public issue.

For the full design rationale behind the gates, tasks, and memory system,
see `.agentic/docs/architecture.md`.
