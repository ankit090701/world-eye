// Geodesy + coordinate helpers (no external deps — keeps install lean & reliable).
import type { Feature, FeatureCollection, LineString } from 'geojson'

const EARTH_RADIUS_M = 6371008.8

const toRad = (d: number) => (d * Math.PI) / 180

/** Great-circle (haversine) distance in metres between two [lng,lat] points. */
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Initial bearing in degrees (0-360, 0=N) from point a to b ([lng,lat]). */
export function bearingDeg(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1))
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

/** Total length in metres along a path of [lng,lat] points. */
export function pathLengthMeters(points: [number, number][]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineMeters(points[i - 1], points[i])
  return total
}

/**
 * Spherical polygon area in square metres for a ring of [lng,lat] points.
 * Uses the spherical excess (shoelace on the sphere) formula.
 */
export function polygonAreaMeters(ring: [number, number][]): number {
  if (ring.length < 3) return 0
  let total = 0
  const n = ring.length
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = ring[i]
    const [lng2, lat2] = ring[(i + 1) % n]
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${m.toFixed(0)} m`
  if (m < 100000) return `${(m / 1000).toFixed(2)} km`
  return `${(m / 1000).toFixed(0)} km`
}

export function formatArea(sqm: number): string {
  if (sqm < 1_000_000) return `${sqm.toFixed(0)} m²`
  const sqkm = sqm / 1_000_000
  if (sqkm < 100) return `${sqkm.toFixed(2)} km²`
  return `${sqkm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²`
}

/** Format a lng/lat pair as degrees-minutes-seconds. */
export function formatDMS(lng: number, lat: number): string {
  const dms = (val: number, pos: string, neg: string) => {
    const dir = val >= 0 ? pos : neg
    const abs = Math.abs(val)
    const deg = Math.floor(abs)
    const minFull = (abs - deg) * 60
    const min = Math.floor(minFull)
    const sec = ((minFull - min) * 60).toFixed(1)
    return `${deg}°${min}'${sec}"${dir}`
  }
  return `${dms(lat, 'N', 'S')} ${dms(lng, 'E', 'W')}`
}

export function formatLngLat(lng: number, lat: number, digits = 4): string {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`
}

/**
 * Parse free-text coordinate input into [lng, lat].
 * Accepts: "48.85, 2.35" | "48.85 2.35" | "2.35, 48.85" heuristics not applied —
 * we treat the first value as latitude (common convention "lat, lng").
 * Returns null if it can't be parsed as a coordinate pair.
 */
export function parseLatLng(input: string): [number, number] | null {
  const cleaned = input.trim().replace(/[()]/g, '')
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lng, lat]
}

/** Build a lat/lng graticule as a GeoJSON FeatureCollection of lines. */
export function buildGraticule(stepDeg = 20): FeatureCollection {
  const features: Feature<LineString>[] = []
  // meridians
  for (let lng = -180; lng <= 180; lng += stepDeg) {
    const coords: [number, number][] = []
    for (let lat = -80; lat <= 80; lat += 2) coords.push([lng, lat])
    features.push({
      type: 'Feature',
      properties: { major: lng % 60 === 0 },
      geometry: { type: 'LineString', coordinates: coords },
    })
  }
  // parallels
  for (let lat = -80; lat <= 80; lat += stepDeg) {
    const coords: [number, number][] = []
    for (let lng = -180; lng <= 180; lng += 2) coords.push([lng, lat])
    features.push({
      type: 'Feature',
      properties: { major: lat === 0 },
      geometry: { type: 'LineString', coordinates: coords },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** A rectangle polygon ring from two opposite corners. */
export function rectangleRing(
  a: [number, number],
  b: [number, number],
): [number, number][] {
  const [ax, ay] = a
  const [bx, by] = b
  return [
    [ax, ay],
    [bx, ay],
    [bx, by],
    [ax, by],
    [ax, ay],
  ]
}

/** Approximate circle polygon (64 pts) around centre with radius in metres. */
export function circleRing(
  center: [number, number],
  radiusMeters: number,
  steps = 64,
): [number, number][] {
  const [lng, lat] = center
  const ring: [number, number][] = []
  const latR = radiusMeters / 111320
  const lngR = radiusMeters / (111320 * Math.cos(toRad(lat)) || 1e-6)
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI
    ring.push([lng + lngR * Math.cos(theta), lat + latR * Math.sin(theta)])
  }
  return ring
}
