// Per-worker test setup (vitest setupFiles): strip host-exported AGENTIC_*
// variables from the test process itself so in-process code paths that read
// process.env (completeTask's AGENTIC_SKIP_GATES, the mock runner's
// AGENTIC_MOCK_SCRIPT, runner AGENTIC_*_ARGS) start from a clean slate.
// Tests that need one set it explicitly. Spawned subprocesses are sanitized
// separately by hermeticEnv() in helpers.ts.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("AGENTIC_")) delete process.env[key];
}
