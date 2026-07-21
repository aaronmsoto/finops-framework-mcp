# Branch rulesets

`main-branch.json (and, in integration branching mode, integration-branch.json)` in this directory is **GENERATED** by `./scripts/agentic approvals compile` from the owner policy in `approvals.yaml` — do not edit it by hand (CI runs `approvals check` and fails on drift).

GitHub does not read this file automatically; importing it is a one-time manual step:

- **UI:** Repo Settings -> Rules -> Rulesets -> New ruleset dropdown -> **Import a ruleset** -> select `main-branch.json`.
- **CLI:** `gh api repos/{owner}/{repo}/rulesets --input .github/rulesets/main-branch.json`

Notes:

- Exported/imported ruleset JSON **excludes bypass actor lists** — if you want bypassers (e.g. a release bot), add them in the UI after import.
- The ruleset requires the status check `gates-fast` (and `gates-full` where a merge queue is configured) and at least one human review. On **private repos under Free/Pro/Team plans, required-reviewer rules may not be enforced** — that generally needs a public repo or a paid/Enterprise plan. Verify enforcement after import (rulesets have an "Evaluate" dry-run mode).

See `docs/approvals.md` for the full policy pipeline.
