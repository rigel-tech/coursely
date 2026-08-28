import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // `.tsx` too: component tests render real JSX. @testing-library/react was already a
    // dependency but no test could pick it up while the glob only matched `.spec.ts`.
    include: ['tests/{unit,int}/**/*.spec.{ts,tsx}'],
  },
})
