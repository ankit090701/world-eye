import express from 'express'
import cors from 'cors'
import { TTLCache } from './lib/cache.js'
import { fetchAdsbLol } from './aircraft/adsblol.js'
import { fetchRoute, fetchMeta } from './aircraft/adsbdb.js'
import { simulateAircraft } from './aircraft/simulator.js'
import type { AircraftResponse } from './aircraft/types.js'
import { fetchDigitrafficShips } from './ships/digitraffic.js'
import { simulateShips } from './ships/simulator.js'
import type { BBox, ShipsResponse } from './ships/types.js'
import { fetchDigitrafficTrains, fetchDigitrafficRoute } from './trains/digitraffic.js'
import { simulateTrains } from './trains/simulator.js'
import type { TrainsResponse } from './trains/types.js'
import { generateFleet } from './fleet/fleet.js'
import { fetchIncidents, fetchFlow } from './traffic/digitraffic.js'
import { simulateTraffic } from './traffic/simulator.js'
import type { BBox as TrafficBBox, TrafficResponse } from './traffic/types.js'

const PORT = Number(process.env.PORT ?? 8787)
const app = express()
app.use(cors())

// Cache aircraft responses briefly to respect the free upstream's rate limits
// even when several map clients poll the same area.
const aircraftCache = new TTLCache<AircraftResponse>(5000)
const shipsCache = new TTLCache<ShipsResponse>(8000)
const trainsCache = new TTLCache<TrainsResponse>(8000)
const trafficCache = new TTLCache<TrafficResponse>(20000)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'worldeye-api', modules: [2, 3, 4, 5, 6], time: Date.now() })
})

app.get('/api/aircraft', async (req, res) => {
  const lat = Number(req.query.lat ?? 51.47)
  const lon = Number(req.query.lon ?? -0.45)
  const radius = Math.max(1, Math.min(250, Number(req.query.radius ?? 150)))

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'invalid lat/lon' })
  }

  const key = `${lat.toFixed(1)}_${lon.toFixed(1)}_${Math.round(radius)}`
  const cached = aircraftCache.get(key)
  if (cached) return res.json(cached)

  const now = Date.now()
  let payload: AircraftResponse
  try {
    const live = await fetchAdsbLol(lat, lon, radius)
    if (live.length > 0) {
      payload = { source: 'live', now, count: live.length, aircraft: live }
    } else {
      // upstream reachable but empty (e.g. remote ocean) — synthesize so the
      // module is still demonstrable.
      const sim = simulateAircraft(lat, lon, radius, now)
      payload = { source: 'sim', now, count: sim.length, aircraft: sim }
    }
  } catch {
    const sim = simulateAircraft(lat, lon, radius, now)
    payload = { source: 'sim', now, count: sim.length, aircraft: sim }
  }

  aircraftCache.set(key, payload)
  res.json(payload)
})

app.get('/api/ships', async (req, res) => {
  const minLon = Number(req.query.minLon ?? 18)
  const minLat = Number(req.query.minLat ?? 58)
  const maxLon = Number(req.query.maxLon ?? 26)
  const maxLat = Number(req.query.maxLat ?? 61)
  if ([minLon, minLat, maxLon, maxLat].some((n) => !Number.isFinite(n))) {
    return res.status(400).json({ error: 'invalid bbox' })
  }
  const bbox: BBox = { minLon, minLat, maxLon, maxLat }

  const key = `${minLon.toFixed(1)}_${minLat.toFixed(1)}_${maxLon.toFixed(1)}_${maxLat.toFixed(1)}`
  const cached = shipsCache.get(key)
  if (cached) return res.json(cached)

  const now = Date.now()
  let payload: ShipsResponse
  try {
    const live = await fetchDigitrafficShips(bbox)
    if (live.length > 0) {
      payload = { source: 'live', now, count: live.length, ships: live }
    } else {
      const sim = simulateShips(bbox, now)
      payload = { source: 'sim', now, count: sim.length, ships: sim }
    }
  } catch {
    const sim = simulateShips(bbox, now)
    payload = { source: 'sim', now, count: sim.length, ships: sim }
  }

  shipsCache.set(key, payload)
  res.json(payload)
})

