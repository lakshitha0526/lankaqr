import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      all: true,
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      reporter: ["text", "html"],
    },
  },
});
