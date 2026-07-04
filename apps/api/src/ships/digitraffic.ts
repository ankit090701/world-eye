import { fetchJSON, TTLCache } from '../lib/cache.js'
import { classifyShipType, decodeEta, type BBox, type Ship } from './types.js'

// Fintraffic Digitraffic Marine — free, keyless AIS for the Baltic / Finnish
// waters. Locations (position/speed) are joined by MMSI with vessel metadata
// (name/type/destination/eta).
const DT_HEADERS = { 'Digitraffic-User': 'WorldEye/1.0' }
const BASE = 'https://meri.digitraffic.fi/api/ais/v1'

interface VesselMeta {
  name?: string
  shipType?: number
  destination?: string
  eta?: number
  draught?: number
  callSign?: string
  imo?: number
}

const locationsCache = new TTLCache<any>(12000) // 12s
const vesselsCache = new TTLCache<Map<number, VesselMeta>>(300000) // 5min

async function getLocations(): Promise<any> {
  const hit = locationsCache.get('all')
  if (hit) return hit
  const data = await fetchJSON(`${BASE}/locations`, 8000, DT_HEADERS)
  locationsCache.set('all', data)
  return data
}

async function getVessels(): Promise<Map<number, VesselMeta>> {
  const hit = vesselsCache.get('all')
  if (hit) return hit
  const arr: any[] = await fetchJSON(`${BASE}/vessels`, 8000, DT_HEADERS)
  const map = new Map<number, VesselMeta>()
  if (Array.isArray(arr)) {
    for (const v of arr) {
      if (typeof v?.mmsi === 'number') map.set(v.mmsi, v)
    }
  }
  vesselsCache.set('all', map)
  return map
}

const clean = (s: unknown): string | null => {
  if (typeof s !== 'string') return null
  const t = s.replace(/@/g, '').trim()
  return t.length ? t : null
}
const validDeg = (x: unknown): number | null =>
  typeof x === 'number' && x >= 0 && x < 360 ? x : null

function inBbox(lon: number, lat: number, b: BBox): boolean {
  return lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat
}

function normalize(props: any, lon: number, lat: number, meta: VesselMeta | undefined): Ship {
  const heading =
    typeof props.heading === 'number' && props.heading >= 0 && props.heading <= 359
      ? props.heading
      : null
  const sog = typeof props.sog === 'number' && props.sog >= 0 && props.sog < 102 ? props.sog : null
  const draughtRaw = meta?.draught
  const draught = typeof draughtRaw === 'number' && draughtRaw > 0 ? draughtRaw / 10 : null

  return {
    mmsi: props.mmsi,
    name: clean(meta?.name),
    shipType: typeof meta?.shipType === 'number' ? meta.shipType : null,
    category: classifyShipType(meta?.shipType ?? null),
    lat,
    lon,
    sog,
    cog: validDeg(props.cog),
    heading,
    navStat: typeof props.navStat === 'number' ? props.navStat : null,
    destination: clean(meta?.destination),
    eta: decodeEta(meta?.eta),
    draught,
    callSign: clean(meta?.callSign),
    imo: typeof meta?.imo === 'number' && meta.imo > 0 ? meta.imo : null,
    source: 'live',
    timestamp: typeof props.timestampExternal === 'number' ? props.timestampExternal : null,
  }
}

/** Fetch live AIS vessels within the bounding box (Digitraffic coverage). */
export async function fetchDigitrafficShips(bbox: BBox, limit = 1200): Promise<Ship[]> {
  // Positions are required; metadata is best-effort (a metadata hiccup must not
  // discard good live positions).
  const [locRes, vesRes] = await Promise.allSettled([getLocations(), getVessels()])
  if (locRes.status !== 'fulfilled') throw new Error('locations unavailable')
  const fc = locRes.value
  const vmap = vesRes.status === 'fulfilled' ? vesRes.value : new Map<number, VesselMeta>()
  const features: any[] = Array.isArray(fc?.features) ? fc.features : []
  const out: Ship[] = []
  for (const f of features) {
    const coords = f?.geometry?.coordinates
    if (!Array.isArray(coords)) continue
    const [lon, lat] = coords
    if (typeof lon !== 'number' || typeof lat !== 'number') continue
    if (!inBbox(lon, lat, bbox)) continue
    const props = f.properties ?? {}
    if (typeof props.mmsi !== 'number') continue
    out.push(normalize(props, lon, lat, vmap.get(props.mmsi)))
    if (out.length >= limit) break
  }
  return out
}
