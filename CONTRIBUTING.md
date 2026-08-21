# Contributing

This repository is developed primarily by AI coding agents against a fixed
protocol. Read [`AGENTS.md`](AGENTS.md) first — it is the canonical set of
instructions for how work here gets planned, implemented, verified, and
recorded, and it applies equally to human contributors.

## Quick start — external contributors

Everything the product needs runs from the public npm registry; you do NOT
need the agentic harness (owner tooling, installed from a registry that
requires auth). This is exactly what CI's `gates-fast` job runs on every PR:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test           # includes coverage thresholds
npm run build      # before shipping / to run the servers locally
```

Open an issue first for anything nontrivial, make the smallest change that
satisfies it, and open a pull request using the repo's PR template
(`.github/pull_request_template.md`): what changed and why, plus pasted
command/behavior evidence.

## Quick start — maintainers (harness path)

The `./scripts/agentic` harness (task chain, gates, memory lint) installs
from GitHub Packages and needs a `read:packages` token in `NPM_TOKEN`:

1. `./scripts/bootstrap.sh` (once per clone).
2. Pick up work via `./scripts/agentic tasks list | next`.
3. Run `./scripts/agentic gates` (`--tier full` before shipping) and fix
   failures — see `AGENTS.md`'s "Hard rules" for what gates protect and must
   never be weakened to pass.
4. Complete tracked tasks via `./scripts/agentic tasks complete <id>`.

## Testing the servers locally

The repo ships a `.mcp.json` that loads both servers into MCP clients that
read it (Claude Code among them). It runs the **published** packages, so
opening this repo in a client works with no build:

```json
{
  "mcpServers": {
    "finops-framework": { "command": "npx", "args": ["-y", "finops-framework-mcp"] },
    "focus-spec": { "command": "npx", "args": ["-y", "finops-focus-mcp"] }
  }
}
```

That is deliberately *not* what you want while changing server code — it
would exercise the release, not your working tree. For that, copy the
contributor variant over it:

```bash
cp .mcp.json.example .mcp.json     # runs dist/ from your working tree
npm ci && npm run build            # dist/ is gitignored — build first
```

Do not commit that swap. `dist/` not existing is the failure mode worth
knowing about: the client spawns a command that fails instantly, registers
zero tools, and reports nothing useful — it looks like the servers are
broken rather than unbuilt. Clients also read MCP config only at startup,
so restart yours after the first build.

To check what your client actually registered, `claude mcp list` (or `/mcp`
inside a session) is faster than guessing.

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
- AI attribution in commits and PR text (bot `Co-Authored-By` trailers,
  session links, "Generated with ..." footers) is governed by
  `ai_attribution` in `approvals.yaml`; this repo sets `allow`, so leave
  such trailers alone — don't add policy of your own and don't spend
  effort stripping them.
- Bug reports: use the issue template under `.github/ISSUE_TEMPLATE/`.
  Security vulnerabilities: see [`SECURITY.md`](SECURITY.md) instead of a
  public issue.

For the full design rationale behind the gates, tasks, and memory system,
see `.agentic/docs/architecture.md`.
