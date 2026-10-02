// Satellite Intelligence (Module 10) — CelesTrak element-set proxy. Orbit propagation
// happens client-side with satellite.js; the API only fetches, samples and caches the
// element sets (free & keyless). They come as OMM JSON: classic two-line (TLE) text can't
// hold the 6-digit catalog numbers that newly launched objects now get.

export type SatGroup = 'iss' | 'active' | 'starlink' | 'debris' | 'launches'

/** The OMM fields satellite.js needs to build an SGP4 record. */
export interface Omm {
  OBJECT_NAME: string
  OBJECT_ID: string
  EPOCH: string
  MEAN_MOTION: number
  ECCENTRICITY: number
  INCLINATION: number
  RA_OF_ASC_NODE: number
  ARG_OF_PERICENTER: number
  MEAN_ANOMALY: number
  NORAD_CAT_ID: number
  ELEMENT_SET_NO: number
  BSTAR: number
  MEAN_MOTION_DOT: number
  MEAN_MOTION_DDOT: number
}

export interface TleRecord {
  name: string
  noradId: number
  omm: Omm
}

export interface TleResponse {
  group: SatGroup
  source: 'live' | 'sim'
  count: number
  sats: TleRecord[]
}