app.get('/api/traffic', async (req, res) => {
  const minLon = Number(req.query.minLon ?? 22)
  const minLat = Number(req.query.minLat ?? 60)
  const maxLon = Number(req.query.maxLon ?? 30)
  const maxLat = Number(req.query.maxLat ?? 66)
  if ([minLon, minLat, maxLon, maxLat].some((n) => !Number.isFinite(n))) {
    return res.status(400).json({ error: 'invalid bbox' })
  }
  const bbox: TrafficBBox = { minLon, minLat, maxLon, maxLat }

  const key = `${minLon.toFixed(1)}_${minLat.toFixed(1)}_${maxLon.toFixed(1)}_${maxLat.toFixed(1)}`
  const cached = trafficCache.get(key)
  if (cached) return res.json(cached)

  const now = Date.now()
  let payload: TrafficResponse
  try {
    const [incidents, flow] = await Promise.all([fetchIncidents(bbox), fetchFlow(bbox)])
    if (incidents.length > 0 || flow.length > 0) {
      payload = { source: 'live', now, incidents, flow }
    } else {
      const sim = simulateTraffic(bbox, now)
      payload = { source: 'sim', now, ...sim }
    }
  } catch {
    const sim = simulateTraffic(bbox, now)
    payload = { source: 'sim', now, ...sim }
  }

  trafficCache.set(key, payload)
  res.json(payload)
})

app.get('/api/fleet', (req, res) => {
  // Fleet = authorized, enterprise-owned devices (simulated telematics).
  // Optional depot lat/lon relocates the fleet's operating area.
  const lat = Number(req.query.lat ?? 51.5074)
  const lon = Number(req.query.lon ?? -0.1278)
  const depot: [number, number] =
    Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : [-0.1278, 51.5074]
  res.json(generateFleet(depot, Date.now()))
})

app.get('/api/trains', async (req, res) => {
  const minLon = Number(req.query.minLon ?? 22)
  const minLat = Number(req.query.minLat ?? 60)
  const maxLon = Number(req.query.maxLon ?? 30)
  const maxLat = Number(req.query.maxLat ?? 66)
  if ([minLon, minLat, maxLon, maxLat].some((n) => !Number.isFinite(n))) {
    return res.status(400).json({ error: 'invalid bbox' })
  }
  const bbox: BBox = { minLon, minLat, maxLon, maxLat }

  const key = `${minLon.toFixed(1)}_${minLat.toFixed(1)}_${maxLon.toFixed(1)}_${maxLat.toFixed(1)}`
  const cached = trainsCache.get(key)
  if (cached) return res.json(cached)

  const now = Date.now()
  let payload: TrainsResponse
  try {
    const live = await fetchDigitrafficTrains(bbox)
    if (live.length > 0) {
      payload = { source: 'live', now, count: live.length, trains: live }
    } else {
      const sim = simulateTrains(bbox, now)
      payload = { source: 'sim', now, count: sim.length, trains: sim }
    }
  } catch {
    const sim = simulateTrains(bbox, now)
    payload = { source: 'sim', now, count: sim.length, trains: sim }
  }

  trainsCache.set(key, payload)
  res.json(payload)
})

app.get('/api/trains/route/:date/:number', async (req, res) => {
  const date = String(req.params.date)
  const number = Number(req.params.number)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(number)) {
    return res.status(400).json({ error: 'invalid date/number' })
  }
  try {
    const route = await fetchDigitrafficRoute(date, number)
    res.json({ date, number, route })
  } catch {
    res.json({ date, number, route: null })
  }
})

app.get('/api/aircraft/route/:callsign', async (req, res) => {
  const callsign = String(req.params.callsign).toUpperCase()
  try {
    const route = await fetchRoute(callsign)
    res.json({ callsign, route })
  } catch {
    res.json({ callsign, route: null })
  }
})

app.get('/api/aircraft/meta/:id', async (req, res) => {
  const id = String(req.params.id).toUpperCase()
  try {
    const meta = await fetchMeta(id)
    res.json({ id, meta })
  } catch {
    res.json({ id, meta: null })
  }
})

app.get('/', (_req, res) => {
  res.type('text/plain').send('WorldEye API — see /api/health')
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[worldeye-api] listening on http://localhost:${PORT}`)
})
