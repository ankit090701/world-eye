// Normalized aircraft shape returned to the frontend (shared contract).
export interface Aircraft {
  hex: string
  callsign: string | null
  registration: string | null
  type: string | null // ICAO aircraft type code, e.g. "A320"
  category: string | null
  lat: number
  lon: number
  altitude: number | null // feet (barometric, geometric fallback)
  groundSpeed: number | null // knots
  track: number | null // degrees (true)
  verticalRate: number | null // feet/min
  squawk: string | null
  emergency: boolean
  emergencyKind: 'hijack' | 'radio' | 'general' | null
  onGround: boolean
  source: 'live' | 'sim'
  seen: number | null // seconds since last message
}

export interface AircraftResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  aircraft: Aircraft[]
}

export interface FlightRoute {
  airline: { name: string | null; icao: string | null; iata: string | null } | null
  origin: Airport | null
  destination: Airport | null
}

export interface Airport {
  name: string | null
  municipality: string | null
  countryName: string | null
  iata: string | null
  icao: string | null
  lat: number | null
  lon: number | null
}

export interface AircraftMeta {
  type: string | null
  manufacturer: string | null
  registration: string | null
  owner: string | null
  registeredOwnerCountry: string | null
}

export const EMERGENCY_SQUAWKS: Record<string, 'hijack' | 'radio' | 'general'> = {
  '7500': 'hijack',
  '7600': 'radio',
  '7700': 'general',
}
