// Traffic Intelligence — incidents/roadworks/closures + measured flow/congestion.
export type IncidentType = 'accident' | 'roadwork' | 'closure' | 'restriction' | 'other'
export type IncidentSeverity = 'low' | 'medium' | 'high'
export type CongestionLevel = 'free' | 'moderate' | 'heavy' | 'unknown'

export interface TrafficIncident {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  title: string
  description: string | null
  roads: string | null
  lat: number
  lon: number
  startTime: number | null
  endTime: number | null
  source: 'live' | 'sim'
}

export interface FlowPoint {
  id: string
  name: string | null
  lat: number
  lon: number
  speed: number | null // km/h (average)
  volume: number | null // vehicles/h
  congestion: CongestionLevel
  source: 'live' | 'sim'
}

export interface TrafficResponse {
  source: 'live' | 'sim'
  now: number
  incidents: TrafficIncident[]
  flow: FlowPoint[]
}

export interface BBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

/** Classify congestion from average speed (heuristic; TMS is mostly main roads). */
export function classifyCongestion(speed: number | null): CongestionLevel {
  if (speed == null) return 'unknown'
  if (speed >= 75) return 'free'
  if (speed >= 45) return 'moderate'
  return 'heavy'
}
