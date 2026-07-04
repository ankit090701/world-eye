// Satellite Intelligence (Module 10) — CelesTrak TLE proxy. Orbit propagation
// happens client-side with satellite.js; the API only fetches, parses, samples
// and caches the two-line element sets (free & keyless).

export type SatGroup = 'iss' | 'active' | 'starlink' | 'debris' | 'launches'

export interface TleRecord {
  name: string
  noradId: number
  line1: string
  line2: string
}

export interface TleResponse {
  group: SatGroup
  source: 'live' | 'sim'
  count: number
  sats: TleRecord[]
}
