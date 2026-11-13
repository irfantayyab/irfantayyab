import { defineConfig } from "vitest/config";

const unitTests = "src/**/*.spec.{ts,tsx}";
const integrationTests = "src/**/*.integration.spec.{ts,tsx}";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [unitTests],
          exclude: [integrationTests],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: [integrationTests],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
