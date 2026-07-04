import { fetchJSON } from '../lib/cache.js'
import { EMERGENCY_SQUAWKS, type Aircraft } from './types.js'

const num = (x: unknown): number | null =>
  typeof x === 'number' && Number.isFinite(x) ? x : null

/** Normalize one adsb.lol / ADSBExchange-v2 aircraft record. */
export function normalizeAdsbLol(a: any): Aircraft | null {
  if (typeof a?.lat !== 'number' || typeof a?.lon !== 'number') return null

  const squawk = a.squawk != null ? String(a.squawk) : null
  const emKind = squawk && EMERGENCY_SQUAWKS[squawk] ? EMERGENCY_SQUAWKS[squawk] : null
  const emField = typeof a.emergency === 'string' && a.emergency !== 'none' && a.emergency !== ''
  const onGround = a.alt_baro === 'ground'

  let altitude: number | null = null
  if (typeof a.alt_baro === 'number') altitude = a.alt_baro
  else if (typeof a.alt_geom === 'number') altitude = a.alt_geom
  else if (onGround) altitude = 0

  return {
    hex: String(a.hex ?? '').toLowerCase(),
    callsign: a.flight ? String(a.flight).trim() : null,
    registration: a.r ? String(a.r).trim() : null,
    type: a.t ? String(a.t).trim() : null,
    category: a.category ?? null,
    lat: a.lat,
    lon: a.lon,
    altitude,
    groundSpeed: num(a.gs),
    track: num(a.track) ?? num(a.true_heading) ?? num(a.mag_heading),
    verticalRate: num(a.baro_rate) ?? num(a.geom_rate),
    squawk,
    emergency: Boolean(emKind) || emField,
    emergencyKind: emKind ?? (emField ? 'general' : null),
    onGround,
    source: 'live',
    seen: num(a.seen),
  }
}

/** Fetch live aircraft within `radiusNm` nautical miles of a point. */
export async function fetchAdsbLol(
  lat: number,
  lon: number,
  radiusNm: number,
): Promise<Aircraft[]> {
  const r = Math.max(1, Math.min(250, Math.round(radiusNm)))
  const url = `https://api.adsb.lol/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${r}`
  const data = await fetchJSON(url, 6500)
  const ac: any[] = Array.isArray(data?.ac) ? data.ac : []
  const out: Aircraft[] = []
  for (const a of ac) {
    const n = normalizeAdsbLol(a)
    if (n && n.hex) out.push(n)
  }
  return out
}
