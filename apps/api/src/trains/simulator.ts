import type { BBox, Train, TrainCategory } from './types.js'

// Deterministic fallback train feed for areas outside Digitraffic (Finland)
// coverage. Stable identities per area; positions animate with `now`.

const CATS: { cat: TrainCategory; type: string; w: number }[] = [
  { cat: 'longdistance', type: 'IC', w: 0.4 },
  { cat: 'commuter', type: 'CMT', w: 0.35 },
  { cat: 'cargo', type: 'FRT', w: 0.2 },
  { cat: 'other', type: 'LOC', w: 0.05 },
]
const CITIES = [
  'Central',
  'North',
  'South',
  'East',
  'West',
  'Airport',
  'Harbour',
  'Junction',
  'Parkway',
  'Terminal',
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
function pickCat(r: number) {
  let acc = 0
  for (const c of CATS) {
    acc += c.w
    if (r <= acc) return c
  }
  return CATS[0]
}

export function simulateTrains(bbox: BBox, now: number, count = 14): Train[] {
  const cLon = (bbox.minLon + bbox.maxLon) / 2
  const cLat = (bbox.minLat + bbox.maxLat) / 2
  const spanLon = Math.max(0.3, Math.min(50, bbox.maxLon - bbox.minLon))
  const spanLat = Math.max(0.3, Math.min(30, bbox.maxLat - bbox.minLat))
  const bucket = `${cLon.toFixed(1)}_${cLat.toFixed(1)}_${spanLon.toFixed(1)}`
  const t = now / 1000
  const out: Train[] = []

  for (let i = 0; i < count; i++) {
    const rng = mulberry32(hashStr(`${bucket}:t${i}`))
    // a straight rail segment; the train oscillates back and forth along it
    const ax = cLon + (rng() - 0.5) * spanLon
    const ay = cLat + (rng() - 0.5) * spanLat
    const ang = rng() * Math.PI * 2
    const len = (0.2 + rng() * 0.5) * Math.min(spanLon, spanLat) * 2
    const bx = ax + Math.cos(ang) * len
    const by = ay + Math.sin(ang) * len
    const phase = (Math.sin(t * (0.01 + rng() * 0.02) + rng() * 6.28) + 1) / 2 // 0..1
    const lon = ax + (bx - ax) * phase
    const lat = ay + (by - ay) * phase

    const c = pickCat(rng())
    const num = 100 + Math.floor(rng() * 9000)
    const o = CITIES[Math.floor(rng() * CITIES.length)]
    let d = CITIES[Math.floor(rng() * CITIES.length)]
    if (d === o) d = CITIES[(CITIES.indexOf(o) + 3) % CITIES.length]
    const speed =
      c.cat === 'cargo' ? Math.round(40 + rng() * 50) : Math.round(60 + rng() * 100)
    const delay = rng() < 0.4 ? Math.round(rng() * 22) : 0

    out.push({
      id: `sim_${num}_${i}`,
      trainNumber: num,
      departureDate: new Date(now).toISOString().slice(0, 10),
      category: c.cat,
      trainType: c.type,
      lineId: c.cat === 'commuter' ? ['R', 'P', 'I', 'K'][Math.floor(rng() * 4)] : null,
      operator: 'sim',
      lat,
      lon,
      speed,
      origin: `${o} Station`,
      destination: `${d} Station`,
      delayMin: delay,
      source: 'sim',
      timestamp: now,
    })
  }
  return out
}
