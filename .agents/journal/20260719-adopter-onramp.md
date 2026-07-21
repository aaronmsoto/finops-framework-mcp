## Adopter on-ramp hardening — 2026-07-19

- did: fresh-eyes adopter audit found the template green for itself but not
  for its first child project (7 reverse-engineered interventions needed).
  Fixed all findings: init prints preset setup steps, seeds T-001..T-003,
  resolves branching (--branching flag, default trunk), updates package.json
  name, --fresh clears example designs; presets ship starter files (configs +
  hello-world src/test for TS and Python) via a new `files` key; gate runner
  puts node_modules/.bin on PATH; `tasks complete --commit` closes the
  chain-state choreography gap; serve 404s .git paths; mock contract printed
  at loop start and documented in operations.md; ci.yml installs project deps
  in both jobs; misleading troubleshooting row fixed; "Your first green PR"
  doc section added; designs gate added to presets.
- result: 169/169 tests (21 new); ACCEPTANCE: fresh template copy →
  bootstrap → init → only the printed setup steps → gates EXIT 0 with zero
  manual fixes, on both typescript and python presets; trunk/integration
  surface switching verified both directions.
- next: ship via task branch → dev → rolling Release PR.
