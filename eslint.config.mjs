import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  { ...js.configs.recommended, files: ["**/*.ts", "**/*.tsx"] },
  ...tseslint.configs.recommended,
  { ...reactHooks.configs.flat.recommended, files: ["src/**/*.tsx"] },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "data/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);
