import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/{unit,int}/**/*.spec.ts'],
    // `tests/int` files each spin up Payload in `beforeAll` and drive real
    // Postgres + Redis; under parallel load the schema push and multi-write
    // tests exceed vitest's 5s/10s defaults. Unit tests never approach these.
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
})
