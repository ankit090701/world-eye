import { API_BASE } from '../config/api'
import type { FleetResponse } from '../types'

export async function fetchFleet(
  depot: { lat: number; lon: number } | null,
  timeoutMs = 9000,
): Promise<FleetResponse> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const q = depot ? `?lat=${depot.lat.toFixed(4)}&lon=${depot.lon.toFixed(4)}` : ''
    const res = await fetch(`${API_BASE}/api/fleet${q}`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as FleetResponse
  } finally {
    window.clearTimeout(t)
  }
}
