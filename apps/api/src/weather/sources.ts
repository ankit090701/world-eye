import { fetchJSON } from '../lib/cache.js'
import type {
  CurrentConditions,
  Cyclone,
  CycloneCategory,
  Earthquake,
  GridPoint,
  Wildfire,
} from './types.js'

// ---------- WMO weather code → text ----------
const WMO: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}
export function weatherText(code: number | null | undefined): string {
  if (code == null) return 'Unknown'
  return WMO[code] ?? `Code ${code}`
}

const CURRENT_FIELDS =
  'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape,is_day'

const num = (v: any): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// ---------- current conditions (single point) ----------
export async function currentConditions(lat: number, lon: number): Promise<CurrentConditions | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=${CURRENT_FIELDS}&wind_speed_unit=kmh&timezone=auto`
    const d = await fetchJSON(url, 7000)
    const c = d?.current
    if (!c) return null
    return {
      lat,
      lon,
      time: c.time ?? null,
      temperature: num(c.temperature_2m),
      apparentTemperature: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m),
      precipitation: num(c.precipitation),
      weatherCode: num(c.weather_code),
      weatherText: weatherText(c.weather_code),
      cloudCover: num(c.cloud_cover),
      windSpeed: num(c.wind_speed_10m),
      windDir: num(c.wind_direction_10m),
      windGusts: num(c.wind_gusts_10m),
      cape: num(c.cape),
      isDay: c.is_day === 1,
    }
  } catch {
    return null
  }
}

// ---------- global temperature / wind / cloud / lightning grid ----------
function buildGrid(): { lat: number; lon: number }[] {
  const pts: { lat: number; lon: number }[] = []
  for (let lat = -60; lat <= 70; lat += 20) {
    for (let lon = -170; lon <= 170; lon += 24) {
      pts.push({ lat, lon })
    }
  }
  return pts
}

export async function weatherGrid(): Promise<GridPoint[]> {
  const grid = buildGrid()
  const lats = grid.map((p) => p.lat).join(',')
  const lons = grid.map((p) => p.lon).join(',')
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,cape&wind_speed_unit=kmh`
  const d = await fetchJSON(url, 9000)
  const arr: any[] = Array.isArray(d) ? d : [d]
  const out: GridPoint[] = []
  for (const r of arr) {
    const c = r?.current
    if (!c) continue
    const cape = num(c.cape)
    out.push({
      lat: r.latitude,
      lon: r.longitude,
      temp: num(c.temperature_2m),
      windSpeed: num(c.wind_speed_10m),
      windDir: num(c.wind_direction_10m),
      cloud: num(c.cloud_cover),
      cape,
      code: num(c.weather_code),
      lightning: cape != null && cape > 800,
    })
  }
  return out
}

// ---------- tropical cyclones (NOAA NHC) ----------
export function cycloneCategory(windKt: number | null): CycloneCategory {
  const w = windKt ?? 0
  if (w >= 137) return 'cat5'
  if (w >= 113) return 'cat4'
  if (w >= 96) return 'cat3'
  if (w >= 83) return 'cat2'
  if (w >= 64) return 'cat1'
  if (w >= 34) return 'ts'
  return 'td'
}

// Parse NHC numeric fields defensively: '' / null → null (not 0), and drop the
// -999 "not available" sentinel some fields use.
function toNum(v: any): number | null {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!Number.isFinite(n) || n <= -999) return null
  return n
}

const BASINS: Record<string, string> = {
  AL: 'Atlantic',
  AT: 'Atlantic',
  EP: 'E. Pacific',
  CP: 'C. Pacific',
  WP: 'W. Pacific',
  IO: 'N. Indian',
  SH: 'S. Hemisphere',
}
function basinName(bin: string | null): string | null {
  if (!bin) return null
  return BASINS[bin.slice(0, 2).toUpperCase()] ?? bin
}

function parseCoord(v: any, numeric: any): number | null {
  if (typeof numeric === 'number' && Number.isFinite(numeric)) return numeric
  if (typeof v === 'string') {
    const m = v.match(/^([\d.]+)\s*([NSEW])$/i)
    if (m) {
      const n = parseFloat(m[1])
      const h = m[2].toUpperCase()
      return h === 'S' || h === 'W' ? -n : n
    }
  }
  return null
}

export async function cyclones(): Promise<Cyclone[]> {
  try {
    const d = await fetchJSON('https://www.nhc.noaa.gov/CurrentStorms.json', 8000)
    const arr: any[] = Array.isArray(d?.activeStorms) ? d.activeStorms : []
    const out: Cyclone[] = []
    for (const s of arr) {
      const lat = parseCoord(s.latitude, s.latitudeNumeric)
      const lon = parseCoord(s.longitude, s.longitudeNumeric)
      if (lat == null || lon == null) continue
      const windKt = toNum(s.intensity)
      out.push({
        id: String(s.id ?? s.binNumber ?? `${lat},${lon}`),
        name: s.name ?? 'Unnamed',
        basin: basinName(s.binNumber ?? null),
        classification: s.classification ?? '',
        category: cycloneCategory(windKt),
        lat,
        lon,
        windKt,
        pressureMb: toNum(s.pressure),
        movementDir: toNum(s.movementDir),
        movementSpeedKt: toNum(s.movementSpeed),
        lastUpdate: s.lastUpdate ?? null,
        source: 'live',
      })
    }
    return out
  } catch {
    return []
  }
}

// ---------- wildfires (NASA EONET) ----------
export async function wildfires(): Promise<Wildfire[]> {
  try {
    const d = await fetchJSON(
      'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=200',
      9000,
    )
    const events: any[] = Array.isArray(d?.events) ? d.events : []
    const out: Wildfire[] = []
    for (const e of events) {
      const geom: any[] = Array.isArray(e.geometry) ? e.geometry : []
      const g = geom[geom.length - 1]
      if (!g || g.type !== 'Point' || !Array.isArray(g.coordinates)) continue
      const [lon, lat] = g.coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number') continue
      out.push({
        id: String(e.id),
        title: e.title ?? 'Wildfire',
        lat,
        lon,
        date: g.date ?? null,
        magnitude: num(g.magnitudeValue),
        magnitudeUnit: g.magnitudeUnit ?? null,
      })
    }
    return out
  } catch {
    return []
  }
}

// ---------- earthquakes (USGS) ----------
export async function earthquakes(): Promise<Earthquake[]> {
  try {
    const d = await fetchJSON(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      9000,
    )
    const features: any[] = Array.isArray(d?.features) ? d.features : []
    const out: Earthquake[] = []
    for (const f of features) {
      const c = f.geometry?.coordinates
      if (!Array.isArray(c)) continue
      const [lon, lat, depth] = c
      if (typeof lat !== 'number' || typeof lon !== 'number') continue
      const p = f.properties ?? {}
      out.push({
        id: String(f.id),
        mag: num(p.mag),
        place: p.place ?? null,
        lat,
        lon,
        depthKm: num(depth),
        time: num(p.time),
        tsunami: p.tsunami === 1,
        url: p.url ?? null,
      })
    }
    // strongest first, cap to keep the payload lean
    out.sort((a, b) => (b.mag ?? 0) - (a.mag ?? 0))
    return out.slice(0, 400)
  } catch {
    return []
  }
}
