import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app calls the API on its own origin (/api); locally Vite forwards that to the API on :8787.
const apiProxy = { '/api': 'http://localhost:8787' }

export default defineConfig({
  plugins: [react()],
  // Vercel Web Analytics loads from /_vercel/insights, which only Vercel serves, so it is
  // compiled in for Vercel builds only (elsewhere nginx would answer that path with the SPA).
  define: { __VERCEL__: JSON.stringify(Boolean(process.env.VERCEL)) },
  server: {
    port: 5173,
    host: true,
    proxy: apiProxy,
  },
  preview: {
    port: 4173,
    proxy: apiProxy,
  },
})
