// Base URL for the WorldEye API. Empty by default: the app calls /api on its own
// origin (Vite proxies it in development; nginx in Docker and Vercel's routing in
// production). Set VITE_API_BASE only when the API is hosted on another origin.
export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '')
