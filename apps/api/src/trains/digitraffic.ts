import { fetchJSON, TTLCache } from '../lib/cache.js'
import {
  classifyTrainCategory,
  type BBox,
  type Train,
  type TrainCategory,
  type TrainRoute,
  type TrainStop,
} from './types.js'

// Fintraffic Digitraffic Rail — free, keyless Finnish railway data.
const BASE = 'https://rata.digitraffic.fi/api/v1'
const DT_HEADERS = { 'Digitraffic-User': 'WorldEye/1.0' }

interface Station {
  name: string
  lat: number
  lon: number
  country: string
}
interface SlimRow {
  stationShortCode: string
  type: string
  trainStopping: boolean
  commercialStop: boolean
  scheduledTime: string | null
  actualTime: string | null
  differenceInMinutes: number | null
}
interface TrainMeta {
  category: TrainCategory
  trainType: string | null
  operator: string | null
  lineId: string | null
  rows: SlimRow[]
}

const locationsCache = new TTLCache<any[]>(10000) // 10s
const stationsCache = new TTLCache<Map<string, Station>>(24 * 60 * 60 * 1000) // 24h
const trainMetaCache = new TTLCache<TrainMeta | null>(5 * 60 * 1000) // 5min

async function getLocations(): Promise<any[]> {
  const hit = locationsCache.get('all')
  if (hit) return hit
  const data = await fetchJSON(`${BASE}/train-locations/latest`, 8000, DT_HEADERS)
  const arr = Array.isArray(data) ? data : []
  locationsCache.set('all', arr)
  return arr
}

async function getStations(): Promise<Map<string, Station>> {
  const hit = stationsCache.get('all')
  if (hit) return hit
  const map = new Map<string, Station>()
  try {
    const arr: any[] = await fetchJSON(`${BASE}/metadata/stations`, 8000, DT_HEADERS)
    for (const s of arr) {
      if (typeof s?.stationShortCode === 'string') {
        map.set(s.stationShortCode, {
          name: (s.stationName ?? s.stationShortCode).replace(/ asema$/, ''),
          lat: s.latitude,
          lon: s.longitude,
          country: s.countryCode ?? 'FI',
        })
      }
    }
  } catch {
    /* metadata is best-effort */
  }
  stationsCache.set('all', map)
  return map
}

async function getTrainMeta(date: string, num: number): Promise<TrainMeta | null> {
  const key = `${date}_${num}`
  const hit = trainMetaCache.get(key)
  if (hit !== undefined) return hit
  let meta: TrainMeta | null = null
  try {
    const arr: any[] = await fetchJSON(`${BASE}/trains/${date}/${num}`, 6000, DT_HEADERS)
    const t = Array.isArray(arr) ? arr[0] : null
    if (t) {
      const rows: SlimRow[] = Array.isArray(t.timeTableRows)
        ? t.timeTableRows.map((r: any) => ({
            stationShortCode: r.stationShortCode,
            type: r.type,
            trainStopping: !!r.trainStopping,
            commercialStop: !!r.commercialStop,
            scheduledTime: r.scheduledTime ?? null,
            actualTime: r.actualTime ?? null,
            differenceInMinutes: typeof r.differenceInMinutes === 'number' ? r.differenceInMinutes : null,
          }))
        : []
      meta = {
        category: classifyTrainCategory(t.trainCategory),
        trainType: t.trainType ?? null,
        operator: t.operatorShortCode ?? null,
        lineId: t.commuterLineID || null,
        rows,
      }
    }
  } catch {
    meta = null
  }
  trainMetaCache.set(key, meta)
  return meta
}

