// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  // Next.js recommended configs (React, TS, hooks, core web vitals)
  ...nextVitals,
  ...nextTs,

  // Global rule overrides to make your current codebase manageable
  {
    rules: {
      // Too strict for now – we want to see them, but not fail lint
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",

      // Often intentionally omitted deps in useEffect (fetch-once patterns etc.)
      "react-hooks/exhaustive-deps": "warn",

      // React 19 added this; it's way too aggressive for patterns like
      // "read from window/localStorage then setState". Turn it off for now.
      "react-hooks/set-state-in-effect": "off",

      // Apostrophes in JSX text – not worth blocking anything
      "react/no-unescaped-entities": "off",

      // Next.js recommendations – keep as warnings
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-img-element": "warn",

      // Unused vars: warn, and ignore names starting with "_"
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Explicit ignores (on top of Next's defaults)
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);
