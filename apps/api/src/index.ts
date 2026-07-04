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
import { buildReport } from './cyber/report.js'
import { threatMapPoints } from './cyber/sources.js'
import type { CyberReport, ThreatMapPoint, ThreatMapResponse } from './cyber/types.js'
import { buildDomainReport, isDomainLike, normalizeDomain } from './domain/report.js'
import type { DomainReport } from './domain/types.js'
import { currentConditions, cyclones, earthquakes, weatherGrid, wildfires } from './weather/sources.js'
import { simCyclones, simGrid } from './weather/simulator.js'
import type { WeatherEventsResponse, WeatherGridResponse } from './weather/types.js'
import { fetchGroup, isSatGroup } from './satellites/celestrak.js'
import type { TleResponse } from './satellites/types.js'
import { newsFeed, newsMap, trending } from './news/sources.js'
import { simArticles, simMapPoints, simTrending } from './news/simulator.js'
import type {
  NewsCategory,
  NewsFeedResponse,
  NewsMapResponse,
  TrendingResponse,
} from './news/types.js'
import { fetchSource, socialMap } from './social/sources.js'
import { simPosts, simSocialMap } from './social/simulator.js'
import type { SocialFeedResponse, SocialMapResponse, SocialSource } from './social/types.js'

const PORT = Number(process.env.PORT ?? 8787)
const app = express()
app.use(cors())

// Cache aircraft responses briefly to respect the free upstream's rate limits
// even when several map clients poll the same area.
const aircraftCache = new TTLCache<AircraftResponse>(5000)
const shipsCache = new TTLCache<ShipsResponse>(8000)
const trainsCache = new TTLCache<TrainsResponse>(8000)
const trafficCache = new TTLCache<TrafficResponse>(20000)
const cyberCache = new TTLCache<CyberReport>(5 * 60 * 1000)
const domainCache = new TTLCache<DomainReport>(10 * 60 * 1000)
const weatherGridCache = new TTLCache<WeatherGridResponse>(15 * 60 * 1000)
const weatherEventsCache = new TTLCache<WeatherEventsResponse>(3 * 60 * 1000)
const weatherCurrentCache = new TTLCache<any>(5 * 60 * 1000)
// TLEs update slowly (a few times/day) — cache each group ~2h.
const tleCache = new TTLCache<TleResponse>(2 * 60 * 60 * 1000)
const newsFeedCache = new TTLCache<NewsFeedResponse>(8 * 60 * 1000)
const newsMapCache = new TTLCache<NewsMapResponse>(10 * 60 * 1000)
const newsTrendingCache = new TTLCache<TrendingResponse>(10 * 60 * 1000)

const NEWS_CATEGORIES = new Set<NewsCategory>(['breaking', 'disasters', 'wars', 'economic', 'political'])

const socialFeedCache = new TTLCache<SocialFeedResponse>(8 * 60 * 1000)
const socialMapCache = new TTLCache<SocialMapResponse>(10 * 60 * 1000)
const SOCIAL_SOURCES = new Set<SocialSource>(['reddit', 'trends', 'youtube', 'hn', 'telegram'])

// Tiny in-memory per-IP rate limiter for the cyber lookup route: each uncached
// lookup fans out to several free upstreams (ip-api free = 45/min), so a single
// client hammering distinct queries could exhaust the server's shared quota.
const rlHits = new Map<string, number[]>()
function rateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = (rlHits.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= limit) {
    rlHits.set(ip, arr)
    return true
  }
  arr.push(now)
  rlHits.set(ip, arr)
  if (rlHits.size > 5000) rlHits.clear() // crude bound on memory
  return false
}

// Synthetic threat points if the live feed is unavailable, so the threat map
// always shows something. Deterministic-ish spread across known hotspots.
function simThreatPoints(): ThreatMapPoint[] {
  const spots: [number, number, string, string][] = [
    [-73.9, 40.7, 'US', 'Emotet'],
    [37.6, 55.7, 'RU', 'TrickBot'],
    [116.4, 39.9, 'CN', 'QakBot'],
    [4.9, 52.3, 'NL', 'IcedID'],
    [8.6, 50.1, 'DE', 'Dridex'],
    [105.8, 21.0, 'VN', 'C2'],
    [-46.6, -23.5, 'BR', 'BazarLoader'],
    [77.2, 28.6, 'IN', 'C2'],
    [28.9, 41.0, 'TR', 'TrickBot'],
    [12.5, 41.9, 'IT', 'Emotet'],
  ]
  return spots.map(([lon, lat, country, malware], i) => ({
    ip: `198.51.${i}.${(i * 37) % 255}`,
    malware,
    country,
    as: null,
    lat: lat + (i % 3) * 0.4,
    lon: lon + (i % 2) * 0.4,
    firstSeen: null,
  }))
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'worldeye-api', modules: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], time: Date.now() })
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

