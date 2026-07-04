import { API_BASE } from '../config/api'
import type { AircraftResponse, AircraftMeta, FlightRoute } from '../types'

async function getJSON<T>(url: string, timeoutMs = 9000): Promise<T> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    window.clearTimeout(t)
  }
}

export function fetchAircraft(
  lat: number,
  lon: number,
  radiusNm: number,
): Promise<AircraftResponse> {
  const url = `${API_BASE}/api/aircraft?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius=${Math.round(
    radiusNm,
  )}`
  return getJSON<AircraftResponse>(url)
}

export async function fetchRoute(callsign: string): Promise<FlightRoute | null> {
  const data = await getJSON<{ route: FlightRoute | null }>(
    `${API_BASE}/api/aircraft/route/${encodeURIComponent(callsign)}`,
  )
  return data.route
}

export async function fetchMeta(idOrReg: string): Promise<AircraftMeta | null> {
  const data = await getJSON<{ meta: AircraftMeta | null }>(
    `${API_BASE}/api/aircraft/meta/${encodeURIComponent(idOrReg)}`,
  )
  return data.meta
}
