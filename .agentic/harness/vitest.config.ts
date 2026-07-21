import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Loop / gates tests spawn real subprocesses (sh, git, node dist/cli.js).
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Builds dist/ once so tests (mock loop scripts) can spawn the real CLI.
    globalSetup: ["tests/global-setup.ts"],
    // Strips host-exported AGENTIC_* env vars per worker (hermetic tests).
    setupFiles: ["tests/setup.ts"]
  }
});
