import { API_BASE } from '../config/api'
import type { DomainReport } from '../types'

// Longer than the server's worst-case fan-out budget (certspotter→crt.sh fallback
// + infra geo), so the client doesn't abort a request the server will complete.
export async function fetchDomainLookup(q: string, timeoutMs = 35000): Promise<DomainReport> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api/domain/lookup?q=${encodeURIComponent(q)}`, {
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null)
      throw new Error(msg || `HTTP ${res.status}`)
    }
    return (await res.json()) as DomainReport
  } finally {
    window.clearTimeout(t)
  }
}
