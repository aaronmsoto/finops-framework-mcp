# Verification and Quality Harness for Agent-Written Code

Research dimension for the agentic starter repo sweep. Date of research: 2026-07-13. All capability claims checked against 2025–2026 sources where possible; staleness flagged inline.

## Findings

### 1. CI design for high-volume agent PRs: two tiers + merge queue

The consensus pattern for repos absorbing many agent PRs is **tiered CI fronted by a GitHub merge queue**:

- **Tier 1 (every push, minutes):** lint, format check, typecheck, unit tests. Cheap, fast, gives the agent loop a signal it can iterate against.
- **Tier 2 (merge queue only, `merge_group` event):** integration/E2E tests, build validation, run against the tentative merge commit on `gh-readonly-queue/main/*` refs. You only pay full CI cost for PRs actually about to land, and each PR is tested against the future state of main — critical when many agent PRs land concurrently (verified: [GitHub merge queue docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue); real-world tiered write-up: [Human Who Codes, April 2026](https://humanwhocodes.com/blog/2026/04/improving-developer-velocity-github-merge-queue/)).
- Merge queues support **batching** (test several queued PRs in one CI run) which is specifically valuable at agent-PR volume ([Mergify](https://mergify.com/learn/merge-queue)). CI workflows must be updated to trigger on `merge_group` or required checks never report in the queue — a common setup trap ([GitHub community discussion #151100](https://github.com/orgs/community/discussions/151100)).

Inference: for a starter repo, "merge to main" as a human approval point composes cleanly with a merge queue — the human approves, the queue enforces gates against the real merge state.

### 2. The quality-gate stack: what's proven vs. what's aspirational

**Proven, cheap, high-leverage (Tier 1):** format, lint, typecheck, unit tests. Anthropic's own guidance calls linting "an excellent form of rules-based feedback" because it returns rule + reason, which agents act on well ([Anthropic: Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)).

**Coverage: use *diff coverage* + a *ratchet*, not a fixed global number.**
- **Diff coverage** ("new/changed lines must be ≥X% covered") is enforceable language-agnostically: [diff-cover](https://github.com/Bachmann1234/diff_cover) consumes Cobertura, Clover, JaCoCo XML, or LCOV — formats every mainstream coverage tool (istanbul/c8, coverage.py, JaCoCo, go-cover converters, cargo-llvm-cov) can emit. This is the key fact enabling a language-agnostic gate with per-language adapters.
- **Ratchets** (coverage may only go up) are the anti-regression complement; tooling exists per-ecosystem (e.g. [jest-coverage-ratchet](https://github.com/Koleok/jest-coverage-ratchet)) but a generic ratchet is ~30 lines: store last-known coverage % in-repo, fail CI if new % is lower, auto-bump on improvement. Commentary in the agentic-coding space (e.g. Garry Tan's "90% coverage every PR" position, discussed critically in [Forestwalk: Test Coverage Won't Save You](https://forestwalk.ai/blog/test-coverage-wont-save-you-from-incoherence/)) converges on: coverage ratchets are necessary but not sufficient — they measure execution, not assertion quality.

**Mutation testing: viable only off the PR critical path.** Mutation testing is the one gate that actually measures whether tests assert anything — directly countering agents that write vacuous tests. But runtime is ~2x+ a normal test run even with incremental analysis; practical guidance across Stryker (JS/TS/.NET) and mutmut (Python) is to run it as a **nightly/slow-tier job** with a score threshold, not per-PR ([Augment: mutation testing for AI-generated code](https://www.augmentcode.com/guides/mutation-testing-ai-generated-code); [Stryker guide 2026](https://qaskills.sh/blog/mutation-testing-stryker-guide-2026); an interesting hybrid — using an agent itself as the mutator where Stryker doesn't fit — at [alexop.dev](https://alexop.dev/posts/mutation-testing-ai-agents-vitest-browser-mode/)). Staleness note: incremental-mode performance claims move fast; re-verify before pinning versions.

### 3. Preventing agents from gaming tests

The failure mode is well documented: if the harness's success signal is "tests pass" and the agent can edit tests, editing the test is a legitimate-looking shortcut ([DevAssure](https://www.devassure.io/blog/ai-coding-agents-gaming-their-own-tests/); [CodeScene](https://codescene.com/blog/agentic-ai-coding-best-practice-patterns-for-speed-with-quality)). Layered defenses observed in the wild:

1. **Instruction layer** (advisory): CLAUDE.md/AGENTS.md rules — "never modify or delete existing tests to make them pass; new behavior needs a new test." Cheap, imperfect.
2. **Deterministic local layer:** hooks/pre-commit checks that reject edits to test paths or flag them. Anthropic explicitly distinguishes advisory CLAUDE.md from deterministic hooks ("use hooks for actions that must happen every time with zero exceptions" — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
3. **CI layer (the one that can't be bypassed):**
   - Detect `.only` / `.skip` / deleted test files — [danger-plugin-no-test-shortcuts](https://danger.systems/js/plugins/danger-plugin-no-test-shortcuts.html) does this for JS; a generic version is a small git-diff script (fail if `tests/**` files are deleted or test count decreases without a label/human override).
   - **Coverage ratchet + diff coverage** make weakened tests visible as a number.
   - **CODEOWNERS on `tests/**`, `.github/workflows/**`, and the quality-gate config itself**, requiring human review when an implementation PR also touches them. This is softer and more workable than a hard "no test edits in implementation PRs" rule, which breaks TDD and legitimate refactors — the better pattern is *flag test-and-fixture edits for explicit human review*, not forbid them (inference, supported by [travis.media](https://travis.media/blog/safely-use-ai-coding-agents/) and CodeScene).
4. **Nightly mutation score** catches assertion-free tests that survive all of the above.

### 4. Self-verification patterns (agent-side, before CI ever runs)

Anthropic's best-practices doc (current, 2026) is the richest primary source here — "Give Claude a way to verify its work" is its first recommendation. Concrete mechanisms, in escalating strictness ([code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)):
- **A check the agent can run**: test suite, build exit code, linter, fixture-diff script, or browser screenshot vs. design.
- **Stop hooks** as deterministic gates: a script blocks the agent's turn from ending until checks pass (Claude Code overrides after 8 consecutive blocks — important detail for harness design: the loop must handle "gave up" as an outcome).
- **Verification subagents / adversarial review in fresh context**: the agent doing the work isn't the one grading it; the bundled `/code-review` skill runs the diff review in a fresh subagent.
- **Evidence over assertion**: require the agent to show test output/command results/screenshots, not claim success.
- **UI verification**: Playwright MCP gives agents screenshot + DOM access; the make-change → screenshot → compare → iterate loop is now standard practice ([ap7i.com](https://ap7i.com/posts/giving-claude-code-eyes-with-playwright-mcp/), [Shipyard](https://shipyard.build/blog/playwright-mcp-screenshots/)).

Copilot CLI note: it reads AGENTS.md and can run the same script-based checks, but has no equivalent of Stop hooks (as of early 2026 — verify before shipping; this is the fastest-moving claim in this report). Encoding verification as *scripts + AGENTS.md instructions* is therefore the portable subset; Claude-specific hooks are an additive layer.

### 5. LLM code review as a CI layer: real signal, real caveats

- **Claude Code Review** (Anthropic managed service, research preview, Team/Enterprise): fleet of specialized agents per PR, plus an explicit **verification step that checks candidate findings against actual code behavior to filter false positives**. ~$15–25/review, ~20 min. Crucially for gate design: its check run is **always neutral — it never blocks merges** — but the check-run Details end with a machine-readable severity JSON (`bughunter-severity: {"normal": N, ...}`) that your own CI can parse with `gh`/`jq` to build an optional gate. Tunable via `REVIEW.md` (severity redefinition, nit caps, skip paths, verification bar) ([Claude Code Review docs](https://code.claude.com/docs/en/code-review)). The lighter self-hosted alternative is [claude-code-action](https://github.com/anthropics/claude-code-action).
- **Copilot code review**: 60M reviews by March 2026 (10x growth in a year); GitHub reports **71% of reviews surface actionable feedback, 29% stay deliberately silent**; ~5.1 comments/review; March 2026 agentic overhaul (tool-calling repo exploration) ([GitHub blog, 2026-03-05](https://github.blog/ai-and-ml/github-copilot/60-million-copilot-code-reviews-and-counting/)). Independent reviews still report 15–25% stylistic noise ([bitsfrombytes](https://bitsfrombytes.com/github-copilot-review-2026-tested/)). GitHub's own stated lesson: developers value high-signal over thoroughness.
- **Security caveat (verified, 2026):** claude-code-action had a vulnerability letting a single malicious issue hijack repos (fixed in v1.0.94; [The Hacker News, June 2026](https://thehackernews.com/2026/06/claude-code-github-action-flaw-let-one.html)), and Microsoft found secret-exposure via untrusted GitHub content, mitigated in Claude Code 2.1.128 ([Microsoft Security Blog, 2026-06-05](https://www.microsoft.com/en-us/security/blog/2026/06/05/securing-ci-cd-in-agentic-world-claude-code-github-action-case/)). LLM CI actions are prompt-injection attack surface: pin versions, minimal token permissions, don't feed them untrusted issue bodies with write access.

### 6. Security scanning

Veracode's 2025 GenAI report: ~45% of AI-generated code samples introduced at least one OWASP Top-10 vulnerability ([Veracode](https://www.veracode.com/blog/genai-code-security-report/)). Semgrep (fast, 30+ languages, patterns match exactly the classes AI produces: SQLi, XSS, hardcoded secrets, path traversal) is the practical PR-tier SAST; CodeQL is deeper but slower — queue/nightly tier ([comparison](https://sanj.dev/post/ai-code-security-tools-comparison/)). Add secret scanning (gitleaks) and dependency audit at Tier 1 — both are seconds-fast. Anthropic ships an AI-powered [claude-code-security-review action](https://github.com/anthropics/claude-code-security-review) as a complementary semantic layer.

### 7. Conventional commits + changesets for agent workflows

[Changesets](https://changesets.org/) decouples version intent from commit messages: the change author (agent) writes a changeset file in the PR; a bot PR does the version bump/publish, which a human approves — this maps directly onto the starter repo's "configurable human approval points," unlike semantic-release, which releases fully automatically from commit messages and thus hands agents direct release authority ([comparison](https://www.pkgpulse.com/guides/semantic-release-vs-changesets-vs-release-it-release-2026); [intentional-releases argument](https://xnok.github.io/infra-bootstrap-tools/blog/intentional-releases-changesets/)). Conventional commits remain worth enforcing (commitlint) for greppable history and AI-generated changelogs, but shouldn't drive releases. Caveat: changesets is Node-centric; for the language-agnostic case, treat "a changeset file must accompany user-facing changes" as a gate the adapter implements (changesets for TS preset; a plain `changelog.d/` fragment convention for Python, e.g. towncrier).

## Best practices observed

- Fast/slow split everywhere: PR tier answers in <5 min; expensive truth (E2E, mutation, CodeQL) runs in merge queue or nightly.
- Same commands in three places: agent inner loop, local pre-push, CI — so "green locally" predicts "green in CI." Anthropic's guidance and the Claude Code hooks model both assume this.
- Ratchets over thresholds: one-way metrics (coverage, mutation score, lint-error count for legacy code) avoid both big-bang cleanup and slow rot.
- Advisory rules + deterministic enforcement in pairs: every CLAUDE.md/AGENTS.md rule that matters gets a hook or CI check twin.
- LLM review is a *layer*, never a required check by itself: Anthropic's own product refuses to block merges; gating, if any, is your CI parsing its structured output.
- Evidence-based done-ness: agents must attach proof (test output, screenshots) to PRs.

## Implications for the starter repo

**Minimal high-leverage gate stack to ship (default-on):**

1. `gate:format`, `gate:lint`, `gate:typecheck`, `gate:test` — Tier 1, every push, also runnable by the agent loop and as a pre-push hook.
2. `gate:coverage` — diff coverage ≥ threshold via diff-cover (input: Cobertura/LCOV, so any language adapter plugs in) + a tiny generic ratchet script storing the high-water mark in-repo.
3. `gate:integrity` — anti-gaming script: fail/flag on deleted test files, decreased test count, `.only`/`.skip`-style focus/skip markers, and edits to `tests/**` + gate config in implementation PRs (label-overridable); CODEOWNERS template covering `tests/**`, `.github/workflows/**`, gate config.
4. `gate:security` — Semgrep + gitleaks + dependency audit at Tier 1; CodeQL and mutation testing (Stryker/mutmut per adapter) as opt-in nightly jobs with score thresholds.
5. Merge queue-ready workflows: Tier 2 (integration/E2E/build) triggered on `merge_group`; docs on enabling the queue as the mechanical half of the "merge to main" approval point.

**Adapter design:** define gates as named commands in one config file (e.g. `quality.config.{json,yaml}`); presets (TS: biome/eslint + tsc + vitest+c8→LCOV; Python: ruff + mypy/pyright + pytest+coverage.py→Cobertura) just bind names to invocations and declare which coverage format they emit. The harness and CI only ever call gate names, so a new language = one preset file. Ship the verification contract portably: scripts + AGENTS.md/CLAUDE.md instructions for both Claude Code and Copilot CLI, with Claude-specific Stop hooks and a verify-before-commit skill as an additive layer (handle the 8-block Stop-hook override as a loop outcome).

**LLM review layer:** ship optional, off-by-default workflows for claude-code-action and `gh copilot` review request, pinned versions, minimal permissions, and a documented pattern for parsing Claude Code Review's severity JSON into an advisory (not required) check.

**Releases:** changesets in the TS preset; a "change fragment required" generic gate; conventional commits via commitlint; releases always behind a human-approved bot PR.

## Sources

- https://code.claude.com/docs/en/best-practices (Anthropic, current 2026)
- https://code.claude.com/docs/en/code-review (Anthropic, current 2026)
- https://github.com/anthropics/claude-code-action
- https://github.com/anthropics/claude-code-security-review
- https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
- https://github.blog/ai-and-ml/github-copilot/60-million-copilot-code-reviews-and-counting/ (2026-03-05)
- https://bitsfrombytes.com/github-copilot-review-2026-tested/
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- https://humanwhocodes.com/blog/2026/04/improving-developer-velocity-github-merge-queue/
- https://mergify.com/learn/merge-queue
- https://github.com/orgs/community/discussions/151100
- https://github.com/Bachmann1234/diff_cover
- https://github.com/aconrad/pycobertura
- https://github.com/Koleok/jest-coverage-ratchet
- https://forestwalk.ai/blog/test-coverage-wont-save-you-from-incoherence/
- https://www.augmentcode.com/guides/mutation-testing-ai-generated-code
- https://qaskills.sh/blog/mutation-testing-stryker-guide-2026
- https://alexop.dev/posts/mutation-testing-ai-agents-vitest-browser-mode/
- https://www.devassure.io/blog/ai-coding-agents-gaming-their-own-tests/
- https://codescene.com/blog/agentic-ai-coding-best-practice-patterns-for-speed-with-quality
- https://travis.media/blog/safely-use-ai-coding-agents/
- https://danger.systems/js/plugins/danger-plugin-no-test-shortcuts.html
- https://thehackernews.com/2026/06/claude-code-github-action-flaw-let-one.html
- https://www.microsoft.com/en-us/security/blog/2026/06/05/securing-ci-cd-in-agentic-world-claude-code-github-action-case/
- https://www.veracode.com/blog/genai-code-security-report/
- https://sanj.dev/post/ai-code-security-tools-comparison/
- https://ap7i.com/posts/giving-claude-code-eyes-with-playwright-mcp/
- https://shipyard.build/blog/playwright-mcp-screenshots/
- https://changesets.org/
- https://www.pkgpulse.com/guides/semantic-release-vs-changesets-vs-release-it-release-2026
- https://xnok.github.io/infra-bootstrap-tools/blog/intentional-releases-changesets/