app.get('/api/cyber/lookup', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) return res.status(400).json({ error: 'missing query' })
  if (q.length > 200) return res.status(400).json({ error: 'query too long' })
  const cached = cyberCache.get(q.toLowerCase())
  if (cached) return res.json(cached) // cached hits don't touch upstreams → not rate-limited
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  if (rateLimited(`cyber:${ip}`, 20, 60000)) return res.status(429).json({ error: 'rate limited — slow down' })
  try {
    const report = await buildReport(q)
    cyberCache.set(q.toLowerCase(), report)
    res.json(report)
  } catch {
    res.status(500).json({ error: 'lookup failed' })
  }
})

app.get('/api/cyber/threats', async (_req, res) => {
  try {
    const points = await threatMapPoints()
    if (points.length > 0) {
      const payload: ThreatMapResponse = { now: Date.now(), count: points.length, source: 'live', points }
      return res.json(payload)
    }
  } catch {
    /* fall through to sim */
  }
  const sim = simThreatPoints()
  const payload: ThreatMapResponse = { now: Date.now(), count: sim.length, source: 'sim', points: sim }
  res.json(payload)
})

// Module 8: Domain Intelligence — WHOIS/RDAP, DNS, SPF/DMARC/DKIM, certs,
// subdomains, CT history + geolocated hosting footprint. Passive OSINT only.
app.get('/api/domain/lookup', async (req, res) => {
  const raw = String(req.query.q ?? '').trim()
  if (!raw) return res.status(400).json({ error: 'missing domain' })
  if (raw.length > 200) return res.status(400).json({ error: 'query too long' })
  const domain = normalizeDomain(raw)
  if (!isDomainLike(domain)) return res.status(400).json({ error: 'enter a valid domain, e.g. example.com' })
  const cached = domainCache.get(domain)
  if (cached) return res.json(cached) // cached hits don't touch upstreams → not rate-limited
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  // Separate budget from the cyber route, and lower because each uncached domain
  // lookup fans out to ~25 upstream calls (DoH + RDAP + CT + ip-api).
  if (rateLimited(`domain:${ip}`, 15, 60000)) return res.status(429).json({ error: 'rate limited — slow down' })
  try {
    const report = await buildDomainReport(domain)
    domainCache.set(domain, report)
    res.json(report)
  } catch {
    res.status(500).json({ error: 'domain lookup failed' })
  }
})

