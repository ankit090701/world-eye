// Base URL for the WorldEye API (Module 2+). Defaults to the local dev proxy.
// Override with VITE_API_BASE for other deployments.
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8787'
