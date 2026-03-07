/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: '.integrity-suite/global-setup.ts',
    testTimeout: 10000,
    hookTimeout: 5000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      // 'all: true' was removed in Vitest v4; 'include' covers all files for the same effect
    },
  },
});
