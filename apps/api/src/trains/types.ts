// Normalized train shapes returned to the frontend (shared contract).
export type TrainCategory = 'longdistance' | 'commuter' | 'cargo' | 'other'

export interface Train {
  id: string // `${departureDate}_${trainNumber}`
  trainNumber: number
  departureDate: string
  category: TrainCategory
  trainType: string | null
  lineId: string | null // commuter line (e.g. "R", "P")
  operator: string | null
  lat: number
  lon: number
  speed: number | null // km/h
  origin: string | null
  destination: string | null
  delayMin: number | null
  source: 'live' | 'sim'
  timestamp: number | null
}

export interface TrainStop {
  shortCode: string
  name: string
  lat: number | null
  lon: number | null
  scheduled: string | null
  actual: string | null
  delayMin: number | null
  passed: boolean
  commercial: boolean
}

export interface TrainRoute {
  stops: TrainStop[]
  origin: string | null
  destination: string | null
  delayMin: number | null
}

export interface TrainsResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  trains: Train[]
}

export interface BBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export function classifyTrainCategory(c: string | null | undefined): TrainCategory {
  switch (c) {
    case 'Long-distance':
      return 'longdistance'
    case 'Commuter':
      return 'commuter'
    case 'Cargo':
      return 'cargo'
    default:
      return 'other'
  }
}
