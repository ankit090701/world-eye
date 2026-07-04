import type { BBox, Ship, ShipCategory } from './types.js'

// Deterministic fallback AIS feed for areas outside Digitraffic coverage, so
// ships always appear and animate. Stable identities per area; positions move
// with `now`.

const TYPES: { cat: ShipCategory; code: number; w: number; names: string[] }[] = [
  { cat: 'cargo', code: 74, w: 0.34, names: ['MAERSK', 'MSC', 'EVER', 'COSCO', 'HAPAG'] },
  { cat: 'tanker', code: 84, w: 0.2, names: ['STENA', 'FRONT', 'NORDIC', 'SEAKING', 'PACIFIC'] },
  { cat: 'fishing', code: 30, w: 0.15, names: ['NORDSTAR', 'SEAHAWK', 'ATLANTIC', 'AURORA'] },
  { cat: 'passenger', code: 60, w: 0.1, names: ['VIKING', 'SILJA', 'COLOR', 'STENA'] },
  { cat: 'tug', code: 52, w: 0.12, names: ['SVITZER', 'BOLUDA', 'PORT', 'HARBOUR'] },
  { cat: 'highspeed', code: 40, w: 0.05, names: ['EXPRESS', 'JET', 'RAPID'] },
  { cat: 'other', code: 90, w: 0.04, names: ['MARINE', 'OCEAN', 'GLOBAL'] },
]
const PORTS = [
  'ROTTERDAM',
  'SINGAPORE',
  'SHANGHAI',
  'HAMBURG',
  'ANTWERP',
  'HOUSTON',
  'FUJAIRAH',
  'GIBRALTAR',
  'SUEZ',
  'PIRAEUS',
  'VALENCIA',
  'NY/NJ',
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
function pickType(r: number) {
  let acc = 0
  for (const t of TYPES) {
    acc += t.w
    if (r <= acc) return t
  }
  return TYPES[0]
}
function fmtEta(ms: number): string {
  const d = new Date(ms)
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p = (n: number) => String(n).padStart(2, '0')
  return `${M[d.getUTCMonth()]} ${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

export function simulateShips(bbox: BBox, now: number, count = 18): Ship[] {
  const cLon = (bbox.minLon + bbox.maxLon) / 2
  const cLat = (bbox.minLat + bbox.maxLat) / 2
  const spanLon = Math.max(0.4, Math.min(60, bbox.maxLon - bbox.minLon))
  const spanLat = Math.max(0.4, Math.min(40, bbox.maxLat - bbox.minLat))
  const bucket = `${cLon.toFixed(1)}_${cLat.toFixed(1)}_${spanLon.toFixed(1)}`
  const t = now / 1000
  const out: Ship[] = []

  for (let i = 0; i < count; i++) {
    const rng = mulberry32(hashStr(`${bucket}:${i}`))
    const baseAngle = rng() * Math.PI * 2
    const angSpeed = (rng() * 0.004 + 0.0008) * (rng() < 0.5 ? 1 : -1)
    const rx = (0.12 + rng() * 0.4) * spanLon
    const ry = (0.12 + rng() * 0.4) * spanLat

    const posAt = (tt: number): [number, number] => {
      const ang = baseAngle + angSpeed * tt
      return [cLon + rx * Math.cos(ang), cLat + ry * Math.sin(ang)]
    }
    const [lon, lat] = posAt(t)
    const [lon2, lat2] = posAt(t + 60)
    const course = (Math.atan2(lon2 - lon, lat2 - lat) * 180) / Math.PI
    const heading = (course + 360) % 360

    const type = pickType(rng())
    const name = `${type.names[Math.floor(rng() * type.names.length)]} ${Math.floor(100 + rng() * 900)}`
    const sog = type.cat === 'fishing' ? 2 + rng() * 6 : 8 + rng() * 14
    const mmsi = 200000000 + (hashStr(`${bucket}:${i}`) % 799999999)
    const dest = PORTS[Math.floor(rng() * PORTS.length)]

    out.push({
      mmsi,
      name,
      shipType: type.code,
      category: type.cat,
      lat,
      lon,
      sog: Math.round(sog * 10) / 10,
      cog: Math.round(heading),
      heading: Math.round(heading),
      navStat: 0,
      destination: dest,
      eta: fmtEta(now + (4 + rng() * 60) * 3600000),
      draught: Math.round((4 + rng() * 12) * 10) / 10,
      callSign: `S${(hashStr(name) % 90000 + 10000).toString()}`,
      imo: 9000000 + (hashStr(name) % 900000),
      source: 'sim',
      timestamp: now,
    })
  }
  return out
}
