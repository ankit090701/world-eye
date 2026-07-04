import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// WorldEye web (Module 1: World Map Dashboard)
// No API keys required — all map/basemap providers used are keyless & free.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
})
