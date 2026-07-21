# Claude Code: Capabilities and Repo-Configuration Best Practices (mid-2026)

Research date: 2026-07-13. All claims below are verified against Anthropic's official docs (code.claude.com) or official GitHub repos unless marked *inference*. Claude Code moves fast (several releases/week); doc-cited version gates are noted where the docs state them.

## Findings

### 1. CLAUDE.md and the memory system

- CLAUDE.md is loaded as a **user message after the system prompt** at the start of every session — it is advisory context, not enforced config. For hard guarantees Anthropic explicitly says to use hooks instead. (https://code.claude.com/docs/en/memory)
- Locations and load order (broad → specific): managed policy (`/etc/claude-code/CLAUDE.md` on Linux) → `~/.claude/CLAUDE.md` → project `./CLAUDE.md` or `./.claude/CLAUDE.md` → `./CLAUDE.local.md` (gitignored personal notes). Parent-directory CLAUDE.md files load in full at launch (monorepo support); child-directory ones load lazily when Claude reads files there. (memory doc)
- **Official size guidance: target under 200 lines per CLAUDE.md.** "Bloated CLAUDE.md files cause Claude to ignore your actual instructions." The include/exclude test Anthropic recommends: "Would removing this cause Claude to make mistakes? If not, cut it." Include: bash commands Claude can't guess, non-default style rules, test-runner instructions, repo etiquette (branch naming, PR conventions), architecture decisions, env quirks, gotchas. Exclude: anything inferable from code, standard conventions, API docs, frequently-changing info. (https://code.claude.com/docs/en/best-practices, https://code.claude.com/docs/en/memory)
- **Imports**: `@path/to/file` syntax pulls other files into context at launch (recursive, max depth 4; skipped inside backticks/code fences). Imports organize but do **not** save context — imported files still load at launch. HTML comments in CLAUDE.md are stripped before injection (free maintainer notes).
- **AGENTS.md interop**: Claude Code reads CLAUDE.md, not AGENTS.md. Official recommendation: a CLAUDE.md containing `@AGENTS.md` (plus Claude-specific extras below it), or a symlink. `/init` in a repo with AGENTS.md incorporates it, and also reads `.cursorrules`, `.windsurfrules`, etc. This is the single most important fact for a dual-agent starter repo. (memory doc)
- **`.claude/rules/*.md`**: modular rules files, discovered recursively; files with YAML `paths:` frontmatter (glob patterns, brace expansion supported) load **only when Claude works with matching files**. Rules without `paths` load every session at same priority as `.claude/CLAUDE.md`. Symlinks supported for sharing rules across repos. User-level `~/.claude/rules/` loads before project rules. (memory doc)
- **Auto memory** (v2.1.59+, on by default): Claude writes its own notes to `~/.claude/projects/<project>/memory/` — a `MEMORY.md` index (first 200 lines / 25KB loaded every session) plus on-demand topic files. Machine-local, shared across worktrees of one repo, relocatable via `autoMemoryDirectory` in settings (any scope; project-scope value gated behind workspace trust). Toggle via `autoMemoryEnabled` or `/memory`. This partially overlaps the starter repo's planned memory system. (memory doc)
- **`/init`**: generates a starter CLAUDE.md from codebase analysis; suggests improvements if one exists. `CLAUDE_CODE_NEW_INIT=1` enables an interactive multi-phase flow that proposes CLAUDE.md + skills + hooks after subagent exploration. (memory doc)

### 2. settings.json and permissions

- Precedence (highest first): managed settings → CLI args → `.claude/settings.local.json` → `.claude/settings.json` (commit to repo) → `~/.claude/settings.json`. (https://code.claude.com/docs/en/settings)
- Permission rules: `allow` / `ask` / `deny` arrays with tool-scoped patterns like `Bash(npm run lint)`, `Read(./.env*)`; **deny is checked first, then ask, then allow**. A `$schema` line enables editor validation.
- Permission modes: default, plan mode, `bypassPermissions`, and **auto mode** (`--permission-mode auto`) where a separate classifier model reviews commands and blocks only risky ones (scope escalation, unknown infrastructure, hostile-content-driven actions); in `-p` runs auto mode aborts if the classifier repeatedly blocks. OS-level **sandboxing** (`/sandbox`) is the third interruption-reduction lever. (best-practices doc)
- **Workspace trust gate**: permissions, hooks, `allowed-tools` in project skills, project-scope plugins, and `.mcp.json` approvals in a cloned repo only take effect after the user accepts the trust dialog — a template repo cannot pre-approve its own dangerous capabilities. Committed `enableAllProjectMcpServers` is ignored in an untrusted folder (v2.1.196+ behavior noted in MCP doc). (https://code.claude.com/docs/en/mcp, /docs/en/skills)

### 3. Hooks — the deterministic enforcement layer

- Events (from the hooks reference, https://code.claude.com/docs/en/hooks): per-session `SessionStart`/`SessionEnd`; per-turn `UserPromptSubmit`, `Stop`, `StopFailure`; per-tool-call `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `PermissionRequest`, `PermissionDenied`; plus `SubagentStart/Stop`, `PreCompact/PostCompact`, `FileChanged`, `WorktreeCreate`, `TaskCreated/Completed`, `ConfigChange`, and more.
- Handler types now go beyond shell: `command`, `http` (POST), `mcp_tool`, `prompt` (LLM evaluation), `agent` (subagent validator). `async: true` runs in background; `asyncRewake: true` wakes Claude on exit 2.
- Semantics: **exit 2 blocks** (exit 1 does not); JSON on exit 0 gives fine-grained control — PreToolUse can `allow|deny|ask|defer` and even rewrite tool input (`updatedInput`); **Stop hooks can block the turn from ending until a check passes** (Claude Code force-ends after 8 consecutive blocks); SessionStart can inject `additionalContext`, set the session title, and persist env vars via `$CLAUDE_ENV_FILE`. `${CLAUDE_PROJECT_DIR}` resolves project-local scripts.
- Anthropic's stated rule: "Use hooks for actions that must happen every time with zero exceptions. Unlike CLAUDE.md instructions which are advisory, hooks are deterministic." (best-practices doc)

### 4. Skills (slash commands merged in)

- **Custom slash commands have been merged into skills**: `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`; skills add supporting-file directories, invocation control, and automatic model-driven loading. Claude Code follows the cross-tool **Agent Skills open standard** (agentskills.io) with extensions. (https://code.claude.com/docs/en/skills)
- SKILL.md = YAML frontmatter + markdown body; body loads only on use (progressive disclosure — descriptions sit in context, full content loads on demand). Official guidance: **keep SKILL.md under 500 lines**, push detail into sibling files.
- Key frontmatter: `name`, `description` (the trigger), `disable-model-invocation: true` (manual-only, for side-effectful workflows like /deploy), `user-invocable: false` (Claude-only background knowledge), `allowed-tools` (grants pre-approved tools while active — trust-gated for project skills), `disallowed-tools`, `context: fork` + `agent:` (run in an isolated subagent), `hooks` (skill-scoped hooks), `arguments`/`$ARGUMENTS`/`$1` substitutions, `${CLAUDE_PROJECT_DIR}` (v2.1.196+).
- A skill folder containing `.claude-plugin/plugin.json` loads as a full plugin (agents/hooks/MCP) with no marketplace — useful packaging trick.

### 5. Subagents and multi-session scaling

- `.claude/agents/*.md` (project) and `~/.claude/agents/` (user): markdown + frontmatter (`name`, `description`, `tools`, `model` — e.g. route to cheaper/faster models). Own context window, own tools/permissions. Built-ins include Explore, Plan, general-purpose. Primary uses per Anthropic: context preservation (research without polluting the main window), constraint enforcement, and **adversarial review in a fresh context** ("a fresh context improves code review since Claude won't be biased toward code it just wrote"). (https://code.claude.com/docs/en/sub-agents, best-practices)
- Scaling options: git worktrees, desktop app parallel sessions, Claude Code on the web, and **agent teams** (automated coordination of multiple sessions with shared tasks and a team lead). Writer/Reviewer split sessions are an officially documented pattern. (best-practices)

### 6. Verification loops (core best-practice, directly relevant to a quality-gate harness)

Anthropic's #1 tip: "Give Claude a check it can run." Their escalation ladder for how hard the check gates completion: (1) ask in-prompt; (2) `/goal` — a separate evaluator re-checks a condition after every turn until it holds; (3) **Stop hook as deterministic gate** — blocks turn end until the script passes; (4) second-opinion subagent/fresh-context review. Also: demand evidence (test output, command transcripts, screenshots) rather than assertions. (https://code.claude.com/docs/en/best-practices)

### 7. Plugins and marketplaces

- Plugin = directory with `.claude-plugin/plugin.json` bundling skills/commands, agents, `hooks/hooks.json`, `.mcp.json`, LSP servers (`.lsp.json`), and experimental monitors. `version` pins updates (falls back to git SHA); `defaultEnabled: false` (v2.1.154+) ships opt-in plugins. `claude plugin validate --strict` is CI-ready. (https://code.claude.com/docs/en/plugins-reference)
- Marketplaces are git repos with `.claude-plugin/marketplace.json`; official (anthropics/claude-plugins-official) is preinstalled; community catalog pins plugins to commit SHAs. Repos can commit `extraKnownMarketplaces`/`enabledPlugins` in `.claude/settings.json` to auto-offer plugins to collaborators (trust-gated; project-scope plugins that run code are restricted further). (https://github.com/anthropics/claude-plugins-official, plugins-reference)

### 8. MCP configuration

- Three scopes: local (`~/.claude.json`, default), **project (`.mcp.json` at repo root, committed)**, user. Transports: stdio, http/`streamable-http`, sse, websocket. `${VAR}` / `${VAR:-default}` expansion in commands/env. Project-scoped servers require per-user approval (`⏸ Pending approval` until the user runs `claude` and trusts the workspace). **Tool search is on by default** — many MCP tools defer-load, so large tool sets no longer blow up context. `MAX_MCP_OUTPUT_TOKENS`, per-server `timeout` available. (https://code.claude.com/docs/en/mcp)

### 9. Headless / CI / GitHub Actions

- `claude -p "prompt"` runs the full agent loop non-interactively; `--output-format text|json|stream-json`, stdin piping, `--allowedTools` and `--permission-mode` to pre-approve; documented fan-out pattern: loop `claude -p` over a generated file list with scoped tools. (https://code.claude.com/docs/en/headless, best-practices)
- **anthropics/claude-code-action@v1**: auto-detects interactive (`@claude` mention) vs automation (prompt provided) mode; `prompt` accepts plain text **or a skill invocation** (`/code-review:code-review ...` after installing plugins via `plugin_marketplaces`/`plugins` inputs); `claude_args` passes any CLI flag (`--max-turns`, `--model`, `--allowedTools`, `--mcp-config`); auth via `ANTHROPIC_API_KEY`, Bedrock (OIDC), or Vertex; explicitly "respects your CLAUDE.md guidelines." Built on the Claude Agent SDK (TS/Python) for custom programmatic integration. (https://code.claude.com/docs/en/github-actions, https://github.com/anthropics/claude-code-action)
- Billing note (possibly volatile): per a June 2026 report, `claude -p`/Agent SDK usage draws from subscription limits after Anthropic paused a separate SDK credit pool on 2026-06-15 — verify before depending on it. (secondary source; not confirmed on anthropic.com)

### 10. Sessions, checkpointing, background tasks

- **Checkpointing**: every prompt creates a checkpoint; `/rewind` (Esc Esc) restores code, conversation, or both, or summarizes from a point; persists across sessions; tracks only Claude's file-tool edits (not bash `rm`/`mv`), "not a replacement for git." (https://code.claude.com/docs/en/checkpointing)
- **Background tasks** keep dev servers etc. running without blocking; part of the autonomy bundle with subagents + hooks. (https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
- Sessions persist and resume (`--continue`, `--resume`, `/rename`); official advice is to treat named sessions like branches per workstream.

## Best practices observed (Anthropic's own, condensed)

1. Context is the binding constraint; everything else follows. `/clear` between tasks, subagents for exploration, `/compact <instructions>`, path-scoped rules and skills to keep startup context lean.
2. Explore → plan (plan mode) → implement → commit; skip planning for one-sentence diffs.
3. Always give a runnable check; escalate from prompt → `/goal` → Stop hook → fresh-context reviewer as autonomy increases.
4. CLAUDE.md ≤ ~200 lines, prune ruthlessly, convert repeated procedures into skills and repeated enforcement into hooks; check it into git so it compounds.
5. Prefer CLIs (`gh`, `aws`) over MCP where possible — most context-efficient integration.
6. For unattended/batch runs: `--allowedTools` scoping, auto mode, adversarial review subagent before calling work done, and evidence over assertion.

## Implications for the starter repo

1. **Single source of truth for agent instructions**: ship `AGENTS.md` as the canonical file (Copilot CLI reads it) plus a two-line `CLAUDE.md` that does `@AGENTS.md` and appends Claude-specific notes. Officially sanctioned, zero duplication. Keep combined always-loaded content under ~200 lines; push everything else into `.claude/rules/` (with `paths:` globs) and skills.
2. **Quality gates belong in hooks, not prose**: implement the language-agnostic gate runner as a script invoked from (a) a `Stop` hook that exits 2 until gates pass (deterministic "don't stop until green", with the 8-block override in mind), (b) a `PostToolUse` formatter hook, and (c) a `PreToolUse` deny hook for protected paths (migrations, main-branch push, deploy commands) — this is exactly the configurable human-approval-point mechanism. The same gate script is what CI and the Copilot side call, keeping parity.
3. **Ship the harness workflows as skills**: `/plan`, `/implement`, `/gate`, `/ship` as `.claude/skills/*/SKILL.md` with `disable-model-invocation: true` on side-effectful ones; a `verify`-style skill encoding the evidence requirement. Skills follow the agentskills.io open standard, improving cross-tool portability.
4. **Adversarial reviewer subagent**: commit `.claude/agents/reviewer.md` (read-only tools, fresh context) and wire the harness loop to require its sign-off before the human approval point — mirrors Anthropic's Writer/Reviewer and adversarial-review guidance.
5. **Memory system must coexist with auto memory**: Claude Code already auto-maintains per-repo `MEMORY.md`. The repo's shared, committed memory (e.g. `docs/memory/` or `.agent/memory/`) should be explicitly referenced from AGENTS.md and updated via a skill/Stop-hook step; optionally point `autoMemoryDirectory` into the repo only with clear tradeoff docs (it's machine-local by design).
6. **CI story**: use `claude-code-action@v1` with `prompt: /<skill>` invocations so the same committed skills drive CI and local runs; `claude -p --output-format stream-json --allowedTools ...` is the primitive for the Node/TS harness's autonomous loop (or the Agent SDK for tighter integration).
7. **Don't over-promise pre-configuration**: workspace trust gates mean cloned-template hooks, project MCP servers, and `allowed-tools` need one-time human acceptance — document this in the template's onboarding step rather than fighting it.
8. **Commit `.mcp.json` sparingly** (project scope, env-var expansion for secrets, no keys), and consider `extraKnownMarketplaces`/`enabledPlugins` in `.claude/settings.json` if the harness ships as a plugin — packaging the whole starter kit as a Claude Code plugin (skills + hooks + agents + MCP in one unit) is a viable distribution alternative to a template repo.

## Sources

- https://code.claude.com/docs/en/best-practices (fetched in full, 2026-07-13)
- https://code.claude.com/docs/en/memory (fetched in full)
- https://code.claude.com/docs/en/hooks (fetched, full reference)
- https://code.claude.com/docs/en/skills (fetched, full reference)
- https://code.claude.com/docs/en/mcp (fetched, full reference)
- https://code.claude.com/docs/en/github-actions (fetched in full)
- https://code.claude.com/docs/en/plugins-reference (fetched)
- https://code.claude.com/docs/en/settings (via search summary)
- https://code.claude.com/docs/en/sub-agents (via search summary)
- https://code.claude.com/docs/en/checkpointing (via search summary)
- https://github.com/anthropics/claude-code-action
- https://github.com/anthropics/claude-plugins-official
- https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously
- Secondary (billing claim, flagged as unverified): aiforanything.io / search-aggregated June 2026 report on Agent SDK credit pool pause
