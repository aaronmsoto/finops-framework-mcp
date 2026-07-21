# GitHub Copilot CLI — Terminal Agentic Coding & Cross-Tool Repo Compatibility (as of July 2026)

> **Correction (post-verification):** This report's claim that Copilot CLI has no structured output and no programmatic session resume (see the "loop-drivable" finding and design implication 4 below) was **refuted during fact-checking**: `--output-format json` (JSONL output) and the `--continue` / `-r` / `--session-id` resume flags ARE documented. The harness accordingly drives Copilot CLI with `--output-format json` and parses structured events. See [research-synthesis.md](research-synthesis.md), "Corrections & uncertainties" item 1.

## Findings

### 1. Product identity and status

- **The current tool is GitHub Copilot CLI**, installed as `npm install -g @github/copilot` (also Homebrew, WinGet, shell script, standalone binaries; source/issues at github/copilot-cli). It launched in public preview September 2025 and **reached general availability on February 25, 2026** for all paid Copilot plans (Pro, Pro+, Business, Enterprise). ([GA changelog](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/))
- **The old `gh-copilot` GitHub CLI extension is dead**: it stopped working October 25, 2025 and is retired. Since January 2026, running `gh copilot` inside GitHub CLI actually installs/forwards to the new Copilot CLI. ([deprecation changelog](https://github.blog/changelog/2025-09-25-upcoming-deprecation-of-gh-copilot-cli-extension/), [gh forwarding changelog](https://github.blog/changelog/2026-01-21-install-and-use-github-copilot-cli-directly-from-the-github-cli/)) Any starter-repo docs should reference only `@github/copilot`, never `gh-copilot`.
- Active release cadence: v1.0.70 shipped July 10, 2026; 349 releases total. Notably, per the npm page (July 2026), **Copilot CLI uses Claude Sonnet 4.5 by default**, switchable via `/model` or `--model` (e.g. `gpt-5.2`, `claude-sonnet-4.6`). ([repo](https://github.com/github/copilot-cli), [devleader.ca guide, 2026-07-09](https://www.devleader.ca/2026/07/09/github-copilot-cli-the-complete-guide-to-the-agentic-terminal-agent)) *Model lists/defaults are the most churn-prone claim here — expect staleness within months.*

### 2. Agentic capabilities

At GA, Copilot CLI is a full terminal agent, not a command-suggester ([GA changelog](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/)):
- **Plan mode** (Shift+Tab): clarifying questions → structured implementation plan before edits.
- **Autopilot mode**: autonomous execution without per-action approval ([docs](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot)).
- **Built-in subagents** (Explore, Task, Code Review, Plan) that run in parallel; **custom agents** as `.agent.md` files (e.g. in `.github/agents/`), invoked with `/agent` or `--agent`.
- **Background delegation**: `&` prefix / `/delegate` hands work to the Copilot cloud coding agent.
- **MCP**: GitHub's MCP server built in; arbitrary custom MCP servers supported.
- **Extensibility**: plugins installable from GitHub repos, markdown-based **skills**, session auto-compaction, and **cross-session repository memory**.
- **Review/undo tooling**: `/diff`, `/review`, Esc–Esc undo.

### 3. Instruction files Copilot CLI reads (verified against official docs)

Per [Adding custom instructions for Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions):

| File | Location | Notes |
|---|---|---|
| `AGENTS.md` | repo root, cwd, or dirs in `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` | Primary; root-level AGENTS.md gets "greater influence" than other locations |
| `.github/copilot-instructions.md` | repo root | Repo-wide, Copilot-specific |
| `NAME.instructions.md` | `.github/instructions/**` | Path-scoped; **requires `applyTo` glob frontmatter**; optional `excludeAgent` (`code-review`, `cloud-agent`) |
| **`CLAUDE.md` and `GEMINI.md`** | **repo root only** | Read "for compatibility" |
| `copilot-instructions.md` | `$HOME/.copilot/` | User-level |

Key behaviors: if both `AGENTS.md` and `.github/copilot-instructions.md` exist at root, **both are used** (additive, not either/or). Path-scoped instructions combine with repo-wide ones. **Instruction-file edits are not picked up mid-session** — a restart is required. The [copilot-cli-for-beginners course](https://github.com/github/copilot-cli-for-beginners/blob/main/04-agents-custom-instructions/README.md) explicitly recommends `AGENTS.md` as the cross-platform default.

So yes: **Copilot CLI reads CLAUDE.md natively** (root only). This is verified fact, not inference.

### 4. Permission / approval model

- Interactive default: preview-and-approve every action ("nothing happens without your explicit approval"). Session start prompts to **trust the launch directory**; permanently trusted dirs live in a `trustedFolders` array in the auto-managed `config.json`. ([configure docs](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/configure-copilot-cli))
- Granular control via `--allow-tool` / `--deny-tool` with filter syntax, e.g. `--allow-tool='shell(git:*),write(src/*),read'`; MCP tools addressable as `MCP_SERVER_NAME(tool_name)`. **Deny always beats allow, even under `--allow-all`** or saved approvals in `permissions-config.json`. ([allowing/denying tools](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools))
- File-path and URL scoping: `--add-dir`, `--allow-all-paths`, `--allow-url`/`--allow-all-urls`.

### 5. Non-interactive / programmatic mode

Per the [programmatic reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-programmatic-reference) and [how-to](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically):
- `copilot -p "PROMPT"` runs one prompt and exits; `-s` suppresses decoration for piping; `--no-ask-user` prevents mid-run pauses; `--share=PATH` / `--share-gist` export transcripts; `--secret-env-vars` redacts secrets.
- Approval flags for automation: `--allow-all` (`--yolo`), `--allow-all-tools`, or (recommended) explicit `--allow-tool` lists. Env vars for CI: `COPILOT_ALLOW_ALL`, `COPILOT_MODEL`, `COPILOT_GITHUB_TOKEN`, `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`.
- This makes Copilot CLI loop-drivable from a Node harness roughly like `claude -p`. **Gap vs Claude Code (inference from docs)**: official docs don't document structured JSON output, exit-code semantics, or programmatic session resume — a harness should treat Copilot CLI output as free text plus filesystem/git effects, whereas Claude Code offers `--output-format json`/stream-json.

### 6. Enterprise policy constraints

Per [Administering Copilot CLI for your enterprise](https://docs.github.com/en/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise) and [MCP allowlist enforcement](https://docs.github.com/en/copilot/reference/mcp-allowlist-enforcement):
- Copilot CLI is gated by an **enterprise/org policy** (Enabled everywhere / Disabled / Let orgs decide); Business/Enterprise users need it explicitly enabled plus a Copilot seat.
- **Model access** is admin-controlled (users only see enterprise-enabled models).
- **MCP policies apply to the CLI**: admins can disable MCP entirely, or (since [April 16, 2026](https://github.blog/changelog/2026-04-16-copilot-cli-supports-custom-registry-based-mcp-allowlists/)) enforce a **registry-based allowlist** — runtime blocking of any MCP server not in the org's registry. A starter repo's `mcp-config` may silently fail at work; degrade gracefully.
- `/delegate` requires both the CLI policy and the cloud coding agent policy. Policy changes hit the audit log. IDE content-exclusion policies do NOT apply to the CLI.

### 7. AGENTS.md open standard — adoption status

- [agents.md](https://agents.md/): "a simple, open format for guiding coding agents," used by **60k+ open-source projects**, now **stewarded by the Agentic AI Foundation under the Linux Foundation**. Spec: plain Markdown, no required fields; **nested AGENTS.md supported — closest file to the edited file wins**; explicit chat prompts override everything.
- Supported tools listed on the site: OpenAI Codex, Google Jules, Cursor, Aider, VS Code, Devin, JetBrains Junie, Zed, Warp, GitHub Copilot coding agent, and ~23+ total. Copilot coding agent added support [August 28, 2025](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/); Copilot CLI reads it natively (above).
- **Claude Code does NOT read AGENTS.md** — verified two ways: agents.md's tool list omits Claude, and Anthropic's own docs state it plainly: "Claude Code reads CLAUDE.md, not AGENTS.md." The [official Claude Code memory docs](https://code.claude.com/docs/en/memory) prescribe the exact bridge: a `CLAUDE.md` containing `@AGENTS.md` (import syntax, expanded at session start, 4-hop recursion max), optionally followed by Claude-specific sections; or a symlink `ln -s AGENTS.md CLAUDE.md` — with the caveat that **Windows symlinks need admin/Developer Mode, so the `@AGENTS.md` import is the portable choice**. `/init` in a repo with an existing AGENTS.md incorporates it. (Third-party blogs claiming Claude Code reads AGENTS.md natively are wrong/stale as of July 2026.)

### 8. The convergence answer (key question)

Both tools now define an explicit, officially documented meeting point:

- Copilot CLI's canonical repo instruction file is **AGENTS.md** (recommended by GitHub's own training material), and it *also* reads root CLAUDE.md.
- Claude Code's canonical file is **CLAUDE.md**, with an official `@AGENTS.md` import mechanism.

Therefore: **AGENTS.md is the single source of truth; CLAUDE.md is a 3-line shim** (`@AGENTS.md` + optional Claude-only section). No generation step, no symlinks, no drift. One wrinkle (inference): because Copilot CLI reads *both* root files, it will also ingest the CLAUDE.md shim — the literal `@AGENTS.md` line is inert noise to Copilot, and any Claude-specific section will be visible to Copilot, so keep that section small and clearly headed "Claude Code only." Do not duplicate AGENTS.md content into `.github/copilot-instructions.md`; reserve that file (if used at all) for genuinely Copilot-only guidance, since Copilot loads it *additively* with AGENTS.md.

## Best practices observed

1. **AGENTS.md as canonical, tool shims as pointers** — GitHub's beginners course says "Use AGENTS.md"; Anthropic's docs say import it from CLAUDE.md. Both vendors independently converge here.
2. **Path-scoped instructions exist on both sides but don't share a format**: Copilot uses `.github/instructions/*.instructions.md` with `applyTo` globs; Claude Code uses `.claude/rules/*.md` with `paths` frontmatter. Keep path-scoped rules minimal or accept per-tool duplication for these only.
3. **Least-privilege automation**: community and GitHub guidance both warn against `--allow-all` in CI; enumerate tools (`--allow-tool='shell(git:*),write(src/*)'`). Mirrors Claude Code's `permissions.allow`/`deny`.
4. **Keep root instruction files short** (Claude docs: <200 lines; Copilot: session-restart penalty for edits) and put procedures in skills — both ecosystems now have markdown skills.
5. **Enterprise-aware defaults**: assume MCP may be registry-restricted or disabled at work; make MCP servers optional enhancements, never load-bearing.

## Implications for the starter repo

1. Ship `AGENTS.md` at repo root as the single instruction source (project layout, build/test/lint commands, quality-gate invocation, approval-point conventions, memory-file locations).
2. Ship `CLAUDE.md` containing exactly: `@AGENTS.md` plus a short `## Claude Code` section (hooks/plan-mode notes). Do NOT use a symlink (Windows).
3. For nested/monorepo packages, nested AGENTS.md works for Copilot/Codex/Cursor per the spec; for Claude Code use nested CLAUDE.md shims with relative `@AGENTS.md` imports (imports resolve relative to the importing file).
4. The Node/TS harness should drive Copilot CLI via `copilot -p "..." -s --no-ask-user --allow-tool=<explicit list> --deny-tool=<dangerous>` and parse effects from git/filesystem, not stdout structure; drive Claude Code via `claude -p --output-format json`. Abstract both behind one "agent runner" interface.
5. Encode approval points as deny-rules, not prose: `--deny-tool='shell(git push:*)'` for Copilot; `permissions.deny` for Claude Code — instructions files are advisory, permission systems are enforced.
6. Document enterprise fallbacks: CLI may need org policy enablement; MCP may be allowlisted; model choice may be restricted. Quality gates must run as plain shell commands so they work even with MCP disabled.
7. Keep a `docs/agents/compat.md` note flagging churn-prone facts (default model, flag names, whether Claude Code ever adds native AGENTS.md support) with a "last verified 2026-07" stamp.

## Sources

- https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/
- https://github.com/github/copilot-cli
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-programmatic-reference
- https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically
- https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools
- https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/configure-copilot-cli
- https://docs.github.com/en/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise
- https://docs.github.com/en/copilot/reference/mcp-allowlist-enforcement
- https://github.blog/changelog/2026-04-16-copilot-cli-supports-custom-registry-based-mcp-allowlists/
- https://github.blog/changelog/2025-09-25-upcoming-deprecation-of-gh-copilot-cli-extension/
- https://github.blog/changelog/2026-01-21-install-and-use-github-copilot-cli-directly-from-the-github-cli/
- https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/
- https://github.com/github/copilot-cli-for-beginners/blob/main/04-agents-custom-instructions/README.md
- https://agents.md/
- https://code.claude.com/docs/en/memory
- https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot
- https://www.devleader.ca/2026/07/09/github-copilot-cli-the-complete-guide-to-the-agentic-terminal-agent
