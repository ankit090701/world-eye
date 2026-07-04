// Normalized ship shape returned to the frontend (shared contract).
export type ShipCategory =
  | 'cargo'
  | 'tanker'
  | 'passenger'
  | 'fishing'
  | 'tug'
  | 'highspeed'
  | 'military'
  | 'pleasure'
  | 'other'

export interface Ship {
  mmsi: number
  name: string | null
  shipType: number | null
  category: ShipCategory
  lat: number
  lon: number
  sog: number | null // knots (speed over ground)
  cog: number | null // degrees (course over ground)
  heading: number | null // degrees (true heading; null if unavailable)
  navStat: number | null
  destination: string | null
  eta: string | null // decoded "MM-DD HH:MM" (UTC) or null
  draught: number | null // metres
  callSign: string | null
  imo: number | null
  source: 'live' | 'sim'
  timestamp: number | null
}

export interface ShipsResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  ships: Ship[]
}

export interface BBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

/** Map an AIS ship-type code (0-99) to a WorldEye category. */
export function classifyShipType(t: number | null | undefined): ShipCategory {
  if (t == null) return 'other'
  if (t === 30) return 'fishing'
  if (t === 35) return 'military'
  if (t === 55) return 'military' // law enforcement
  if (t >= 31 && t <= 34) return 'tug' // towing / dredging / diving
  if (t >= 40 && t <= 49) return 'highspeed'
  if (t >= 50 && t <= 59) return 'tug' // pilot / tug / port service
  if (t >= 60 && t <= 69) return 'passenger'
  if (t >= 70 && t <= 79) return 'cargo'
  if (t >= 80 && t <= 89) return 'tanker'
  if (t === 36 || t === 37) return 'pleasure' // sailing / pleasure craft
  return 'other'
}

/** Decode the 20-bit AIS ETA integer into "MMM DD HH:MM" (UTC), or null. */
export function decodeEta(eta: number | null | undefined): string | null {
  if (eta == null || eta === 0) return null
  const month = (eta >> 16) & 0xf
  const day = (eta >> 11) & 0x1f
  const hour = (eta >> 6) & 0x1f
  const minute = eta & 0x3f
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${M[month - 1]} ${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(
    minute,
  ).padStart(2, '0')}`
}
