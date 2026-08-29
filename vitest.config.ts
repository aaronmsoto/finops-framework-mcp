// Shipped by the typescript preset: only the project's own tests run — the
// harness has its own vitest config under harness/.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["harness/**", "node_modules/**"],
    // Builds dist/ when missing so the dist-gated integration tests that
    // execute the built bins actually run instead of silently skipping —
    // see the file's own comment for why that mattered.
    globalSetup: ["scripts/vitest-global-setup.mjs"],
    coverage: {
      include: ["src/**"],
      exclude: ["src/**/fixtures/**", "src/**/*.test.ts"],
      reporter: ["text", "lcov"],
      // Ratchet floor at the measured 2026-08-05 baseline; regressions fail
      // `npm test` directly, replacing the unbound `coverage` gate entry.
      thresholds: {
        statements: 75.6,
        branches: 65.21,
        functions: 75.6,
        lines: 76.72,
      },
    },
  },
});
