import { fetchJSON, TTLCache } from '../lib/cache.js'
import type { Airport, AircraftMeta, FlightRoute } from './types.js'

// adsbdb.com — free, keyless callsign->route and hex/reg->aircraft metadata.
const routeCache = new TTLCache<FlightRoute | null>(6 * 60 * 60 * 1000) // 6h
const metaCache = new TTLCache<AircraftMeta | null>(24 * 60 * 60 * 1000) // 24h

function airport(a: any): Airport | null {
  if (!a) return null
  return {
    name: a.name ?? null,
    municipality: a.municipality ?? null,
    countryName: a.country_name ?? null,
    iata: a.iata_code ?? null,
    icao: a.icao_code ?? null,
    lat: typeof a.latitude === 'number' ? a.latitude : null,
    lon: typeof a.longitude === 'number' ? a.longitude : null,
  }
}

export async function fetchRoute(callsign: string): Promise<FlightRoute | null> {
  const key = callsign.trim().toUpperCase()
  if (!key) return null
  const cached = routeCache.get(key)
  if (cached !== undefined) return cached

  let result: FlightRoute | null = null
  try {
    const data = await fetchJSON(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`)
    const fr = data?.response?.flightroute
    if (fr) {
      result = {
        airline: fr.airline
          ? {
              name: fr.airline.name ?? null,
              icao: fr.airline.icao ?? null,
              iata: fr.airline.iata ?? null,
            }
          : null,
        origin: airport(fr.origin),
        destination: airport(fr.destination),
      }
    }
  } catch {
    result = null
  }
  routeCache.set(key, result)
  return result
}

export async function fetchMeta(idOrReg: string): Promise<AircraftMeta | null> {
  const key = idOrReg.trim().toUpperCase()
  if (!key) return null
  const cached = metaCache.get(key)
  if (cached !== undefined) return cached

  let result: AircraftMeta | null = null
  try {
    const data = await fetchJSON(`https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(key)}`)
    const ac = data?.response?.aircraft
    if (ac) {
      result = {
        type: ac.type ?? ac.icao_type ?? null,
        manufacturer: ac.manufacturer ?? null,
        registration: ac.registration ?? null,
        owner: ac.registered_owner ?? null,
        registeredOwnerCountry: ac.registered_owner_country_name ?? null,
      }
    }
  } catch {
    result = null
  }
  metaCache.set(key, result)
  return result
}
