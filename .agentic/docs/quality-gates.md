# Quality gates

Gates are **data, not scripts scattered across configs**: named commands declared once in `agentic.config.json` and executed identically by the agent's loop, your pre-push hook, and CI — so "green locally" predicts "green in CI," and an agent cannot pass one checker while failing another. This doc covers the gate schema and tiers, language presets, diff coverage, the anti-gaming integrity gate, and the two documented opt-ins (mutation testing and advisory LLM review).

## Gates as data

The `gates` section of `agentic.config.json` is an ordered map of name → gate:

```jsonc
"gates": {
  "lint":      { "command": "cd .agentic/harness && npm run lint",      "tier": "fast" },
  "typecheck": { "command": "cd .agentic/harness && npm run typecheck", "tier": "fast" },
  "test":      { "command": "cd .agentic/harness && npm run test",      "tier": "fast" },
  "integrity": { "command": "node .agentic/harness/dist/cli.js integrity",   "tier": "fast" },
  "memory":    { "command": "node .agentic/harness/dist/cli.js memory lint", "tier": "fast" },
  "build":     { "command": "cd .agentic/harness && npm run build",     "tier": "full" }
}
```

Each gate takes a `command` (run via `sh -c` from the repo root), a `tier` (`fast` or `full`), an optional `optional` flag (an optional gate with no command is skipped with a notice instead of failing), and a `timeoutSeconds` (default 600).

```sh
./scripts/agentic gates                    # fast tier (the default everywhere)
./scripts/agentic gates --tier full        # full tier
./scripts/agentic gates --tier all         # everything
./scripts/agentic gates lint test          # just the named gates
```

Gates run in declared order; by default all of them run and failures are reported together (`--fail-fast` stops at the first hard failure). Per-gate pass/fail and durations print to the terminal, and a machine-readable report lands in `.agents/.cache/gates-report.json` — this is what `status`, `tasks complete`, and the loop read.

**Canonical gate names** — presets bind these; extra names are allowed: `format`, `lint`, `typecheck`, `test`, `coverage`, `integrity`, `memory`, `designs`, `security`, `build`, `e2e`.

## Tiers, and the three places gates run

- **`fast`** — the sub-five-minute set that runs constantly: every loop iteration (the harness checks it after each agent process, and `tasks complete` refuses without it), the `pre-push` git hook, and the `gates-fast` CI job on every `pull_request` and push to main.
- **`full`** — the expensive set (`build`, integration, `e2e`): the `gates-full` CI job on `merge_group` (the merge queue tests the tentative merge commit), and manually via `--tier full` before shipping.

All three surfaces invoke the *same names through the same command* (`agentic gates`), which is the whole point: there is exactly one definition of "passing."

## Presets and adding a language

`.agentic/presets/typescript.json` and `.agentic/presets/python.json` bind the canonical names to real toolchains — TypeScript: eslint / tsc / vitest with LCOV coverage output; Python: ruff / pyright / pytest with Cobertura (`coverage.xml`) output. `./scripts/agentic init --preset <p>` applies one.

Adding a language is one preset file: bind the canonical names to your toolchain's invocations and declare which coverage format it emits. Nothing in the harness is language-specific — it runs shell commands and reads exit codes. See `.agentic/presets/README.md`.

The `integrity` and `memory` gates are harness-provided and preset-independent; every preset carries them.

## Diff coverage and the ratchet

Global coverage thresholds punish you for other people's old code; a fixed number invites gaming. The template's approach, documented and optional by default:

