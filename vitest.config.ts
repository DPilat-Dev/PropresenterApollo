import { defineConfig, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default mergeConfig(
  defineConfig({ plugins: [react()] }),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
      coverage: {
        provider: 'v8',
        include: ['src/lib/**'],
        reporter: ['text', 'html'],
      },
    },
  }),
)
