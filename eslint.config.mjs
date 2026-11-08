import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/next-env.d.ts",
    "resume/**",
  ]),
  {
    files: ["**/*.{js,mjs,ts,tsx,mts}"],
    ignores: ["**/*.spec.{ts,tsx}", "**/src/testing/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)testing(/|$)",
              message:
                "Test utilities in src/testing/ are for tests and other test utilities only.",
            },
          ],
        },
      ],
    },
  },
]);
