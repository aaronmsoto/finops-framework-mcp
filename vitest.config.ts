// Shipped by the typescript preset: only the project's own tests run — the
// harness has its own vitest config under harness/.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["harness/**", "node_modules/**"],
    coverage: {
      include: ["src/**"],
      reporter: ["text", "lcov"],
    },
  },
});
