import type {
  FleetAlert,
  FleetResponse,
  Geofence,
  Trip,
  Vehicle,
  VehicleStatus,
  VehicleType,
} from './types.js'

// Server start — used as the base epoch so odometer / distance accumulate
// smoothly across requests within a session.
const SERVER_START = Date.now()

const DRIVERS = [
  'A. Novak', 'R. Mensah', 'L. Fischer', 'S. Petrova', 'M. Okafor', 'J. Alvarez',
  'K. Yamamoto', 'D. Kowalski', 'T. Andersson', 'N. Haddad', 'P. Sharma', 'C. Rossi',
  'E. Johansson', 'B. Nguyen', 'F. Costa', 'G. Ivanov',
]
const TYPES: { type: VehicleType; w: number }[] = [
  { type: 'van', w: 0.5 },
  { type: 'truck', w: 0.25 },
  { type: 'car', w: 0.18 },
  { type: 'bike', w: 0.07 },
]
const PLACES = [
  'Depot HQ', 'Central Hub', 'North DC', 'Riverside', 'Market St', 'Industrial Park',
  'Airport Cargo', 'Harbour Gate', 'Retail Park', 'Old Town', 'Tech Campus', 'Cross Dock',
]

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI
const R = 6371008.8

function haversineM(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}
function bearing(a: [number, number], b: [number, number]): number {
  const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]))
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

interface VehicleConfig {
  route: [number, number][]
  segM: number[]
  totalM: number
  speedKph: number
  role: VehicleStatus
  type: VehicleType
  driver: string
  plate: string
  baseOdo: number
  rangeKm: number
  serviceKm: number
  parkPos: [number, number]
  phaseM: number
}

function buildConfig(depot: [number, number], i: number): VehicleConfig {
  const rng = mulberry32(hashStr(`${depot[0].toFixed(2)}_${depot[1].toFixed(2)}:${i}`))
  // a delivery loop of waypoints around the depot
  const n = 5 + Math.floor(rng() * 3)
  const route: [number, number][] = []
  const baseAngle = rng() * Math.PI * 2
  const rad = 0.03 + rng() * 0.09 // ~3-13 km
  for (let k = 0; k < n; k++) {
    const ang = baseAngle + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.6
    const rr = rad * (0.5 + rng())
    route.push([
      depot[0] + Math.cos(ang) * rr,
      depot[1] + (Math.sin(ang) * rr) / 1.6,
    ])
  }
  route.push(route[0]) // close the loop

  const segM: number[] = []
  let totalM = 0
  for (let k = 1; k < route.length; k++) {
    const d = haversineM(route[k - 1], route[k])
    segM.push(d)
    totalM += d
  }

  const roleR = rng()
  const role: VehicleStatus =
    roleR < 0.62 ? 'moving' : roleR < 0.76 ? 'idle' : roleR < 0.94 ? 'parked' : 'offline'

  let type: VehicleType = 'van'
  let acc = 0
  const tr = rng()
  for (const t of TYPES) {
    acc += t.w
    if (tr <= acc) {
      type = t.type
      break
    }
  }

  return {
    route,
    segM,
    totalM: Math.max(1, totalM),
    speedKph: type === 'bike' ? 18 + rng() * 12 : 30 + rng() * 45,
    role,
    type,
    driver: DRIVERS[i % DRIVERS.length],
    plate: `WE-${type.slice(0, 2).toUpperCase()}-${String(10 + i).padStart(2, '0')}`,
    baseOdo: Math.floor(20000 + rng() * 180000),
    rangeKm: 350 + rng() * 300,
    serviceKm: 0, // filled after odo known
    parkPos: [depot[0] + (rng() - 0.5) * 0.01, depot[1] + (rng() - 0.5) * 0.006],
    phaseM: rng() * 1e6,
  }
}

function interpolate(cfg: VehicleConfig, dist: number): { pos: [number, number]; heading: number } {
  let d = ((dist % cfg.totalM) + cfg.totalM) % cfg.totalM
  for (let k = 0; k < cfg.segM.length; k++) {
    if (d <= cfg.segM[k]) {
      const a = cfg.route[k]
      const b = cfg.route[k + 1]
      const f = cfg.segM[k] > 0 ? d / cfg.segM[k] : 0
      return { pos: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading: bearing(a, b) }
    }
    d -= cfg.segM[k]
  }
  return { pos: cfg.route[0], heading: 0 }
}

function makeGeofences(depot: [number, number]): Geofence[] {
  const off = (dx: number, dy: number): [number, number] => [depot[0] + dx, depot[1] + dy]
  return [
    { id: 'gf-depot', name: 'Depot HQ', type: 'depot', center: off(0, 0), radiusM: 900, color: '#22d3ee' },
    { id: 'gf-lez', name: 'Low-Emission Zone', type: 'zone', center: off(0, 0), radiusM: 6000, color: '#818cf8' },
    { id: 'gf-cust-n', name: 'Customer — North DC', type: 'customer', center: off(0.02, 0.05), radiusM: 700, color: '#34d399' },
    { id: 'gf-cust-e', name: 'Customer — East Retail', type: 'customer', center: off(0.07, -0.01), radiusM: 650, color: '#34d399' },
    { id: 'gf-restrict', name: 'Restricted Area', type: 'restricted', center: off(-0.05, 0.03), radiusM: 800, color: '#f43f5e' },
  ]
}