- **Diff coverage** via [diff-cover](https://github.com/Bachmann1234/diff_cover): only the lines your PR touched must be covered. diff-cover consumes Cobertura, Clover, JaCoCo, and LCOV, so the one `coverage` gate works across every preset. The presets ship `coverage` as an **optional placeholder without a command** — you activate it by installing diff-cover and setting `gates.coverage.command` to the exact line each preset's `setup` steps provide (see `.agentic/presets/README.md`). Until then it is skipped with a notice, and an optional gate whose bound command is not installed (exit 127) is skipped the same way.
- **The ratchet philosophy**: instead of a fixed global threshold, store the current high-water mark in the repo and fail on decrease. Coverage can only stay level or rise, no one argues about the magic number, and an agent cannot quietly erode it — a decrease is a red gate, and changing the stored mark is a visible diff in review.

## The integrity gate

`./scripts/agentic integrity [--base <ref>] [--strict]` — the anti-gaming diff check, run against `--base` (default `origin/main`; it skips gracefully when the base is unresolvable, e.g. a fresh unfetched clone). Reward hacking by coding agents is a confirmed phenomenon ([research-synthesis.md](research/research-synthesis.md), "Quality & verification harness"), and this gate is the deterministic twin of the "never weaken tests" rule in [AGENTS.md](../../AGENTS.md).

**Hard failures** (always red):

- Deleted test files in the diff.
- Focus markers: `.only(`, `fit(`, `fdescribe(` — the classic way to make a suite "pass" by running one test.
- AI-attribution markers in new commit messages (bot `Co-Authored-By` trailers, session links, "Generated with" footers).
- Append-only history violations: modifying or deleting another session's `.agents/journal/` file (README exempt), or removing lines from `decisions.md`.

**Warnings** (red only with `--strict`):

- Decreased test-callsite count — fewer assertions after the change than before.
- Diffs that mix implementation changes with edits to `tests/**` or to gate/policy config (`agentic.config.json`, `approvals.yaml`, workflows).
- Commit subjects over 72 characters (Merge commits exempt).

The warn tier is deliberate — call it the **label-override philosophy**: flag-for-review beats hard-forbid. A hard ban on touching tests and implementation together would outlaw TDD and honest refactors; a flag routes the diff to a human who spends ten seconds confirming the test change is legitimate. The hard failures are reserved for patterns with essentially no honest reading. CI runs the gate with the PR's actual base (`--base origin/${{ github.base_ref }}`), and the protected-paths layer in [approvals.md](approvals.md) ensures a human reviews anything the gate flagged.

## Opt-in: mutation testing

Coverage measures *execution*; mutation testing measures whether your assertions would *notice a bug* — it is the gate for assertion quality, complementary to coverage, and the most expensive gate in the stack, which is why it ships documented but off by default.

When you enable it, run it **diff-scoped on PRs** (mutate only changed code — feedback where it is actionable) plus a **scheduled full-scope run** with a score threshold. Nightly-only cadence gets ignored; per-PR full-scope is unaffordable — diff-scoped-plus-scheduled is the resolved recommendation from the research. Tooling per preset: [Stryker](https://stryker-mutator.io/) for TypeScript (supports incremental analysis), [mutmut](https://mutmut.readthedocs.io/) for Python. Wire it as a `full`-tier gate or a separate scheduled workflow.

## Opt-in: LLM review (advisory only)

`.github/workflows/claude-review.yml` runs an advisory Claude code review. It ships `workflow_dispatch`-only, with a pinned action version and minimal token permissions, and it must **never become a required check**:

- LLM review is probabilistic; a required check must be deterministic or it becomes either a rubber stamp or a random merge blocker. Anthropic's own review action completes neutral by design.
- Review actions that read PR content are **prompt-injection attack surface** — a malicious PR body or diff can steer the reviewing model. Real vulnerabilities have shipped and been fixed in this class of tooling ([research-synthesis.md](research/research-synthesis.md)), hence: pin the action version, grant the fewest permissions that work, and treat its output as one more comment, not a verdict.

The deterministic gates are the floor; LLM review is commentary on top.

Related: [operations.md](operations.md) for how the loop consumes gate results, [approvals.md](approvals.md) for the protected paths that keep gate definitions themselves under review, and [architecture.md](architecture.md#quality-gates--ci) for the normative CI contract.
