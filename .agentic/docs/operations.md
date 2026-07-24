# Operations

The operator's manual for a repo built from this template: how day-to-day work flows through interactive sessions and tracked tasks, how to run and recover the autonomous loop, when to spend ceremony on specs and when not to, how to dial autonomy up as trust grows, and how the two agent CLIs differ in practice. Setup is covered in [getting-started.md](getting-started.md); the policy and gate systems have their own docs ([approvals.md](approvals.md), [quality-gates.md](quality-gates.md)).

## Day-to-day flows

### Interactive sessions

Most work happens in a plain Claude Code or Copilot CLI session. The session protocol in [AGENTS.md](../../AGENTS.md) governs both tools:

1. **Orient** — read `.agents/memory/MEMORY.md` and `activeContext.md`, then `git log --oneline -10`. Claude Code does this automatically (SessionStart hook); Copilot follows the prompt protocol.
2. **Work** — one task at a time, never two in one session.
3. **Verify** — `./scripts/agentic gates` before every commit; run the affected behavior, don't just read the diff.
4. **Record** — update `activeContext.md` (and `decisions.md` for real decisions), write your session file in `.agents/journal/`, commit once per task.
5. **Complete** — for tracked tasks, `./scripts/agentic tasks complete <id> --summary "..."`.

When you end a session mid-stream, `/handoff` writes `activeContext.md` and a journal entry so the next session (yours or the loop's) starts oriented.

### Tracked tasks

Anything bigger than a drive-by fix goes through `.agents/tasks.json`:

```sh
./scripts/agentic tasks list          # all tasks by state
./scripts/agentic tasks next          # first pending task
./scripts/agentic tasks start T-004
./scripts/agentic tasks complete T-004 --summary "..."
./scripts/agentic tasks validate      # re-verify the hash chain
```

`tasks add` is normally driven by the `/plan-feature` skill rather than typed by hand — every task needs non-empty acceptance criteria. `complete` refuses unless the fast-tier gates pass, then extends the hash chain with the evidence (gate result, summary, commit SHA, verifier, timestamp). Editing `status` by hand breaks the chain, and `tasks validate` / `verify` / CI will catch it. To take a task off the board legitimately, use `tasks block`.

### The autonomous loop

```sh
./scripts/agentic loop [--mode build|plan] [--runner claude|copilot|mock] \
                       [--max-iterations N] [--max-minutes M] [--no-verify] [--task <id>]
```

**Modes.** `build` (default) works through pending tasks using the `.agents/prompts/build.md` preamble; `plan` uses `plan.md` to produce/refine plans and tasks instead of implementing.

**Runners.** `claude` (default, set in `agentic.config.json`), `copilot` (via the guarded `scripts/copilot.sh` wrapper), or `mock`. Each iteration spawns a **fresh process** — the loop never resumes a session, because fresh context per iteration is what keeps long runs from drifting.

**Caps.** Hard caps live in `approvals.yaml` (`loop:` section): `max_iterations: 10`, `max_wall_minutes: 120`, `max_consecutive_failures: 3` by default, and those defaults apply even if the section is missing. `--max-iterations` and `--max-minutes` may only *lower* them. There is no flag to raise a cap — raising a cap is a policy change, made in `approvals.yaml`, which is a protected path that goes through owner review.

**What the harness checks each iteration.** After the agent process exits, the harness independently verifies: fast-tier gates green, hash chain valid, a new commit exists, exactly one task moved. The agent's own claims are ignored. Then (unless `--no-verify`) a second fresh process runs `.agents/prompts/verify.md` against the task and its evidence and must print `VERDICT: pass` or `VERDICT: fail`. A `fail` reverts the task to `pending` and counts as a failed iteration. `--no-verify` skips only this second step, never the deterministic checks — use it for trivial batches, not as a habit.

**Terminal states.**

- `success` (exit 0) — no pending tasks, gates green, chain valid.
- `budget_exhausted` (exit 1) — iteration or wall-clock cap hit. Not an error: review what landed (`agentic status`, the journal, `git log`), then run `agentic loop` again; state is entirely in files and git, so it resumes from the next pending task.
- `blocked` (exit 1) — `max_consecutive_failures` reached. The harness writes `.agents/BLOCKED.md` with the failing task, the last errors, and gate output, and marks the task `blocked`.

**Recovering from `blocked`.** Read `.agents/BLOCKED.md` first — it usually names the real problem (a broken dependency, an underspecified acceptance criterion, a genuinely hard bug). Fix the environment or re-scope the task in an interactive session, move it back to pending via the `tasks` commands, delete `BLOCKED.md`, and rerun. Do not just rerun the loop and hope: three honest failures in a row means something outside the agent's reach is wrong.

**With `--json`**, the loop emits machine-readable output including a `state` field with the terminal state — useful when a scheduler or wrapper script drives it.

#### Headless runner prerequisites

The live runners inherit whatever permission state the machine already has — the harness never passes a bypass flag itself:

- **Claude runner**: spawns `claude -p <prompt> --output-format stream-json --verbose`. The workspace must have been **trusted once interactively** and the session's permission mode must allow edits/Bash in `-p` mode, or every iteration fails with "no new commit was created". Extra CLI flags (e.g. a permission mode appropriate to your autonomy comfort) go in the `AGENTIC_CLAUDE_ARGS` environment variable, appended verbatim to the spawn.
- **Copilot runner**: spawns `./scripts/copilot.sh -p <prompt> --output-format json -s --no-ask-user`; requires `copilot` logged in and org-enabled. Extras go in `AGENTIC_COPILOT_ARGS`.
- **Both**: git identity must be configured (the loop's commit-per-task check fails without it), and headless runs consume real API/subscription usage.

##### Headless container profile

Running the claude runner as **root inside an isolated container** (CI images,
cloud agent sandboxes) needs two things together:

```sh
IS_SANDBOX=1 AGENTIC_CLAUDE_ARGS="--dangerously-skip-permissions" ./scripts/agentic loop ...
```

`--dangerously-skip-permissions` alone is refused when running as root/sudo
("cannot be used with root/sudo privileges for security reasons") — that
refusal prints to stderr and surfaces in the preflight failure message.
`IS_SANDBOX=1` tells the CLI it is inside a disposable sandbox, which lifts
the root restriction. Use this profile **only** in containers whose blast
radius you accept: the flag disables all permission prompts. On a trusted
developer machine, prefer trusting the workspace once interactively and a
narrower permission mode in `AGENTIC_CLAUDE_ARGS` instead.

**The preflight probe catches these first.** Before the first iteration, the loop runs a one-time probe (phase `preflight`): it asks the runner to write a gitignored sentinel file and checks it appeared. If the CLI is missing, hangs, or runs but cannot edit (untrusted workspace / edit-denying permission mode), the loop stops immediately with a `CliError` that names the exact symptom and the fix — instead of burning the full consecutive-failure budget on identical "no new commit" iterations. Pass `--skip-preflight` to bypass it (e.g. when you have already proven the runner this session). The probe costs one cheap agent call; it is far cheaper than the failures it prevents.

Before the first long run, prove the chain with one `--max-iterations 1` live iteration and read the journal entry it writes.

#### The mock runner

`--runner mock` executes the script in `$AGENTIC_MOCK_SCRIPT` in place of an agent, treating its stdout as the agent's final message. This makes the entire loop — prompt composition, gate checks, chain validation, verification, journaling, terminal states — testable and demoable with zero agent CLI installed and zero token spend.

**The mock contract** (the loop judges the mock exactly like a real agent, so a do-nothing script fails every iteration by design): the script runs twice per iteration, distinguished by `AGENTIC_LOOP_PHASE`. In the **build** phase it must behave like a compliant agent — make the change, commit it, and run `./scripts/agentic tasks complete "$AGENTIC_TASK_ID" --summary "..."` (the selected task id is in `$AGENTIC_TASK_ID`). In the **verify** phase (`AGENTIC_LOOP_PHASE=verify`) it must print a final `VERDICT: pass` or `VERDICT: fail` line. The loop also prints this contract at startup when the mock runner is selected. A minimal compliant script:

```sh
if [ "$AGENTIC_LOOP_PHASE" = "verify" ]; then echo "VERDICT: pass"; exit 0; fi
echo change >> notes.txt
git add -A && git commit -m "Make the change"
./scripts/agentic tasks complete "$AGENTIC_TASK_ID" --summary "changed notes.txt"
```


```sh
AGENTIC_MOCK_SCRIPT=./my-fake-agent.sh ./scripts/agentic loop --runner mock --max-iterations 2
```

Use it to dry-run the machinery, to rehearse recovery flows, and in CI tests of your own loop wrappers.

## The effort dial

Heavyweight process on small tasks is the measured, universal criticism of spec-driven templates (see [the research](research/research-synthesis.md)), so ceremony here is proportional:

- **Small fix** (typo, small bug, mechanical refactor): no spec, no task entry required. Interactive session, gates, one commit.
- **Medium change** (new function/endpoint, contained refactor): a task with acceptance criteria via `tasks add` or `/plan-feature`; no full spec.
- **Large feature** (multi-session, design choices): full dial — write a spec in `.agents/specs/` (from `TEMPLATE.md`), run `/plan-feature` to derive a plan and tasks, and **stop for the human spec checkpoint before any implementation**. A bad spec industrializes bad code; the checkpoint is where you catch it cheaply. Plans are disposable — if reality diverges, regenerate the plan rather than patching a drifting one.

## Progressive autonomy

Three named presets, in increasing order of trust:

1. **supervised** — interactive sessions with plan mode; you watch every step and approve permission prompts as they come. Where every new project starts.
2. **guarded** (the default) — the autonomous loop with default caps, the compiled ask/deny rules active, and a human merging every PR. This is the template's steady state: the agent proposes, gates verify, you merge.
3. **autonomous-contained** — higher caps and permissive modes (`bypassPermissions` for Claude, `--allow-all` via the wrapper for Copilot), permitted **only inside a container or sandbox**. Two reasons for the container requirement: a runaway agent can only damage the disposable environment, and — the load-bearing property — the compiled policy still holds even there, because Claude `ask` rules survive `bypassPermissions` and the wrapper's `--deny-tool` flags beat `--allow-all`. YOLO mode loosens *tool* friction; it does not loosen *approval points*.

Promotion between presets is a judgment call backed by evidence: a run of clean loops, few gate failures, no integrity flags.

## Working with both tools

- **Claude Code:** run `claude`. Hooks handle memory injection and policy protection; the `reviewer` subagent (`.claude/agents/reviewer.md`) does read-only verification.
- **Copilot CLI:** run `./scripts/copilot.sh`, never bare `copilot`, for any work in this repo — the wrapper *is* the repo's policy on the Copilot side. It passes all your arguments through and appends the compiled deny flags.
- Both read `AGENTS.md` (Copilot natively; Claude via the `CLAUDE.md` shim) and the shared skills in `.claude/skills/`. Nothing Copilot needs lives only in `CLAUDE.md` — coexistence behavior is unverified upstream, so the shim stays tiny.
- **Session resume** (`claude -r` / Copilot `--continue`) is for debugging a session you were just in — inspecting what an agent did and why. The loop never resumes sessions; fresh context per iteration is a design invariant, not a limitation.

## Cost and billing

Headless runs (`claude -p`, `copilot -p`) draw real API or subscription usage, and a 10-iteration loop is 10+ full agent sessions plus verifier sessions. Reports that `claude -p` draws from subscription plan limits were **not verified** by our research (flagged in [research-synthesis.md](research/research-synthesis.md), correction 15) — check your own plan and billing dashboard before scheduling long or recurring loops, and start with `--max-iterations 3` while you calibrate cost per iteration.

## FAQ

**The loop finished `success` — is the work merged?** No. `success` means tasks done, gates green, chain valid — on a branch. Merging to main is a human approval point; use `/ship` to open the PR and review it yourself.

**Can I run the loop on main?** Work on a branch. The ruleset blocks direct pushes to main anyway once imported, and the PR is where your review happens.

**An iteration "completed" a task but the verifier failed it. Lost work?** No — the commit history remains; the task reverts to `pending` and the next iteration (or you) can fix it properly. Check the journal entry for the verifier's reasoning.

**Why did `tasks complete` refuse?** Fast-tier gates failed. Run `./scripts/agentic gates` to see which; the report is in `.agents/.cache/gates-report.json`.

**Can the agent change its own caps or gates?** Not silently. `approvals.yaml`, `agentic.config.json`, `.claude/settings.json`, and workflows are protected paths: hook-blocked in-session, CODEOWNERS-gated at merge, and drift-checked by `approvals check` in CI. See [approvals.md](approvals.md).

**How do I see what happened while I was away?** `./scripts/agentic status`, then the newest files in `.agents/journal/`, then `git log`. That order — summary, narrative, diff.

## Defining new features (the design pipeline)

Execution starts at the loop, but features start upstream:

1. **Capture intent** in `.agents/roadmap.md` — one paragraph per feature,
   statuses `idea → designing → specced → building → done`. Small fixes skip
   this entirely (effort dial).
2. **Design** with the `design-feature` skill: it scaffolds
   `./scripts/agentic design new <slug>` and produces a rich, self-contained
   HTML design doc (`docs/designs/<slug>.html` — tabs, collapsible depth,
   inline SVG diagrams and mockups) plus the companion markdown spec. Design
   docs must render with zero network; the `designs` gate enforces no external
   resources or network calls, which is also the privacy guarantee — nothing
   is ever hosted publicly.
3. **Review privately**: `./scripts/agentic serve` then open
   `http://127.0.0.1:4177/docs/designs/<slug>.html` (server binds to
   127.0.0.1 only), or open the file directly — it is self-contained. Owners
   with an internal renderer can wire `designs.publishCommand` in
   `agentic.config.json` and use `./scripts/agentic design publish <slug>`.
4. **Approve, then plan**: the design review is the human checkpoint. After
   approval, `/plan-feature` decomposes the spec into tasks and the loop
   builds. The HTML design is rationale; the markdown spec is the contract
   the loop and verifier enforce — on conflict, the spec wins.

Format rule repo-wide: **markdown for machine contracts** (specs, memory,
prompts, instruction files — agent-consumed, GitHub-rendered), **HTML for
design docs only** (owner-consumed, layout-rich). See
`docs/designs/design-pipeline.html` for the pipeline's own design doc.


## Branching modes

Set once in `approvals.yaml` (`branching:`), then `./scripts/agentic approvals compile`:

- **trunk (default).** Feature branch → PR to `main` → human review merges.
  Simplest; right for solo projects and low agent volume.
- **integration.** Task branches (`task/<date>-<slug>` or your prefix) → PR to
  `dev` with auto-merge armed (`gh pr merge --auto --squash`) → lands
  automatically when `gates-fast` is green — no human in that hop. Merge
  methods are ruleset-enforced: **squash-only into dev** (linear, one commit
  per task) and **merge-commit-only for dev → main** (each release is a real
  merge point preserving the squashed task history). A rolling **"Release: dev →
  main"** PR (maintained by `release-pr.yml` on every dev push, with commit
  list and diffstat) is the single human review surface; merge it whenever you
  want to release. One iteration = one task branch = one PR; agents never
  touch the rolling PR.

  One-time GitHub setup: enable **Allow auto-merge** (repo settings), create
  the `dev` branch, import both generated rulesets (`main-branch.json`,
  `integration-branch.json`). The per-session journal files exist precisely so
  parallel auto-merges into dev never conflict.