function synthTrips(cfg: VehicleConfig, i: number, now: number): Trip[] {
  const rng = mulberry32(hashStr(`${cfg.plate}:trips`))
  const trips: Trip[] = []
  let cursor = now - 30 * 60 * 1000
  for (let k = 0; k < 4; k++) {
    const dur = Math.round(15 + rng() * 70)
    const dist = Math.round((cfg.speedKph * (dur / 60)) * (0.5 + rng() * 0.5) * 10) / 10
    const end = cursor
    const start = end - dur * 60 * 1000
    trips.push({
      from: PLACES[Math.floor(rng() * PLACES.length)],
      to: PLACES[Math.floor(rng() * PLACES.length)],
      distanceKm: dist,
      durationMin: dur,
      startTime: start,
      endTime: end,
    })
    cursor = start - Math.round(rng() * 40) * 60 * 1000
  }
  return trips
}

function whichGeofence(pos: [number, number], fences: Geofence[]): string | null {
  // prefer the smallest matching zone (most specific)
  let best: Geofence | null = null
  for (const f of fences) {
    if (haversineM(pos, f.center) <= f.radiusM) {
      if (!best || f.radiusM < best.radiusM) best = f
    }
  }
  return best ? best.name : null
}

export function generateFleet(depot: [number, number], now: number, count = 16): FleetResponse {
  const fences = makeGeofences(depot)
  const elapsedS = (now - SERVER_START) / 1000
  const vehicles: Vehicle[] = []
  const alerts: FleetAlert[] = []

  for (let i = 0; i < count; i++) {
    const cfg = buildConfig(depot, i)
    let pos: [number, number]
    let heading = 0
    let speed = 0
    let status = cfg.role
    let engine: Vehicle['engineStatus'] = 'off'
    let traveledKm = 0
    // deterministic per-vehicle staleness so readouts don't jitter between polls
    const staleRng = mulberry32(hashStr(`${cfg.plate}:stale`))
    let lastUpdate = now - Math.floor(staleRng() * 15000)

    if (cfg.role === 'moving') {
      const mps = (cfg.speedKph * 1000) / 3600
      const dist = cfg.phaseM + mps * elapsedS
      const r = interpolate(cfg, dist)
      pos = r.pos
      heading = r.heading
      speed = Math.round(cfg.speedKph + Math.sin(elapsedS / 30 + i) * 8)
      speed = Math.max(0, speed)
      status = 'moving'
      engine = 'on'
      traveledKm = (mps * elapsedS) / 1000
    } else if (cfg.role === 'idle') {
      const r = interpolate(cfg, cfg.phaseM)
      pos = r.pos
      heading = r.heading
      engine = 'idle'
    } else if (cfg.role === 'parked') {
      pos = cfg.parkPos
      engine = 'off'
    } else {
      // offline — last known near a route point, stale
      pos = interpolate(cfg, cfg.phaseM).pos
      engine = 'off'
      lastUpdate = now - (5 + Math.floor(staleRng() * 40)) * 60 * 1000
    }

    const odometerKm = Math.round(cfg.baseOdo + traveledKm)
    const nextServiceKm = Math.ceil((odometerKm + 1) / 15000) * 15000
    const rangePos = ((traveledKm + cfg.phaseM / 1000) % cfg.rangeKm) / cfg.rangeKm
    const fuelPct =
      cfg.role === 'moving'
        ? Math.round(12 + 84 * (1 - rangePos))
        : Math.round(20 + (hashStr(cfg.plate) % 70))

    const geofence = whichGeofence(pos, fences)

    const v: Vehicle = {
      id: cfg.plate,
      name: cfg.plate,
      type: cfg.type,
      driver: cfg.driver,
      lat: pos[1],
      lon: pos[0],
      heading: Math.round(heading),
      speed: Math.round(speed),
      engineStatus: engine,
      status,
      fuelPct: Math.max(3, Math.min(100, fuelPct)),
      odometerKm,
      lastUpdate,
      geofence,
      nextServiceKm,
      trips: synthTrips(cfg, i, now),
    }
    vehicles.push(v)

    // ---- alerts ----
    const push = (type: FleetAlert['type'], severity: FleetAlert['severity'], message: string) =>
      alerts.push({ id: `${v.id}-${type}`, vehicleId: v.id, vehicleName: v.name, type, severity, message, time: lastUpdate })

    if (v.status === 'moving' && v.speed > 60) push('speeding', 'warning', `Speeding — ${v.speed} km/h`)
    if (v.fuelPct < 15) push('low-fuel', 'warning', `Low fuel — ${v.fuelPct}%`)
    if (v.status === 'idle') push('idling', 'info', 'Idling with engine running')
    if (v.status === 'offline') push('offline', 'warning', `No signal for ${Math.round((now - v.lastUpdate) / 60000)} min`)
    if (odometerKm >= nextServiceKm - 400) push('maintenance', 'warning', `Service due in ${nextServiceKm - odometerKm} km`)
    const inFence = fences.find((f) => f.name === geofence)
    if (inFence?.type === 'restricted') push('geofence', 'critical', `Entered restricted zone: ${geofence}`)
  }

  const sevRank: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.time - a.time)

  return { now, count: vehicles.length, vehicles, geofences: fences, alerts: alerts.slice(0, 24) }
}
