import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The new frontend talks to the existing Express API on :8000 during the
// strangler migration. All /api calls are proxied there in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Defaults to the local Express API; set VITE_API_TARGET to point a
        // local preview at another backend (e.g. prod) for verification.
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
