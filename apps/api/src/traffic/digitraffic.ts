import { fetchJSON, TTLCache } from '../lib/cache.js'
import {
  classifyCongestion,
  type BBox,
  type FlowPoint,
  type IncidentSeverity,
  type IncidentType,
  type TrafficIncident,
} from './types.js'

// Fintraffic Digitraffic Road — free, keyless. Incidents/roadworks via
// traffic-message; measured speed/volume via TMS sensor stations.
const BASE = 'https://tie.digitraffic.fi/api'
const DT_HEADERS = { 'Digitraffic-User': 'WorldEye/1.0' }

const messagesCache = new TTLCache<any>(60000) // 1min
const tmsStationsCache = new TTLCache<Map<number, [number, number]>>(24 * 60 * 60 * 1000)
const tmsDataCache = new TTLCache<any>(60000) // 1min

const inBbox = (lon: number, lat: number, b: BBox) =>
  lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat

// ---- incidents ----

function firstPoint(geom: any): [number, number] | null {
  if (!geom) return null
  if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    return [geom.coordinates[0], geom.coordinates[1]]
  }
  if (geom.type === 'LineString' && geom.coordinates?.length) {
    return [geom.coordinates[0][0], geom.coordinates[0][1]]
  }
  if (geom.type === 'MultiLineString' && geom.coordinates?.[0]?.length) {
    return [geom.coordinates[0][0][0], geom.coordinates[0][0][1]]
  }
  return null
}

function classifyIncident(situationType: string, annType: string | null, title: string): {
  type: IncidentType
  severity: IncidentSeverity
} {
  const t = title.toLowerCase()
  const closed = t.includes('suljettu') || t.includes('closed') || t.includes('closure') || t.includes('poikki')
  if (situationType === 'ROAD_WORK') return { type: 'roadwork', severity: closed ? 'high' : 'medium' }
  if (situationType === 'WEIGHT_RESTRICTION' || situationType === 'EXEMPTED_TRANSPORT')
    return { type: 'restriction', severity: 'low' }
  if ((annType && annType.toUpperCase().includes('ACCIDENT')) || t.includes('onnettomuus') || t.includes('accident'))
    return { type: 'accident', severity: 'high' }
  if (closed) return { type: 'closure', severity: 'high' }
  return { type: 'other', severity: 'low' }
}

async function getMessages(): Promise<any> {
  const hit = messagesCache.get('all')
  if (hit) return hit
  const data = await fetchJSON(
    `${BASE}/traffic-message/v1/messages?inactiveHours=0&includeAreaGeometry=false`,
    9000,
    DT_HEADERS,
  )
  messagesCache.set('all', data)
  return data
}

export async function fetchIncidents(bbox: BBox, cap = 300): Promise<TrafficIncident[]> {
  const fc = await getMessages()
  const features: any[] = Array.isArray(fc?.features) ? fc.features : []
  const out: TrafficIncident[] = []
  for (const f of features) {
    const pt = firstPoint(f.geometry)
    if (!pt || !inBbox(pt[0], pt[1], bbox)) continue
    const p = f.properties ?? {}
    const ann = Array.isArray(p.announcements) ? p.announcements[0] : null
    const title: string = ann?.title ?? p.situationType ?? 'Traffic message'
    const { type, severity } = classifyIncident(p.situationType ?? '', p.trafficAnnouncementType ?? null, title)
    const time = ann?.timeAndDuration ?? {}
    out.push({
      id: String(p.situationId ?? `${pt[0]},${pt[1]}`),
      type,
      severity,
      title: title.slice(0, 160),
      description: ann?.location?.description ?? ann?.comment ?? null,
      roads: ann?.location?.roadAddressLocation?.primaryPoint?.roadName ?? null,
      lat: pt[1],
      lon: pt[0],
      startTime: time.startTime ? Date.parse(time.startTime) : null,
      endTime: time.endTime ? Date.parse(time.endTime) : null,
      source: 'live',
    })
    if (out.length >= cap) break
  }
  return out
}

// ---- flow / congestion (TMS) ----

async function getTmsStations(): Promise<Map<number, [number, number]>> {
  const hit = tmsStationsCache.get('all')
  if (hit) return hit
  const map = new Map<number, [number, number]>()
  try {
    const fc = await fetchJSON(`${BASE}/tms/v1/stations`, 9000, DT_HEADERS)
    for (const f of fc?.features ?? []) {
      const id = f?.properties?.id ?? f?.id
      const c = f?.geometry?.coordinates
      if (typeof id === 'number' && Array.isArray(c)) map.set(id, [c[0], c[1]])
    }
  } catch {
    /* best-effort */
  }
  // Only cache a successful (non-empty) result, so a transient failure doesn't
  // poison the 24h cache and disable congestion for a full day.
  if (map.size > 0) tmsStationsCache.set('all', map)
  return map
}

async function getTmsData(): Promise<any> {
  const hit = tmsDataCache.get('all')
  if (hit) return hit
  const data = await fetchJSON(`${BASE}/tms/v1/stations/data`, 9000, DT_HEADERS)
  tmsDataCache.set('all', data)
  return data
}

function extractSpeedVolume(sensorValues: any[]): { speed: number | null; volume: number | null } {
  const speeds: number[] = []
  let volume = 0
  let hasVolume = false
  for (const s of sensorValues) {
    const name: string = s?.name ?? ''
    const v: number = typeof s?.value === 'number' ? s.value : NaN
    if (!Number.isFinite(v)) continue
    if (name.startsWith('KESKINOPEUS') && name.includes('60MIN') && v > 0 && v < 200) speeds.push(v)
    else if (name.startsWith('OHITUKSET') && name.includes('60MIN') && v >= 0) {
      volume += v
      hasVolume = true
    }
  }
  const speed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null
  return { speed: speed != null ? Math.round(speed) : null, volume: hasVolume ? Math.round(volume) : null }
}

export async function fetchFlow(bbox: BBox, cap = 500): Promise<FlowPoint[]> {
  const [data, stations] = await Promise.all([getTmsData(), getTmsStations()])
  const out: FlowPoint[] = []
  for (const st of data?.stations ?? []) {
    const coord = stations.get(st.id)
    if (!coord || !inBbox(coord[0], coord[1], bbox)) continue
    const { speed, volume } = extractSpeedVolume(Array.isArray(st.sensorValues) ? st.sensorValues : [])
    if (speed == null && volume == null) continue
    out.push({
      id: `tms-${st.id}`,
      name: st.tmsNumber != null ? `TMS ${st.tmsNumber}` : `TMS ${st.id}`,
      lat: coord[1],
      lon: coord[0],
      speed,
      volume,
      congestion: classifyCongestion(speed),
      source: 'live',
    })
    if (out.length >= cap) break
  }
  return out
}
