import type { ActivityCategory, ActivitySignal } from '../types'

// -----------------------------------------------------------------------------
// DEMO DATA SOURCE
// This is a self-contained *simulated* global activity feed. It exists so that
// Module 1 (World Map Dashboard) can demonstrate heatmaps, the timeline,
// historical playback and live/real-time updates without depending on the
// later tracking modules. When Modules 2+ (aircraft, ships, trains, …) are
// wired in, their live feeds replace this simulator — the map layer plumbing
// stays the same.
// -----------------------------------------------------------------------------

const CITIES: { name: string; lng: number; lat: number; weight: number }[] = [
  { name: 'New York', lng: -74.006, lat: 40.7128, weight: 1 },
  { name: 'Los Angeles', lng: -118.2437, lat: 34.0522, weight: 0.9 },
  { name: 'Chicago', lng: -87.6298, lat: 41.8781, weight: 0.7 },
  { name: 'Toronto', lng: -79.3832, lat: 43.6532, weight: 0.6 },
  { name: 'Mexico City', lng: -99.1332, lat: 19.4326, weight: 0.8 },
  { name: 'São Paulo', lng: -46.6333, lat: -23.5505, weight: 0.8 },
  { name: 'Buenos Aires', lng: -58.3816, lat: -34.6037, weight: 0.6 },
  { name: 'Bogotá', lng: -74.0721, lat: 4.711, weight: 0.5 },
  { name: 'London', lng: -0.1276, lat: 51.5072, weight: 1 },
  { name: 'Paris', lng: 2.3522, lat: 48.8566, weight: 0.9 },
  { name: 'Madrid', lng: -3.7038, lat: 40.4168, weight: 0.6 },
  { name: 'Berlin', lng: 13.405, lat: 52.52, weight: 0.7 },
  { name: 'Rome', lng: 12.4964, lat: 41.9028, weight: 0.6 },
  { name: 'Amsterdam', lng: 4.9041, lat: 52.3676, weight: 0.5 },
  { name: 'Moscow', lng: 37.6173, lat: 55.7558, weight: 0.8 },
  { name: 'Istanbul', lng: 28.9784, lat: 41.0082, weight: 0.8 },
  { name: 'Cairo', lng: 31.2357, lat: 30.0444, weight: 0.7 },
  { name: 'Lagos', lng: 3.3792, lat: 6.5244, weight: 0.7 },
  { name: 'Nairobi', lng: 36.8219, lat: -1.2921, weight: 0.5 },
  { name: 'Johannesburg', lng: 28.0473, lat: -26.2041, weight: 0.6 },
  { name: 'Dubai', lng: 55.2708, lat: 25.2048, weight: 0.8 },
  { name: 'Riyadh', lng: 46.6753, lat: 24.7136, weight: 0.5 },
  { name: 'Tehran', lng: 51.389, lat: 35.6892, weight: 0.5 },
  { name: 'Mumbai', lng: 72.8777, lat: 19.076, weight: 0.9 },
  { name: 'Delhi', lng: 77.209, lat: 28.6139, weight: 0.9 },
  { name: 'Bengaluru', lng: 77.5946, lat: 12.9716, weight: 0.6 },
  { name: 'Singapore', lng: 103.8198, lat: 1.3521, weight: 0.9 },
  { name: 'Bangkok', lng: 100.5018, lat: 13.7563, weight: 0.7 },
  { name: 'Jakarta', lng: 106.8456, lat: -6.2088, weight: 0.7 },
  { name: 'Hong Kong', lng: 114.1694, lat: 22.3193, weight: 0.9 },
  { name: 'Shanghai', lng: 121.4737, lat: 31.2304, weight: 1 },
  { name: 'Beijing', lng: 116.4074, lat: 39.9042, weight: 0.9 },
  { name: 'Seoul', lng: 126.978, lat: 37.5665, weight: 0.8 },
  { name: 'Tokyo', lng: 139.6917, lat: 35.6895, weight: 1 },
  { name: 'Osaka', lng: 135.5023, lat: 34.6937, weight: 0.6 },
  { name: 'Sydney', lng: 151.2093, lat: -33.8688, weight: 0.7 },
  { name: 'Melbourne', lng: 144.9631, lat: -37.8136, weight: 0.6 },
  { name: 'Auckland', lng: 174.7633, lat: -36.8485, weight: 0.4 },
  { name: 'San Francisco', lng: -122.4194, lat: 37.7749, weight: 0.8 },
  { name: 'Seattle', lng: -122.3321, lat: 47.6062, weight: 0.6 },
  { name: 'Miami', lng: -80.1918, lat: 25.7617, weight: 0.6 },
  { name: 'Panama City', lng: -79.5199, lat: 8.9824, weight: 0.4 },
  { name: 'Rotterdam', lng: 4.4777, lat: 51.9244, weight: 0.5 },
  { name: 'Suez', lng: 32.5498, lat: 29.9668, weight: 0.5 },
  { name: 'Gibraltar', lng: -5.3536, lat: 36.1408, weight: 0.4 },
  { name: 'Reykjavik', lng: -21.9426, lat: 64.1466, weight: 0.3 },
]

