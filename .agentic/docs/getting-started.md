# Getting started

This is the full walkthrough that the [README quickstart](../../README.md#quickstart) summarizes: what you need installed, what each setup step actually does, how to wire GitHub so the approval points are enforced, what your first interactive session looks like in each tool, and how to run your first autonomous loop without surprises. If something goes wrong, the [troubleshooting table](#troubleshooting) at the bottom covers the common failure modes.

## Prerequisites

- **Node.js >= 20** — the harness is ESM TypeScript compiled with `tsc`; Node 20 is the floor.
- **git >= 2.28** — state lives in files and git; the loop commits per task. Commit **identity** is handled for you: `bootstrap.sh` and `init` set `user.name`/`user.email` to the repo owner when it is unset or AI-looking (so the agent never authors commits as an AI — GitHub's stock squash message turns commit authors into co-author trailers, which the integrity gate rejects). They mark the auto-set identity and never overwrite one you chose yourself; override anytime with `git config user.name`/`user.email` for real commit-linking.
- **gh CLI, authenticated** — used by `github-setup.sh`, the `/ship` skill, and PR automation. Optional for the mock-runner dry run.
- **At least one agent CLI, logged in:**
  - Claude Code (`claude`) — sign in once interactively before any headless use.
  - GitHub Copilot CLI (`copilot`) — same; note your organization may gate CLI enablement.
  - You need at least one; you can install both. Neither is needed to dry-run the loop machinery (see the mock runner in [operations.md](operations.md#the-mock-runner)).
- **python3** — only if you use the python preset (ruff, pyright, pytest run in your project, not the harness).

Headless agent runs consume real API or subscription usage. Check your plan before running long loops — see the [cost note in operations.md](operations.md#cost-and-billing).

## Instantiate the template

Use GitHub's **Use this template** button so you get a clean history rather than this repo's. Then clone your new repo. (A plain `git clone` of the template also works if you plan to reset history yourself.)

**Agent-driven alternative:** if an agent session has access to both this template and your new repo (e.g. cloned side by side), it can perform the whole flow — copy, bootstrap, init, verify, push — by following [.agentic/INSTANTIATE.md](../INSTANTIATE.md).

## Bootstrap

```sh
./scripts/bootstrap.sh
```

This does two things:

1. **Builds the harness**: `cd .agentic/harness && npm ci && npm run build`. The harness is self-contained — its only runtime dependency is `yaml` — and compiles to `.agentic/harness/dist/`. Every `./scripts/agentic` invocation is just `node .agentic/harness/dist/cli.js`, so nothing works until this build exists.
2. **Installs git hooks** by pointing `core.hooksPath` at `scripts/git-hooks/`:
   - `pre-push` runs `gates --tier fast`, so you cannot push red.
   - `prepare-commit-msg` strips AI-attribution lines (bot `Co-Authored-By` trailers, session links, `Agent:` trailers, "Generated with ..." footers) from commit messages — this repo's policy is a clean, attribution-free git history, and the integrity gate fails any new commit that still carries one.

Run it once per clone. It is idempotent; rerun it after pulling harness changes.

## Initialize your project

```sh
./scripts/agentic init --name my-project --preset typescript --owner @you
```

Flags:

| Flag | Required | What it does |
|---|---|---|
| `--name <n>` | yes | Sets `project.name` in `agentic.config.json`. |
| `--preset <p>` | yes | Applies a preset from `.agentic/presets/` (`typescript` or `python`), binding the canonical gate names to real commands for your language. |
| `--owner <@handle>` | yes | Sets `owner` in `approvals.yaml`; used by CODEOWNERS generation. |
| `--runner claude\|copilot` | no | Sets the default loop runner in `agentic.config.json` (default `claude`). |
| `--branching trunk\|integration` | no | Sets the branching mode in `approvals.yaml` (default `trunk`) and compiles the matching surfaces. See [operations.md](operations.md#branching-modes). |
| `--license mit\|apache-2.0\|proprietary\|keep` | no | Root LICENSE handling — see [Licensing](#licensing) below. Default `keep` leaves the file untouched and prints a reminder. |
| `--license-holder "<legal name>"` | with mit/apache-2.0 | The copyright holder written into the new LICENSE (and NOTICE for Apache). A GitHub handle is not a legal name. |
| `--fresh` | no | Also clears the example specs in `.agents/specs/` and example design docs (keeps TEMPLATE.html). |

**Interactive wizard:** run `./scripts/agentic init` with flags missing on a real terminal and it prompts for each value with sensible defaults (name from the directory, preset `typescript`, branching `trunk`, runner `claude`, license `keep`, holder from `git config user.name`). Headless runs — agents, CI, the loop — never get prompts: missing flags are a usage error there, so nothing can hang.

### Licensing

The template is MIT-licensed, and its machinery travels inside your project — so the template's MIT notice lives at `.agentic/LICENSE` and stays there. The **root** `LICENSE` is your project's, and `init --license` sets it: `mit` or `apache-2.0` write the standard text (from `.agentic/licenses/`) with your name and year (`apache-2.0` also writes a `NOTICE` file, per Apache convention); `proprietary` deletes the root LICENSE and sets `package.json` to `UNLICENSED`; `keep` (the default) changes nothing and reminds you that the file still names the template author — deleting or rewriting a license is never done silently.

Beyond writing config, `init` copies the preset's starter files (tsconfig/eslint/vitest configs and a hello-world src+test for TypeScript; pyproject and equivalents for Python — only where files don't already exist), **prints the preset's setup steps** (the dependency installs to run next), seeds three onboarding tasks (T-001..T-003), resets the memory bank and journal to templates, sets the branching mode (default trunk), runs `approvals compile`, and installs git hooks. Commit the result — the generated files (`CODEOWNERS`, `scripts/copilot.sh`, the ruleset JSON, the permission arrays in `.claude/settings.json`) are meant to be committed and reviewed like any other code.

Then edit `AGENTS.md`: replace the "What this project is" section with 3-6 lines about your project. Keep the whole file ~150 lines (`memory lint` warns past 170).

## Wire up GitHub

The compiler generates the artifacts; GitHub still needs them applied once.
Repo settings are configuration, not content — nothing in this section
transfers with "Use this template" or a clone.

**The fast path:** with the [gh CLI](https://cli.github.com) authenticated as
the repo owner, run

```sh
./scripts/github-setup.sh          # --dry-run to preview
```

It enables auto-merge, sets the squash-merge message default to "PR title and
description" (GitHub's stock squash message synthesizes co-author trailers
from branch commit authors — agent attribution that the integrity gate then
rejects), allows Actions to create pull requests (required by the rolling
release PR in integration mode), and imports the ruleset(s) matching your
branching mode. It is idempotent and prints what stays manual. Agents may run
it where `gh` is available; remote/hosted agent sessions often lack `gh`, in
which case relay the checklist below to the owner.

The manual equivalents, if you prefer clicking:

**Import the ruleset.** Settings → Rules → Rulesets → New ruleset → Import a ruleset → pick `.github/rulesets/main-branch.json`. This requires a PR with one human review and the `gates-fast` status check on main, and blocks force pushes and branch deletion. Note that exported/imported ruleset JSON excludes bypass lists — review the imported ruleset's bypass configuration by hand. **Solo-owner trap:** GitHub never lets a PR author approve their own PR — when agents open PRs under *your* account, nobody can satisfy the review requirement. Add yourself to the ruleset's bypass list (your merges bypass the review rule; agent pushes to main are still blocked), or run agents under a separate machine account.

**Required status check.** The ruleset names `gates-fast`, which is the CI job that runs on every `pull_request` and push to main (`.github/workflows/ci.yml`). The check must have reported at least once before GitHub's UI offers it — push a branch and open a PR if it doesn't appear.

**Optional: merge queue.** If you enable a merge queue, the `gates-full` job (which listens to `merge_group`) becomes the queue's required check. CI *must* listen to `merge_group` or queued PRs never report — this is a documented setup trap, and the workflow already handles it.

**Optional: Environments for deploys.** If agents can reach deployment at all, create a `production` Environment with required reviewers and prevent-self-review. Environment secrets are withheld until approval — the only GitHub-native gate that keeps agent workflows away from production credentials. Caveat: required reviewers on private repos may need a paid (Enterprise) plan.

**CODEOWNERS.** Generated by the compiler: `* @you` when `merge_to_main: human`, plus one line per protected path. It takes effect once the ruleset requires review — GitHub then requests your review on any PR touching those paths, including PRs that try to change the policy itself.

See [approvals.md](approvals.md) for what each surface enforces and why.

## Your first interactive session

**Claude Code.** Run `claude` in the repo root. On first open you get the workspace trust dialog — a cloned repo cannot pre-approve its own hooks and permissions, so this one-time confirmation is expected (and a feature: deny/ask rules apply even before trust; allow rules and hooks activate after it). Once trusted, the SessionStart hook runs `agentic memory show --session-start`, injecting the memory bank summary so the session starts oriented. Claude reads `CLAUDE.md`, which is just `@AGENTS.md` plus a few Claude-specific lines, and discovers the skills in `.claude/skills/`.

**Copilot CLI.** Run `./scripts/copilot.sh` instead of bare `copilot` — the wrapper is the policy carrier, injecting the compiled `--deny-tool` flags (Copilot has no repo-committed permissions file). Copilot reads `AGENTS.md` natively and reads the same `.claude/skills/` SKILL.md files. It has no SessionStart hook, so the session protocol in `AGENTS.md` tells it to read the memory files itself — same protocol, prompt-enforced instead of hook-enforced.

In either tool, try a small task end to end: describe a change, let the agent make it, and confirm it runs `./scripts/agentic gates` before committing. For anything spec-sized, invoke `/plan-feature`.

## Your first autonomous loop

Start supervised and small:

```sh
./scripts/agentic loop --max-iterations 3
```

Flags can only *lower* the caps in `approvals.yaml` (defaults: 10 iterations, 120 minutes, 3 consecutive failures) — you cannot ask for more than policy allows. While it runs, watch the journal from another terminal:

```sh
ls -t .agents/journal/ | head -3   # then tail -f the loop run's file
```

The loop run writes its own dated file in `.agents/journal/`; each iteration appends a section: iteration number, task, outcome, gate summary, duration. When the loop exits, `./scripts/agentic status` gives the one-screen summary, and the exit code tells you the terminal state: `success` (0), `budget_exhausted` (1), or `blocked` (1, with `.agents/BLOCKED.md` explaining why). [operations.md](operations.md#the-autonomous-loop) covers reading `BLOCKED.md`, recovering, and resuming after budget exhaustion.

To try the machinery without spending agent tokens, use the mock runner: `--runner mock` with `AGENTIC_MOCK_SCRIPT` pointing at a script that simulates the agent's edits.

## Your first green PR

Three things adopters commonly hit on PR one:

1. **CI installs your project's dependencies automatically** — `ci.yml` runs
   `npm ci`/`npm install` at the root when a `package.json` exists (the
   harness has its own). Python projects: add a `pip install` step to both
   jobs in `ci.yml` — as the human owner you are allowed to edit workflows;
   the "never edit" hard rule binds agents, not you.
2. **`gates-fast` only becomes selectable as a required check after it has
   reported once** — push a branch and open a PR, then wire the ruleset.
3. **The local integrity gate needs an `origin` remote** to diff against
   (`origin/main` or your integration branch); until you've added one it
   prints a skip notice and CI is your anti-gaming coverage.

## Optional: integration branching (autonomous merges to dev)

If you want agents to integrate continuously without waiting on you: set
`branching.mode: integration` in `approvals.yaml`, run `./scripts/agentic
approvals compile`, create a `dev` branch, enable **Allow auto-merge** in repo
settings, and import both rulesets from `.github/rulesets/`. Task branches
then auto-merge into `dev` on green CI, and you review one rolling
"Release: dev → main" PR at your own pace. Details in .agentic/docs/operations.md.

**Squash-message trap:** also set Settings → General → Pull Requests →
Default commit message → **"Default to pull request title and description"**.
GitHub's built-in default squash message appends `Co-authored-by:` trailers
for every PR commit author — when agents author the commits, that plants AI
attribution in your history, which the integrity gate then fails on the next
release PR. The setting fixes server-side auto-merges; anyone squash-merging
through the API must likewise pass an explicit commit body, never the default.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `./scripts/agentic` fails with a missing `.agentic/harness/dist/cli.js` | Harness not built | Run `./scripts/bootstrap.sh` (or `cd .agentic/harness && npm ci && npm run build`). |
| Gates red right after `init` | Your project's toolchain isn't installed yet — presets bind gates to tools like eslint/vitest/ruff that `init` tells you to install | Follow the **preset setup steps `init` printed** (rerun `./scripts/agentic init ...` to see them again, or read `.agentic/presets/<name>.json` `setup`). Gates put `node_modules/.bin` on PATH, so a plain dev-dependency install is enough. |
| A hook blocked an edit to `approvals.yaml`, `.claude/settings.json`, or another protected file | The PreToolUse protect-policy hook is doing its job | Read the hook's message. If you (the human) intend the edit, use the supervised override described in [approvals.md](approvals.md#changing-the-policy); never have the agent work around the hook. |
| Loop exited `blocked` | 3 consecutive failed iterations on a task | Read `.agents/BLOCKED.md` (failing task, last errors, gate output). Fix the underlying problem or re-scope the task, reset it via `tasks`, and rerun. |
| Loop exited `budget_exhausted` mid-feature | Iteration or wall-clock cap hit | Expected behavior, not an error. Review what landed, then simply run `agentic loop` again — state is in files and git, so it picks up the next pending task. |
| `approvals check` fails in CI | A generated surface was edited by hand, or `approvals.yaml` changed without recompiling | Edit `approvals.yaml` only, run `./scripts/agentic approvals compile`, commit all regenerated files together. |
| `npm ci` fails behind a corporate proxy | bootstrap and CI need npm registry access | Configure npm's proxy (`npm config set proxy/https-proxy`) or an internal registry mirror; there is no offline mode. |

Next: [operations.md](operations.md) for day-to-day flows, or [quality-gates.md](quality-gates.md) to understand what "gates green" means.
