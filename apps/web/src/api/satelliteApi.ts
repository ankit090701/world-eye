import { API_BASE } from '../config/api'
import type { SatGroup, TleResponse } from '../types'

export async function fetchTle(group: SatGroup, timeoutMs = 25000): Promise<TleResponse> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api/satellites/tle?group=${group}`, { signal: ctrl.signal })
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null)
      throw new Error(msg || `HTTP ${res.status}`)
    }
    return (await res.json()) as TleResponse
  } finally {
    window.clearTimeout(t)
  }
}
