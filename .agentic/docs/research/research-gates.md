# Human Approval Gates and Safe-Autonomy Boundaries for an Agentic Starter Repo

Research date: 2026-07-13. Sources checked for recency; anything pre-2025 is flagged. "Verified" = read in a primary source at the cited URL; "Inference" = my synthesis.

## Findings

### 1. GitHub-side gates: rulesets are the current primitive, not classic branch protection

- **Verified:** GitHub recommends rulesets over legacy branch protection rules. Rulesets layer (multiple can apply simultaneously), have an "Evaluate" dry-run status, are visible to anyone with read access (so an agent can *see why* it was blocked), and can be **exported/imported as JSON** — which makes them the one natural machine-readable, check-in-able artifact for "the human must approve X" at the repo boundary ([About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [Creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)).
- **Verified:** Practitioner guidance for agent-heavy repos converges on: require PRs (no direct pushes to main), block force pushes and deletions, require status checks, require ≥1 human review, and keep agent PRs small; some AI-specific guidance suggests 2 reviewers for AI-authored changes ([Ancuta, "AI Agents in Your CI/CD: Why GitHub Rulesets Matter"](https://ancuta.org/posts/ai-agents-in-your-ci-cd-why-github-rulesets-matter/), [exceeds.ai](https://blog.exceeds.ai/github-branch-protection/)).
- **Verified:** GitHub's own Copilot coding agent enforces exactly the "agent proposes, human disposes" pattern at the platform level: Copilot **cannot approve or merge its own PRs**; the *user who asked* Copilot to create the PR also cannot count as the required approver; and Actions workflows on agent pushes **do not run until a human clicks "Approve and run workflows"** (an admin can opt out of that last gate per-repo since March 2026) ([Reviewing a PR created by Copilot](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/reviewing-a-pull-request-created-by-copilot), [Changelog 2026-03-13](https://github.blog/changelog/2026-03-13-optionally-skip-approval-for-copilot-coding-agent-actions-workflows/), [Risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)). This is the strongest signal of "industry default": even the platform vendor keeps human merge mandatory by default.

### 2. Deploy approval: GitHub Environments with required reviewers

- **Verified:** Environments support up to 6 deployment protection rules; **required reviewers** (up to 6 users/teams, any one approves), **wait timers**, and **branch restrictions**; a job cannot even read environment secrets until approved; and there is a **"prevent self-review"** toggle so the person who triggered the deploy can't approve it ([Deployments and environments reference](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [Managing environments](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)). Caveat: on Free/Pro/Team plans, required reviewers work **only on public repos** — a real constraint for the "work projects" half of this starter repo's audience on private Team-plan repos (Enterprise removes it).
- **Inference:** Because secrets are withheld until approval, Environments are the *only* GitHub-native gate that actually prevents an agent-triggered workflow from touching production credentials, rather than merely blocking a merge.

### 3. CODEOWNERS as a path-scoped escalation gate

- **Verified:** CODEOWNERS only gates merges when the branch ruleset enables "Require review from Code Owners." Teams use it to force senior/human review on high-blast-radius paths: `/.github/workflows/`, IaC (`/terraform/`), DB migrations, auth/crypto code ([CODEOWNERS guides and 2026 practice write-ups](https://tenthirtyam.org/dispatches/2026/03/25/codeowners-automating-code-review-ownership/), [dev.to CODEOWNERS guide](https://dev.to/eunice-js/a-comprehensive-guide-to-codeowners-in-github-22ga)). OpenSSF's guidance for AI code assistants likewise says sensitive-function changes (crypto, secrets, auth) should always be flagged for human review ([OpenSSF Security-Focused Guide](https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions.html)).
- **Inference:** For a solo-developer template CODEOWNERS is mostly future-proofing, but it costs nothing to ship a commented one that becomes load-bearing the day a second human joins.

### 4. Merge queues and auto-merge

- **Verified:** Merge queues (ruleset option "Require merge queue") serialize merges and re-validate each PR against the latest main — the standard answer to "a burst of agent PRs land faster than CI can re-test them" ([Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)). **Recency note:** as of 2026-03-25, GitHub changed auto-merge so it can only be *enabled* after all PR requirements are already met (previously you could arm it in advance) — automation that pre-arms auto-merge on agent PRs now gets HTTP 422 ([community discussion #190610](https://github.com/orgs/community/discussions/190610)). Any starter-repo script that enables auto-merge must handle this.
- **Verified pattern:** teams that allow label-driven auto-merge do it via a bot-applied `auto-merge-ok` label after compliance checks pass; human review remains the required check that releases the merge ([Mergify blog](https://mergify.com/blog/github-auto-merge-when-native-is-enough)).

### 5. Agent-side permission models

**Claude Code** ([Configure permissions](https://code.claude.com/docs/en/permissions), read 2026-07):
- Rules are `allow` / `ask` / `deny` in `permissions` in settings files; evaluation order is **deny → ask → allow, first match wins**; deny at any settings level beats allow at every other level. Precedence: managed settings > CLI args > `.claude/settings.local.json` > `.claude/settings.json` (project, check-in-able) > `~/.claude/settings.json`.
- Modes: `default`, `acceptEdits`, `plan`, `auto` (auto-approve with background safety checks), `dontAsk` (auto-deny unless allowlisted), `bypassPermissions`. `bypassPermissions`/`auto` can be disabled via `permissions.disableBypassPermissionsMode` / `disableAutoMode`.
- **Crucial for this repo:** *explicit `ask` rules force a prompt even in `bypassPermissions` mode* — so a project can encode "human must approve `git push`" as `"ask": ["Bash(git push *)"]` and it survives YOLO mode. **PreToolUse hooks** are a second policy layer: a hook exiting code 2 blocks the call *before* permission rules, and hook decisions cannot override deny/ask rules. Anthropic's own docs recommend "allow Bash broadly + hook that rejects specific commands" as the hooks-as-policy pattern.
- Workspace-trust: project `allow` rules only apply after the user accepts the trust dialog — a template's shipped allowlist can't silently grant itself capability. (Good: the template is not an attack vector.)

**Copilot CLI** ([Allowing and denying tool use](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools), [Autopilot](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot)):
- `--allow-tool` / `--deny-tool` with syntax like `shell(git commit)`, `shell(git:*)`, `write(path)`, `MyMCP(tool)`; deny always beats allow, even under `--allow-all` (alias `--yolo`). Two layers: `--available-tools`/`--excluded-tools` restrict what the model can *see*; allow/deny gates what runs.
- **Key asymmetry vs Claude Code:** persistent approvals live in the *user-level* `~/.copilot/permissions-config.json`; per the docs, flags are session-only and **there is no repo-committed permissions file** equivalent to `.claude/settings.json` (as of mid-2026; this may change — [issue #307](https://github.com/github/copilot-cli/issues/307) proposes a richer permissions system). Autopilot mode adds `--max-autopilot-continues` as a loop bound.
- **Inference:** a dual-CLI starter repo therefore cannot rely on native config alone for Copilot; it must *generate* Copilot flag sets (or a wrapper script) from its own policy file.

### 6. Progressive autonomy and audit trails

- **Verified:** "Progressive autonomy" — agents start narrow and earn wider permissions based on observed performance/override rates — is now a named pattern with maturity ladders (crawl/walk/run; 5-rung permission ladders) in 2025–2026 agent-governance writing ([MindStudio](https://www.mindstudio.ai/blog/progressive-autonomy-ai-agents-safe-deployment), [Microsoft defense-in-depth blog, 2026-05](https://www.microsoft.com/en-us/security/blog/2026/05/14/defense-in-depth-autonomous-ai-agents/)). Anthropic's auto-mode design encodes it operationally: 3 consecutive or 20 total denials halts the agent and escalates to the human ([Anthropic engineering: auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)).
- **Verified:** commit-trailer attribution is the de-facto audit trail: `Co-Authored-By:` (Claude Code's default), Codex's `commit_attribution`, and layered conventions (`Assisted-by` / `Co-authored-by` / `Generated-by` + human `Signed-off-by`) for regulated teams; trailers are machine-greppable (`git log --grep`/`git interpret-trailers`) and enable policies like "agent-authored PRs need two human approvals" ([Crash Override KB](https://crashoverride.com/resources/knowledge-base/code-ownership/attributing-ai-commits-git), [fabiorehm.com 2026-03](https://fabiorehm.com/blog/2026/03/02/our-coding-agent-commits-deserve-better-than-co-authored-by/)). A `prepare-commit-msg` git hook guarantees the trailer even when the agent forgets.
- **Verified:** [github/safe-settings](https://github.com/github/safe-settings) is the policy-as-code app for org-level settings; ruleset JSON import/export is the lighter-weight per-repo equivalent.

## Best practices observed

1. **Agent proposes, human merges** is the near-universal default; the platform vendor hard-codes it for its own agent (self-approval blocked, initiator's approval doesn't count).
2. **Gates live at three layers** and mature teams use all three: agent-runtime (permission rules + hooks), repo (rulesets + CODEOWNERS + merge queue), and deploy (Environments with required reviewers + self-review prevention).
3. **Deny/ask beat allow everywhere** — both Claude Code and Copilot CLI implement deny-first precedence; safe templates express policy as narrow denies/asks over broad allows rather than exhaustive allowlists.
4. **Wide autonomy only inside containment** (devcontainer/sandbox), with git as the undo mechanism; Anthropic and community guidance agree ("safe YOLO") ([Anthropic sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)).
5. **Every agent action leaves a trailer**, and policy can key off it.
6. **Loop bounds and escalation counters** (max continues, denial thresholds) are the standard runaway-agent backstop.

## Implications for the starter repo

**Single source of truth for approval points.** No cross-tool standard exists (verified absence: Copilot has no repo-level permissions file; agents.md doesn't cover enforcement). Ship an `approvals.yaml` (or a section in the harness config) declaring gates — `merge_to_main: human`, `deploy_production: human`, `force_push: never`, `protected_paths: [.github/workflows/**, migrations/**]`, `agent_max_iterations: N` — plus a generator (`npm run gates:apply`) that compiles it to: `.claude/settings.json` ask/deny rules + PreToolUse hook, a Copilot CLI wrapper emitting `--deny-tool`/`--allow-tool` flags, ruleset JSON applied via `gh api`, CODEOWNERS, and environment config. This is the repo's genuinely novel deliverable; everything downstream is verified-standard.

**Default-on gates:** PR-required main (ruleset JSON: block force push/deletion, require 1 review + status checks, evaluate-mode file for teams); ask-rules for `git push`, `gh pr merge`, deploy commands in `.claude/settings.json` (these survive bypassPermissions — load-bearing fact); deny-rules for `.env`/secrets reads and destructive commands; a `production` Environment template with required-reviewer placeholder and prevent-self-review noted (document the private-repo plan limitation); `prepare-commit-msg` hook injecting agent trailers; commented CODEOWNERS. Default-off but scaffolded: merge queue (overkill solo), 2-reviewer AI rule, auto-merge script (must post-date the 2026-03-25 arming change).

**Progressive autonomy:** implement as named presets in the harness — `supervised` (plan/default mode, everything asks) → `guarded` (allowlist + hooks, human merge) → `autonomous-contained` (bypass/`--yolo` only when the harness detects a container/sandbox; refuse otherwise) — with the harness logging denial/override counts per session to the memory system so the owner has evidence for promoting a project up a level. Mirror Anthropic's escalation counters: halt the loop after N denials.

## Sources

- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
- https://ancuta.org/posts/ai-agents-in-your-ci-cd-why-github-rulesets-matter/
- https://blog.exceeds.ai/github-branch-protection/
- https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/reviewing-a-pull-request-created-by-copilot
- https://github.blog/changelog/2026-03-13-optionally-skip-approval-for-copilot-coding-agent-actions-workflows/
- https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- https://github.com/orgs/community/discussions/190610
- https://mergify.com/blog/github-auto-merge-when-native-is-enough
- https://code.claude.com/docs/en/permissions
- https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools
- https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot
- https://github.com/github/copilot-cli/issues/307
- https://www.anthropic.com/engineering/claude-code-auto-mode
- https://www.anthropic.com/engineering/claude-code-sandboxing
- https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions.html
- https://tenthirtyam.org/dispatches/2026/03/25/codeowners-automating-code-review-ownership/
- https://crashoverride.com/resources/knowledge-base/code-ownership/attributing-ai-commits-git
- https://fabiorehm.com/blog/2026/03/02/our-coding-agent-commits-deserve-better-than-co-authored-by/
- https://github.com/github/safe-settings
- https://www.mindstudio.ai/blog/progressive-autonomy-ai-agents-safe-deployment
- https://www.microsoft.com/en-us/security/blog/2026/05/14/defense-in-depth-autonomous-ai-agents/
