// Flat ESLint config for the harness. Pragmatic strictness: typescript-eslint
// recommended, with a couple of rules relaxed where the codebase deliberately
// uses the pattern (documented inline).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The harness validates untyped JSON/YAML by hand; non-null assertions
      // after explicit existence checks are idiomatic here.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
);
