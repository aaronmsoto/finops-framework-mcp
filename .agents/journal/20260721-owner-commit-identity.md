# 2026-07-21 — Auto-set agent commit identity to the owner

## Make no-AI-authorship deterministic at the source — 2026-07-21

- did: bootstrap.sh and init.ts now SET git identity to the owner (was a
  warning). Shared rule: fix when unset / AI-looking / a tooling-set value
  (agentic.identityAutoset marker) that no longer matches the owner; never
  clobber a human identity. init.setOwnerIdentity() is authoritative (real
  --owner, runs after bootstrap); bootstrap sets from approvals.yaml owner for
  the re-clone case. Clarified: the stop-hook wanting Claude identity is an
  ENVIRONMENT hook (~/.claude), not the repo's — the repo fixes what it
  controls. Owner chose NOT to add author-identity scanning to the integrity
  gate (squash relabels to owner; message/body scan + this source fix suffice).
- result: 211/211 tests (5 new setOwnerIdentity cases: AI-replace, unset-set,
  human-preserve, autoset-remismatch-reset, matching-noop); lint clean; no
  drift; bootstrap syntax ok. Live sim: Claude identity → bootstrap sets owner
  (autoset) → init --owner re-sets to the real derivative owner; a human
  identity is preserved across init.
- next: ship via dev PR; rolling Release PR carries it to main.
