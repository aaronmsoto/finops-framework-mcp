# INSTANTIATE — create a new project from this template (agent runbook)

Audience: an **AI coding agent** (Claude Code or Copilot CLI) in a session
with access to BOTH this template repository and a target repository —
typically cloned side by side, with the target empty or freshly created.
Follow the steps in order; every step is a verifiable shell command.

Humans creating a project by hand: use GitHub's **Use this template**
button instead, then follow [.agentic/docs/getting-started.md](docs/getting-started.md).

Throughout, `$TEMPLATE` is the absolute path of this template's clone and
`$TARGET` is the absolute path of the target repository's clone.

## 0. Verify preconditions (do not assume)

- `node --version` reports >= 20, `npm` is on PATH, and `git --version`
  reports >= 2.28 (`init -b`, `core.hooksPath`).
- `git -C "$TARGET" config user.name` and `user.email` are set (commits
  fail without them); prefer the owner's identity, never an AI-sounding one.
- `$TARGET` is a git repository: `git -C "$TARGET" rev-parse --git-dir`.
  If it is not one yet: `git -C "$TARGET" init -b main`.
- Collect from the owner (ask if not already provided; do not invent):
  - **project name** (kebab-case),
  - **preset** — `typescript` or `python` (see `.agentic/presets/`),
  - **owner GitHub handle** (`@handle`) — receives CODEOWNERS review duty,
  - **branching mode** — `trunk` (default) or `integration`
    (autonomous squash-merges to a `dev` branch; human merges dev → main),
  - **root LICENSE choice** — `keep` (default), `mit`, `apache-2.0`, or
    `proprietary`; for mit/apache-2.0 also the **copyright holder's legal
    name** (a GitHub handle is not a legal name — ask). The template's own
    MIT notice stays at `.agentic/LICENSE` in every case.
- If `$TARGET` already contains files, list them and note collisions:
  step 1 overwrites same-named paths. Preserve the target's `README.md`
  content first if one exists — `init` replaces the template README with a
  project stub you can merge that content into afterward.

## 1. Copy the template's tracked files into the target

```sh
git -C "$TEMPLATE" archive --format=tar HEAD | tar -xf - -C "$TARGET"
```

`git archive` copies **only tracked files** — no `.git/`, no
`node_modules/`, no `dist/`, no caches — which is why it is used instead of
`cp -r`. If the template clone might be mid-work on a branch, archive its
default branch instead: `git -C "$TEMPLATE" archive origin/main | ...`.

## 2. Commit the import

```sh
cd "$TARGET"
git add -A
git commit -m "Import agentic-starter-repo template"
```

Committing before `init` keeps the template import and the project
initialization separately reviewable. Policy applies from the first commit:
imperative subject <= 72 chars, **no AI attribution** (no bot
`Co-Authored-By` trailers, session links, or "Generated with" footers) —
the git hooks that strip these are not wired until step 3, so comply by hand.

## 3. Bootstrap — build the harness, wire git hooks

```sh
./scripts/bootstrap.sh
```

Builds `.agentic/harness/dist/cli.js` (nothing works before this — `dist/`
is never committed) and points `core.hooksPath` at `scripts/git-hooks/`.

## 4. Initialize the project

```sh
./scripts/agentic init --name <name> --preset <preset> --owner <@handle> --fresh \
  [--branching integration] [--runner claude|copilot] \
  [--license mit|apache-2.0|proprietary|keep] [--license-holder "<legal name>"]
```

This rewrites `agentic.config.json`, sets the owner in `approvals.yaml`,
copies preset starter files where absent, resets memory/journal, seeds
onboarding tasks T-001..T-003, takes over the README with a project stub,
and runs `approvals compile`. Always pass `--fresh` here: it drops the
template's example spec and design doc, which would otherwise be planned
as real work by the loop. `--license` sets the project's root LICENSE
(default `keep` leaves the template's file with a printed reminder — relay
that reminder to the owner). Then **run the preset setup steps `init`
prints** (dependency installs) — gates stay red until you do.

## 5. Verify before committing

```sh
./scripts/agentic gates            # must exit 0
./scripts/agentic tasks validate   # chain valid (genesis)
./scripts/agentic approvals check  # no drift
```

A fresh repo has no `origin/main` yet, so the integrity gate prints a skip
notice — expected, not an error.

## 6. Commit and push

```sh
git add -A
git commit -m "Initialize <name> from agentic-starter-repo"
git push -u origin main
```

This genesis push to the default branch is expected and allowed: branch
protection does not exist until the owner imports the rulesets (next step).
After that, normal approval points apply — never push to main again.

## 7. Report back to the owner (their steps, not yours)

Tell the owner what you did, then list what only they can do:

1. Apply the repo settings — they are GitHub configuration and never
   transfer with content. If `gh` is available (to you or the owner), run
   `./scripts/github-setup.sh` in the target; otherwise relay the manual
   checklist: import `.github/rulesets/main-branch.json` (Settings → Rules
   → Rulesets → Import; integration mode: also `integration-branch.json`
   and create the `dev` branch), enable **Allow auto-merge**, enable
   **Allow GitHub Actions to create and approve pull requests**, and set
   Default commit message → **"Default to pull request title and
   description"** (GitHub's stock squash message adds co-author trailers,
   which the integrity gate rejects as AI attribution).
2. Edit the "What this project is" section of `AGENTS.md` (3-6 lines) —
   or draft it for their review if they have described the project.
3. Work the seeded onboarding tasks T-001..T-003 (`./scripts/agentic tasks
   list`), which cover exactly these first-run steps.

Full background: [.agentic/docs/getting-started.md](docs/getting-started.md).