const CATEGORIES: ActivityCategory[] = ['signal', 'transit', 'event', 'sensor', 'alert']

// Deterministic PRNG (mulberry32) so the historical scene is stable across reloads.
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

function pickCategory(r: number): ActivityCategory {
  // alerts are rarer
  if (r > 0.94) return 'alert'
  if (r > 0.78) return 'event'
  if (r > 0.55) return 'sensor'
  if (r > 0.28) return 'transit'
  return 'signal'
}

function makeSignal(
  rand: () => number,
  timestamp: number,
  idSeed: string,
): ActivitySignal {
  // choose a weighted city
  const totalW = CITIES.reduce((s, c) => s + c.weight, 0)
  let target = rand() * totalW
  let city = CITIES[0]
  for (const c of CITIES) {
    target -= c.weight
    if (target <= 0) {
      city = c
      break
    }
  }
  // jitter around the city (spread wider for a global scatter)
  const jitter = () => (rand() - 0.5) * 6
  const lng = Math.max(-179.9, Math.min(179.9, city.lng + jitter()))
  const lat = Math.max(-84, Math.min(84, city.lat + jitter() * 0.7))
  const category = pickCategory(rand())
  const intensity = category === 'alert' ? 0.7 + rand() * 0.3 : rand()
  return {
    id: `sig-${idSeed}`,
    lng,
    lat,
    category,
    intensity,
    timestamp,
    label: `${category.toUpperCase()} · ${(intensity * 100).toFixed(0)}%`,
    place: `near ${city.name}`,
  }
}

export const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

/** Build a stable historical scene of `count` signals spread over the last 24h. */
export function generateHistory(now: number, count = 700): ActivitySignal[] {
  const rand = mulberry32(1337)
  const start = now - HISTORY_WINDOW_MS
  const out: ActivitySignal[] = []
  for (let i = 0; i < count; i++) {
    // bias timestamps toward "now" so recent activity is denser
    const t = start + Math.pow(rand(), 0.7) * HISTORY_WINDOW_MS
    out.push(makeSignal(rand, t, `h${i}`))
  }
  out.sort((a, b) => a.timestamp - b.timestamp)
  return out
}

/**
 * Produce a small batch of fresh "live" signals stamped at `now`.
 * Uses Math.random (non-deterministic) — this is the real-time stream.
 */
export function generateLiveBatch(now: number, n = 3): ActivitySignal[] {
  const rand = Math.random
  const out: ActivitySignal[] = []
  for (let i = 0; i < n; i++) {
    out.push(makeSignal(rand, now, `l${now}-${i}-${Math.floor(rand() * 1e6)}`))
  }
  return out
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  signal: '#38bdf8',
  transit: '#22d3ee',
  event: '#a78bfa',
  sensor: '#34d399',
  alert: '#f43f5e',
}

export { CATEGORIES }
