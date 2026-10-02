// Base URL for the WorldEye API (Module 2+). Defaults to the local dev proxy.
// Override with VITE_API_BASE for other deployments; an empty value means
// same-origin (the Docker web image serves the app and proxies /api itself).
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8787'