/** Merge consecutive same-station rows into an ordered list of stops (full path). */
function buildStops(rows: SlimRow[], stations: Map<string, Station>): TrainStop[] {
  const stops: TrainStop[] = []
  for (const r of rows) {
    const last = stops[stops.length - 1]
    if (last && last.shortCode === r.stationShortCode) {
      if (r.type === 'DEPARTURE' && r.scheduledTime) last.scheduled = r.scheduledTime
      if (r.actualTime) {
        last.actual = r.actualTime
        last.passed = true
      }
      if (r.differenceInMinutes != null) last.delayMin = r.differenceInMinutes
      last.commercial = last.commercial || r.commercialStop
    } else {
      const st = stations.get(r.stationShortCode)
      stops.push({
        shortCode: r.stationShortCode,
        name: st?.name ?? r.stationShortCode,
        lat: st?.lat ?? null,
        lon: st?.lon ?? null,
        scheduled: r.scheduledTime,
        actual: r.actualTime,
        delayMin: r.differenceInMinutes,
        passed: !!r.actualTime,
        commercial: r.commercialStop,
      })
    }
  }
  return stops
}

function currentDelay(rows: SlimRow[]): number | null {
  let d: number | null = null
  for (const r of rows) if (r.actualTime && r.differenceInMinutes != null) d = r.differenceInMinutes
  return d
}

function buildTrain(loc: any, lon: number, lat: number, meta: TrainMeta | null, stations: Map<string, Station>): Train {
  const rows = meta?.rows ?? []
  const originCode = rows[0]?.stationShortCode
  const destCode = rows[rows.length - 1]?.stationShortCode
  return {
    id: `${loc.departureDate}_${loc.trainNumber}`,
    trainNumber: loc.trainNumber,
    departureDate: loc.departureDate,
    category: meta?.category ?? 'other',
    trainType: meta?.trainType ?? null,
    lineId: meta?.lineId ?? null,
    operator: meta?.operator ?? null,
    lat,
    lon,
    speed: typeof loc.speed === 'number' ? loc.speed : null,
    origin: originCode ? (stations.get(originCode)?.name ?? originCode) : null,
    destination: destCode ? (stations.get(destCode)?.name ?? destCode) : null,
    delayMin: currentDelay(rows),
    source: 'live',
    timestamp: loc.timestamp ? Date.parse(loc.timestamp) : null,
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return out
}

const inBbox = (lon: number, lat: number, b: BBox) =>
  lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat

/** Live trains within the bbox (position + enriched metadata), capped for cost. */
export async function fetchDigitrafficTrains(bbox: BBox, cap = 60): Promise<Train[]> {
  const locs = await getLocations()
  const cLon = (bbox.minLon + bbox.maxLon) / 2
  const cLat = (bbox.minLat + bbox.maxLat) / 2
  const inView = locs
    .filter((l) => {
      const c = l?.location?.coordinates
      return Array.isArray(c) && inBbox(c[0], c[1], bbox)
    })
    .sort((a, b) => {
      const da = (a.location.coordinates[0] - cLon) ** 2 + (a.location.coordinates[1] - cLat) ** 2
      const db = (b.location.coordinates[0] - cLon) ** 2 + (b.location.coordinates[1] - cLat) ** 2
      return da - db
    })
    .slice(0, cap)

  if (inView.length === 0) return []

  const stations = await getStations()
  const trains = await mapLimit(inView, 10, async (l) => {
    const [lon, lat] = l.location.coordinates
    const meta = await getTrainMeta(l.departureDate, l.trainNumber)
    return buildTrain(l, lon, lat, meta, stations)
  })
  return trains
}

/** Full route (ordered stops with coords + schedule) for one train. */
export async function fetchDigitrafficRoute(date: string, num: number): Promise<TrainRoute | null> {
  const [meta, stations] = await Promise.all([getTrainMeta(date, num), getStations()])
  if (!meta) return null
  const stops = buildStops(meta.rows, stations)
  return {
    stops,
    origin: stops[0]?.name ?? null,
    destination: stops[stops.length - 1]?.name ?? null,
    delayMin: currentDelay(meta.rows),
  }
}