// Module 9: Weather Intelligence.
app.get('/api/weather/current', async (req, res) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'invalid lat/lon' })
  }
  const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`
  const cached = weatherCurrentCache.get(key)
  if (cached) return res.json(cached) // cached hits don't touch Open-Meteo → not rate-limited
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  if (rateLimited(`weather:${ip}`, 30, 60000)) return res.status(429).json({ error: 'rate limited — slow down' })
  try {
    const c = await currentConditions(lat, lon)
    if (!c) return res.status(502).json({ error: 'weather provider unavailable' })
    weatherCurrentCache.set(key, c)
    res.json(c)
  } catch {
    res.status(500).json({ error: 'weather lookup failed' })
  }
})

app.get('/api/weather/grid', async (_req, res) => {
  const cached = weatherGridCache.get('all')
  if (cached) return res.json(cached)
  const now = Date.now()
  let payload: WeatherGridResponse
  try {
    const points = await weatherGrid()
    payload =
      points.length > 0
        ? { source: 'live', now, count: points.length, points }
        : { source: 'sim', now, count: 0, points: simGrid() }
    if (points.length === 0) payload.count = payload.points.length
  } catch {
    const points = simGrid()
    payload = { source: 'sim', now, count: points.length, points }
  }
  weatherGridCache.set('all', payload)
  res.json(payload)
})

app.get('/api/weather/events', async (_req, res) => {
  const cached = weatherEventsCache.get('all')
  if (cached) return res.json(cached)
  const now = Date.now()
  try {
    const [liveCyclones, fires, quakes] = await Promise.all([cyclones(), wildfires(), earthquakes()])
    const useSim = liveCyclones.length === 0
    const payload: WeatherEventsResponse = {
      now,
      cyclones: useSim ? simCyclones(now) : liveCyclones,
      wildfires: fires,
      earthquakes: quakes,
      cycloneSource: useSim ? 'sim' : 'live',
    }
    weatherEventsCache.set('all', payload)
    res.json(payload)
  } catch {
    // sources catch internally, but keep the route infallible regardless
    res.json({ now, cyclones: simCyclones(now), wildfires: [], earthquakes: [], cycloneSource: 'sim' })
  }
})

// Module 10: Satellite Intelligence — CelesTrak TLE proxy (client propagates).
app.get('/api/satellites/tle', async (req, res) => {
  const group = String(req.query.group ?? 'iss')
  if (!isSatGroup(group)) {
    return res.status(400).json({ error: 'unknown group (iss|active|starlink|debris|launches)' })
  }
  const cached = tleCache.get(group)
  if (cached) return res.json(cached)
  try {
    const { sats, source } = await fetchGroup(group)
    const payload: TleResponse = { group, source, count: sats.length, sats }
    tleCache.set(group, payload)
    res.json(payload)
  } catch {
    res.status(500).json({ error: 'TLE fetch failed' })
  }
})

// Module 11: News Intelligence — Google News RSS + headline geoparsing.
app.get('/api/news/feed', async (req, res) => {
  const category = String(req.query.category ?? 'breaking') as NewsCategory
  if (!NEWS_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'unknown category' })
  }
  const cached = newsFeedCache.get(category)
  if (cached) return res.json(cached)
  const now = Date.now()
  let payload: NewsFeedResponse
  try {
    const articles = await newsFeed(category)
    payload =
      articles.length > 0
        ? { category, source: 'live', count: articles.length, articles }
        : { category, source: 'sim', count: 0, articles: simArticles(category, now) }
    if (payload.source === 'sim') payload.count = payload.articles.length
  } catch {
    const articles = simArticles(category, now)
    payload = { category, source: 'sim', count: articles.length, articles }
  }
  newsFeedCache.set(category, payload)
  res.json(payload)
})

app.get('/api/news/map', async (_req, res) => {
  const cached = newsMapCache.get('all')
  if (cached) return res.json(cached)
  const now = Date.now()
  let payload: NewsMapResponse
  try {
    const points = await newsMap()
    payload =
      points.length > 0
        ? { source: 'live', now, count: points.length, points }
        : { source: 'sim', now, count: 0, points: simMapPoints() }
    if (payload.source === 'sim') payload.count = payload.points.length
  } catch {
    const points = simMapPoints()
    payload = { source: 'sim', now, count: points.length, points }
  }
  newsMapCache.set('all', payload)
  res.json(payload)
})

app.get('/api/news/trending', async (_req, res) => {
  const cached = newsTrendingCache.get('all')
  if (cached) return res.json(cached)
  const now = Date.now()
  let payload: TrendingResponse
  try {
    const topics = await trending()
    payload = { now, topics: topics.length > 0 ? topics : simTrending() }
  } catch {
    payload = { now, topics: simTrending() }
  }
  newsTrendingCache.set('all', payload)
  res.json(payload)
})

// Module 12: Social Intelligence — Reddit / Google Trends / HN / YouTube / Telegram.
app.get('/api/social/feed', async (req, res) => {
  const source = String(req.query.source ?? 'reddit') as SocialSource
  if (!SOCIAL_SOURCES.has(source)) return res.status(400).json({ error: 'unknown source' })
  const cached = socialFeedCache.get(source)
  if (cached) return res.json(cached)
  const now = Date.now()
  let payload: SocialFeedResponse
  try {
    const posts = await fetchSource(source)
    payload =
      posts.length > 0
        ? { source, origin: 'live', count: posts.length, posts }
        : { source, origin: 'sim', count: 0, posts: simPosts(source, now) }
    if (payload.origin === 'sim') payload.count = payload.posts.length
  } catch {
    const posts = simPosts(source, now)
    payload = { source, origin: 'sim', count: posts.length, posts }
  }
  socialFeedCache.set(source, payload)
  res.json(payload)
})

app.get('/api/social/map', async (_req, res) => {
  const cached = socialMapCache.get('all')
  if (cached) return res.json(cached)
  const now = Date.now()
  let payload: SocialMapResponse
  try {
    const points = await socialMap()
    payload =
      points.length > 0
        ? { origin: 'live', now, count: points.length, points }
        : { origin: 'sim', now, count: 0, points: simSocialMap() }
    if (payload.origin === 'sim') payload.count = payload.points.length
  } catch {
    const points = simSocialMap()
    payload = { origin: 'sim', now, count: points.length, points }
  }
  socialMapCache.set('all', payload)
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
