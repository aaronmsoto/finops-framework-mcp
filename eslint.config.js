// Shipped by the typescript preset: flat config scoped to src/ and tests/ so
// the template's own internals (harness/, scripts/, ...) are never linted.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.ts", "tests/**/*.ts"],
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
});
