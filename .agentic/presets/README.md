# Presets

A preset is a small JSON file that binds this template's **canonical gate names** to the standard toolchain of one language, plus sensible `project` defaults. Presets exist so `./scripts/agentic init` can turn the template into a working, gated project in one command instead of a hand-editing session.

## Format

```jsonc
{
  "name": "typescript",                       // preset id, matches the filename
  "description": "one-line summary",
  "project": {                                 // merged into agentic.config.json "project"
    "srcDirs": ["src"],
    "testGlobs": ["tests/**"]
  },
  "gates": {                                   // merged into agentic.config.json "gates"
    "<canonical name>": {
      "command": "shell command",              // run via sh -c from the repo root
      "tier": "fast" | "full",
      "optional": true                          // optional gates may be skipped / lack a command
    }
  },
  "setup": ["human-readable setup steps"],     // printed by init; not executed
  "files": ["tsconfig.json", "src/index.ts"]   // preset-shipped files, see below
}
```

### The `files` key — preset-shipped starter files

`files` is an optional list of repo-relative paths. The physical files live inside the preset's directory, `.agentic/presets/<name>/<relpath>` (e.g. `.agentic/presets/typescript/tsconfig.json`), and `init` copies each one to the same relative path at the repo root — **only when the destination does not already exist** (existing files are skipped with a log line, never overwritten). A listed file that is missing from the preset directory is a hard error. This is how a preset ships working tool configs (`tsconfig.json`, `eslint.config.js`, `pyproject.toml`, ...) plus a tiny `src/` + `tests/` starter pair, so the gates are green immediately after the `setup` install step.

Canonical gate names (see `.agentic/docs/architecture.md`): `format`, `lint`, `typecheck`, `test`, `coverage`, `integrity`, `memory`, `designs`, `security`, `build`, `e2e`. Presets should bind these names rather than inventing new ones, so the loop, git hooks, and CI reference gates identically across languages. Extra names are allowed.

## Applying a preset

```sh
./scripts/agentic init --name my-project --preset typescript --owner @you
```

`init` reads `.agentic/presets/typescript.json` and **merges its `gates` and `project` objects into `agentic.config.json`** (preset entries replace same-named gates; unrelated config is preserved), records `"preset": "typescript"`, copies the preset's `files` into place (skipping any that already exist), then prints the preset's `setup` steps for you to follow — installing the actual tools (prettier, ruff, ...) is your job, since presets only declare the commands.

## Bundled presets

| Preset | Format/Lint | Types | Tests | Coverage report |
|---|---|---|---|---|
| `typescript.json` | prettier, eslint | tsc | vitest | `coverage/lcov.info` (LCOV) |
| `python.json` | ruff | pyright | pytest + pytest-cov | `coverage.xml` (Cobertura XML) |

Both bind the harness gates `integrity` (anti-gaming diff checks), `memory` (memory-bank budgets), and `designs` (design-doc self-containment) — those run through `node .agentic/harness/dist/cli.js` and work for any project language.

### The `coverage` gate ships as an optional placeholder you activate

Both presets declare the `coverage` gate with `tier` + `"optional": true` but **no command** — an optional gate without a command is skipped with a notice, so a fresh project passes the fast tier before any extra tooling is installed. To activate it, install [diff-cover](https://github.com/Bachmann1234/diff_cover) (a Python tool) and bind the command each preset's `setup` steps spell out:

```sh
pip install diff-cover     # or: pipx install diff-cover
```

Then set `gates.coverage.command` in `agentic.config.json` (TypeScript: `diff-cover coverage/lcov.info --compare-branch origin/main --fail-under 80`; Python: `diff-cover coverage.xml --compare-branch origin/main --fail-under 80`). diff-cover fails if **new/changed lines** are less than 80% covered relative to `origin/main` — a diff-coverage gate, not a global threshold, so it never punishes you for legacy code. Once your project has a test culture worth ratcheting, flip `"optional"` to `false`. (Optional gates whose bound command is missing from the machine — exit 127 — are likewise skipped with a notice rather than failed.)

## Writing your own preset

1. Copy the closest bundled preset to `.agentic/presets/<lang>.json`.
2. Rebind the canonical gate names to your toolchain (`go vet`, `cargo clippy`, ...). Keep `integrity` and `memory` as-is — they are language-independent.
3. Put anything a human must do (install tools, configure coverage output paths) in `setup`.
4. Point `coverage` at whatever report your test runner emits — diff-cover accepts LCOV, Cobertura, Clover, and JaCoCo formats, so nearly any ecosystem can feed it.
5. Apply it: `./scripts/agentic init --preset <lang>`.
