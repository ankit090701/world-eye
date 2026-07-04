import { API_BASE } from '../config/api'
import type { CyberReport, ThreatMapResponse } from '../types'

export async function fetchCyberLookup(q: string, timeoutMs = 20000): Promise<CyberReport> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api/cyber/lookup?q=${encodeURIComponent(q)}`, {
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null)
      throw new Error(msg || `HTTP ${res.status}`)
    }
    return (await res.json()) as CyberReport
  } finally {
    window.clearTimeout(t)
  }
}

export async function fetchCyberThreats(timeoutMs = 12000): Promise<ThreatMapResponse> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api/cyber/threats`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as ThreatMapResponse
  } finally {
    window.clearTimeout(t)
  }
}
