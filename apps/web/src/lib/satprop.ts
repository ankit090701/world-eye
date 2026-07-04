import * as satellite from 'satellite.js'
import type { TleRecord } from '../types'

export type SatRec = ReturnType<typeof satellite.twoline2satrec>

export interface SatFix {
  lat: number
  lon: number
  altKm: number
  speedKmS: number
}

export function buildSatrec(rec: TleRecord): SatRec | null {
  try {
    const sr = satellite.twoline2satrec(rec.line1, rec.line2)
    // error flag set by sgp4init on a bad element set
    if ((sr as any).error) return null
    return sr
  } catch {
    return null
  }
}

/** Propagate a satrec to `date` → geodetic position + speed. null on failure. */
export function propagateOne(satrec: SatRec, date: Date): SatFix | null {
  try {
    const pv = satellite.propagate(satrec, date)
    const p = pv?.position
    const v = pv?.velocity
    if (!p || typeof p === 'boolean' || !v || typeof v === 'boolean') return null
    const gmst = satellite.gstime(date)
    const geo = satellite.eciToGeodetic(p, gmst)
    const lat = satellite.degreesLat(geo.latitude)
    const lon = satellite.degreesLong(geo.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    const speedKmS = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    return { lat, lon, altKm: geo.height, speedKmS }
  } catch {
    return null
  }
}

/** Orbital period (minutes) and inclination (deg) straight from the element set. */
export function orbitalParams(satrec: SatRec): { periodMin: number | null; inclinationDeg: number | null } {
  const no = (satrec as any).no // mean motion, rad/min
  const inclo = (satrec as any).inclo // inclination, rad
  const periodMin = typeof no === 'number' && no > 0 ? (2 * Math.PI) / no : null
  const inclinationDeg = typeof inclo === 'number' ? (inclo * 180) / Math.PI : null
  return { periodMin, inclinationDeg }
}

/**
 * Ground track over one orbital period, split into segments at the ±180°
 * antimeridian so lines don't smear across the map.
 */
export function orbitTrack(satrec: SatRec, from: Date, periodMin: number | null): number[][][] {
  const period = periodMin && periodMin > 0 ? periodMin : 95
  const steps = 90
  const stepMs = (period * 60 * 1000) / steps
  const segments: number[][][] = []
  let seg: number[][] = []
  let prevLon: number | null = null
  for (let i = 0; i <= steps; i++) {
    const d = new Date(from.getTime() + i * stepMs)
    const fix = propagateOne(satrec, d)
    if (!fix) continue
    if (prevLon != null && Math.abs(fix.lon - prevLon) > 180) {
      if (seg.length > 1) segments.push(seg)
      seg = []
    }
    seg.push([fix.lon, fix.lat])
    prevLon = fix.lon
  }
  if (seg.length > 1) segments.push(seg)
  return segments
}
