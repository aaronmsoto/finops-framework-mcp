// Shipped by the typescript preset: flat config scoped to src/ and tests/ so
// the template's own internals (harness/, scripts/, ...) are never linted.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
  // Decoupling seams (docs/architecture.md §2): crawler and server may only
  // share code through src/shared; the data artifact is the sole interface.
  {
    files: ["src/crawlers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/servers/**"],
              message: "crawler code must not import server code",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/servers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/crawlers/**"],
              message: "server code must not import crawler code",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/crawlers/**", "**/servers/**"],
              message: "shared code must not depend on crawler or server code",
            },
          ],
        },
      ],
    },
  },
);
