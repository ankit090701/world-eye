import { API_BASE } from '../config/api'
import type { BBox } from './shipsApi'
import type { TrainRoute, TrainsResponse } from '../types'

export async function fetchTrains(bbox: BBox, timeoutMs = 15000): Promise<TrainsResponse> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url =
      `${API_BASE}/api/trains?minLon=${bbox.minLon.toFixed(3)}&minLat=${bbox.minLat.toFixed(3)}` +
      `&maxLon=${bbox.maxLon.toFixed(3)}&maxLat=${bbox.maxLat.toFixed(3)}`
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as TrainsResponse
  } finally {
    window.clearTimeout(t)
  }
}

export async function fetchTrainRoute(date: string, num: number): Promise<TrainRoute | null> {
  const res = await fetch(`${API_BASE}/api/trains/route/${date}/${num}`)
  if (!res.ok) return null
  const data = (await res.json()) as { route: TrainRoute | null }
  return data.route
}
