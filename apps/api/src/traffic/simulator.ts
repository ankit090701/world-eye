import {
  classifyCongestion,
  type BBox,
  type FlowPoint,
  type IncidentType,
  type TrafficIncident,
} from './types.js'

// Deterministic fallback traffic feed for areas outside Digitraffic (Finland).

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

const INCIDENTS: { type: IncidentType; sev: 'low' | 'medium' | 'high'; titles: string[]; w: number }[] = [
  { type: 'accident', sev: 'high', titles: ['Multi-vehicle collision', 'Vehicle accident', 'Overturned lorry'], w: 0.25 },
  { type: 'roadwork', sev: 'medium', titles: ['Roadworks — lane closed', 'Resurfacing works', 'Bridge maintenance'], w: 0.4 },
  { type: 'closure', sev: 'high', titles: ['Road closed', 'Full carriageway closure', 'Tunnel closed'], w: 0.15 },
  { type: 'restriction', sev: 'low', titles: ['Weight restriction', 'Width restriction', 'Diversion in place'], w: 0.1 },
  { type: 'other', sev: 'low', titles: ['Broken-down vehicle', 'Debris on road', 'Animal on road'], w: 0.1 },
]
const ROADS = ['A1', 'A4', 'M25', 'E45', 'Route 9', 'Ring Rd', 'Hwy 101', 'B12']

function pick<T extends { w: number }>(arr: T[], r: number): T {
  let acc = 0
  for (const x of arr) {
    acc += x.w
    if (r <= acc) return x
  }
  return arr[0]
}

export function simulateTraffic(bbox: BBox, now: number): { incidents: TrafficIncident[]; flow: FlowPoint[] } {
  const cLon = (bbox.minLon + bbox.maxLon) / 2
  const cLat = (bbox.minLat + bbox.maxLat) / 2
  const spanLon = Math.max(0.2, Math.min(40, bbox.maxLon - bbox.minLon))
  const spanLat = Math.max(0.2, Math.min(25, bbox.maxLat - bbox.minLat))
  const bucket = `${cLon.toFixed(1)}_${cLat.toFixed(1)}_${spanLon.toFixed(1)}`
  const rng = mulberry32(hashStr(bucket))

  // incidents
  const incidents: TrafficIncident[] = []
  const nInc = 5 + Math.floor(rng() * 6)
  for (let i = 0; i < nInc; i++) {
    const def = pick(INCIDENTS, rng())
    const lon = cLon + (rng() - 0.5) * spanLon * 0.8
    const lat = cLat + (rng() - 0.5) * spanLat * 0.8
    incidents.push({
      id: `sim-inc-${bucket}-${i}`,
      type: def.type,
      severity: def.sev,
      title: def.titles[Math.floor(rng() * def.titles.length)],
      description: null,
      roads: ROADS[Math.floor(rng() * ROADS.length)],
      lat,
      lon,
      startTime: now - Math.floor(rng() * 6 * 3600000),
      endTime: rng() < 0.5 ? now + Math.floor(rng() * 5 * 3600000) : null,
      source: 'sim',
    })
  }

  // flow points along a few "corridors" through the centre
  const flow: FlowPoint[] = []
  const corridors = 3 + Math.floor(rng() * 3)
  const t = now / 1000
  for (let c = 0; c < corridors; c++) {
    const ang = rng() * Math.PI * 2
    const congested = rng() < 0.4 // some corridors jammed
    const perCorridor = 8 + Math.floor(rng() * 8)
    for (let k = 0; k < perCorridor; k++) {
      const f = (k / perCorridor - 0.5) * 1.6
      const lon = cLon + Math.cos(ang) * f * spanLon * 0.5 + (rng() - 0.5) * 0.01
      const lat = cLat + Math.sin(ang) * f * spanLat * 0.5 + (rng() - 0.5) * 0.01
      const base = congested ? 25 + rng() * 30 : 60 + rng() * 50
      const speed = Math.max(5, Math.round(base + Math.sin(t / 60 + k) * 8))
      const volume = Math.round(200 + rng() * 1600)
      flow.push({
        id: `sim-flow-${bucket}-${c}-${k}`,
        name: `${ROADS[c % ROADS.length]}`,
        lat,
        lon,
        speed,
        volume,
        congestion: classifyCongestion(speed),
        source: 'sim',
      })
    }
  }

  return { incidents, flow }
}
