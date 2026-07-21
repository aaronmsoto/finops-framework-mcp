## Reorganize template machinery into .agentic/ — 2026-07-19

- did: per approved plan — git-mv'd harness/, presets/, and all template docs
  (architecture, operations, getting-started, approvals, quality-gates,
  memory, adr/, research/) into hidden .agentic/; docs/ is now the
  derivative's own (new README stub + adr/INDEX.md; designs/ unchanged);
  init archives the template README and writes a project stub (marker-based,
  custom READMEs untouched); retargeted all 16 functional reference sites
  (shims, configs, ci.yml cache paths, SessionStart hook, init presets
  literal, gates PATH prepend, preset gate strings); swept doc/memory/skill
  references. scripts/ shims unchanged as the stable interface — every
  documented ./scripts/agentic command still works. decisions.md + journals
  left untouched (append-only, enforced).
- result: 179/179 tests (4 new README-takeover); gates green; approvals
  compile/check no drift; loop mock smoke green; ACCEPTANCE rerun: fresh
  copy → bootstrap → init → printed setup only → gates EXIT 0, project
  README stub written, template README archived, docs scaffold present.
- next: ship via dev PR; owner merges rolling Release PR.
