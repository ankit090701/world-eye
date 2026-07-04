import { API_BASE } from '../config/api'
import type { BBox } from './shipsApi'
import type { TrafficResponse } from '../types'

export async function fetchTraffic(bbox: BBox, timeoutMs = 12000): Promise<TrafficResponse> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url =
      `${API_BASE}/api/traffic?minLon=${bbox.minLon.toFixed(3)}&minLat=${bbox.minLat.toFixed(3)}` +
      `&maxLon=${bbox.maxLon.toFixed(3)}&maxLat=${bbox.maxLat.toFixed(3)}`
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as TrafficResponse
  } finally {
    window.clearTimeout(t)
  }
}
