import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // These are set BEFORE any test module loads, so the Prisma client
    // (instantiated at import time in src/lib/prisma.ts) picks up the
    // TEST database — never your dev data.
    env: {
      DATABASE_URL: 'postgresql://medibook:medibook@localhost:5432/medibook_test',
      JWT_SECRET: 'test-secret',
    },
    setupFiles: ['./tests/setup.ts'],
    // Every test file talks to the same Postgres database and the setup
    // truncates all tables between tests, so files must NOT run in parallel.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
