# Owner checklist

Things only you can do — none of this is possible from an agent session
(proxied tokens, sandbox credential/workflow restrictions, or GitHub UI
actions with no API equivalent available here). Check items off as you go;
this file is yours, not machine-managed. Verified against the live repo as
of 2026-09-25.

## 1. Add the missing CI/CD workflow file

The agent session was blocked by its own sandbox from committing a new
`.github/workflows/` file (a stricter guard than this repo's own policy, on
autonomously landing CI workflow files). The finished file was sent to you
directly as `deploy-worker.yml` in chat.

- [ ] On branch `claude/session-k75rxy`: GitHub web UI → **Add file → Create
      new file** → path `.github/workflows/deploy-worker.yml` → paste the
      content you were sent → commit directly to that branch.
- [ ] Then open/continue the PR from `claude/session-k75rxy` into `dev` (or
      ask the agent to do it once the file is there).

## 2. Cloudflare Worker deploy — one-time GitHub setup

Needed before the new `deploy-worker.yml` workflow can actually run (it will
sit there unable to deploy until this exists). Details:
`docs/deploy-worker.md` §0.

- [ ] Repo **Settings → Environments → New environment**, name it exactly
      `cloudflare-production`.
- [ ] On that environment, add **yourself as a required reviewer** (an
      environment with no reviewer is unprotected — skipping this means a
      qualifying push deploys immediately with no approval step).
- [ ] On that same environment, add two **environment secrets**:
      - `CLOUDFLARE_API_TOKEN` — scope it to **Account → Workers Scripts:
        Edit** only. Not the Global API Key.
      - `CLOUDFLARE_ACCOUNT_ID`
- [ ] Trigger it once things are wired up (push to `main` touching a
      qualifying path, or Actions → deploy-worker → **Run workflow**), then
      **approve the pending deployment** when GitHub prompts.
- [ ] Smoke-test per `docs/deploy-worker.md` §5, including the new 429 /
      `Retry-After: 60` rate-limit case.
- [ ] Once you're satisfied the rate limiter holds up under real traffic,
      that's your cue to revisit whether to advertise the Worker URL
      publicly (see item 6 below — deliberately not decided yet).

## 3. GitHub repo settings

- [x] About description — confirmed already set: *"Two unofficial MCP
      servers giving AI assistants sourced answers from the FinOps Framework
      and the FOCUS billing-data spec."*
- [ ] Website field → set to the Pages guide URL
      (`https://aaronmsoto.github.io/finops-framework-mcp/`) — not
      confirmed set as of this check.
- [ ] Topics → add `mcp`, `model-context-protocol`, `finops`, `focus`,
      `cloud-cost` — not confirmed set.
- [ ] Settings → General → confirm **"Automatically delete head branches"
      is OFF** — it deleted `dev` once before (when PR #21 merged); an
      unconfirmed setting will bite again on a future rolling release.

## 4. npm trusted publisher (blocks tagging `v0.1.0` for a CI-provenance release)

Per-package setting, npm web UI, for **both** packages:

- [ ] `finops-framework-mcp` → Package → Settings → Trusted publisher →
      GitHub Actions → repo `aaronmsoto/finops-framework-mcp` → workflow
      `publish.yml` → **explicitly tick the allowed `npm publish` action**
      (configs created after May 2026 need at least one allowed action or
      the publish 403s).
- [ ] `finops-focus-mcp` → same steps.
- [ ] Until both are done: **do not push a `v0.1.0` tag** —
      `publish.yml` fires on tag push and will fail without this. The
      current 0.1.0 was published manually and carries no provenance;
      provenance starts with the first CI-driven publish.

## 5. MCP Registry — one-time manifest submission

From a normal machine (the device-code login this needs is blocked from an
agent session). Full steps and the npm-name-collision warning:
`docs/release-runbook.md`.

- [ ] Install: `GOBIN=/tmp/mcpbin go install
      github.com/modelcontextprotocol/registry/cmd/publisher@latest`
- [ ] `publisher login github` (opens a browser)
- [ ] `publisher publish server.json`
- [ ] `publisher publish packages/finops-focus-mcp/server.json`
- [ ] After this one-time submission, `publish.yml`'s `registry` job
      handles future submissions automatically via OIDC on every tag push —
      no repeat of this step needed.

## 6. Decisions you haven't made yet (not mechanical steps — need your judgment)

- [ ] **Advertise the Worker URL?** Currently deliberately unadvertised
      (no auth, and rate limiting was only just added — see item 2). Revisit
      once the rate limiter's been proven under real traffic.
- [ ] **Demo walkthrough: switch `CALCULATE_VERSION` from `"1.0"` to
      `"1.2"`?** Right now 3 of 4 featured KPIs always show "not computable"
      on the FOCUS 1.0 sample (correct, tested behavior — not a bug) because
      that sample lacks qualifying commitment-purchase rows. Switching to
      1.2 would make all 4 compute real numbers, but requires rewriting
      `demo-requests.test.ts`'s hardcoded expected values and changes what
      the walkthrough demonstrates (today: "the tool refuses to guess";
      after: "here's what 1.2 makes possible"). See journal
      `20260925-demo-walkthrough-errors-and-worker-rate-limit.md`.

## 7. Optional: unblock the agentic harness for this session type

`npm ci --prefix .agentic` 401s fetching `@aaronmsoto/agentic-harness` from
GitHub Packages — needs a `read:packages` token in `NPM_TOKEN` that agent
sessions don't currently have. Without it: no `tasks add/start/complete`, no
hash-chain extension, no `./scripts/agentic gates` (sessions fall back to
running the equivalent npm commands directly, which works fine but isn't
tracked in `.agents/tasks.json`). Supply the token to this session type, or
accept that recent work stays untracked in the task chain.
