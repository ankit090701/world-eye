import { API_BASE } from '../config/api'
import type { OsintKind, OsintResponse } from '../types'

export async function fetchOsint(
  kind: OsintKind,
  q: string,
  country?: string,
  timeoutMs = 20000,
): Promise<OsintResponse> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const params = new URLSearchParams({ kind, q })
    if (country) params.set('country', country)
    const res = await fetch(`${API_BASE}/api/osint/lookup?${params.toString()}`, { signal: ctrl.signal })
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null)
      throw new Error(msg || `HTTP ${res.status}`)
    }
    return (await res.json()) as OsintResponse
  } finally {
    window.clearTimeout(t)
  }
}
