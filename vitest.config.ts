/**
 * vitest.config.ts
 *
 * Vitest configuration for the kart racing game test suite.
 *
 * Test file locations:
 *   tests/**\/*.test.ts   — unit and integration tests
 *
 * TypeScript profile: tsconfig.test.json
 *   - Covers both src/ and tests/
 *   - module = ESNext, moduleResolution = Bundler (Vitest requirement)
 *   - Vitest globals injected (describe, it, expect, etc.)
 */

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Use the test-specific tsconfig so Vitest sees all src/ and tests/ files
    // with correct module resolution.
    globals: true,

    // Run in Node environment (no DOM — physics/game logic only)
    environment: "node",

    // Test file patterns
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],

    // TypeScript handling via Vitest's built-in esbuild transformer.
    // The tsconfig path alias resolution is handled via the resolve.alias
    // block below (Vitest/esbuild does not read tsconfig paths automatically).

    // Coverage configuration (opt-in via `npm run test:coverage`)
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*index.ts",  // barrel exports have no logic to cover
        "node_modules",
      ],
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "coverage",
    },

    // Fail fast on first test file with errors (good for CI)
    bail: 0,

    // Longer timeout for integration tests that run physics loops
    testTimeout: 10_000,
  },

  resolve: {
    alias: {
      // Mirror the path aliases in tsconfig.json so imports like
      // '@shared/types' and '@math/Vector2' work inside test files.
      "@shared": resolve(__dirname, "src/shared"),
      "@math": resolve(__dirname, "src/math"),
      "@physics": resolve(__dirname, "src/physics"),
      "@vehicle": resolve(__dirname, "src/vehicle"),
      "@track": resolve(__dirname, "src/track"),
      "@race": resolve(__dirname, "src/race"),
      "@network": resolve(__dirname, "src/network"),
      "@debug": resolve(__dirname, "src/debug"),
      "@proxy": resolve(__dirname, "src/proxy"),
      "@ui": resolve(__dirname, "src/ui"),
      "@audio": resolve(__dirname, "src/audio"),
      "@assets": resolve(__dirname, "src/assets"),
      "@core": resolve(__dirname, "src/core"),
    },
  },
});
