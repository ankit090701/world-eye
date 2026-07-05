import type { Aircraft, Earthquake, Ship, ThreatMapPoint } from '../types'
import type { Datum } from '../components/charts/Charts'
import { CHART_PALETTE } from '../components/charts/Charts'

// ---------- distributions ----------
export function altitudeBands(aircraft: Aircraft[]): Datum[] {
  const bands = [
    { label: '0-10k', lo: 0, hi: 10000 },
    { label: '10-20k', lo: 10000, hi: 20000 },
    { label: '20-30k', lo: 20000, hi: 30000 },
    { label: '30-40k', lo: 30000, hi: 40000 },
    { label: '40k+', lo: 40000, hi: Infinity },
  ]
  return bands.map((b, i) => ({
    label: b.label,
    value: aircraft.filter((a) => a.altitude != null && a.altitude >= b.lo && a.altitude < b.hi).length,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }))
}

export function magnitudeBands(quakes: Earthquake[]): Datum[] {
  const bands = [
    { label: '<2', lo: -Infinity, hi: 2, color: '#38bdf8' },
    { label: '2-3', lo: 2, hi: 3, color: '#34d399' },
    { label: '3-4', lo: 3, hi: 4, color: '#f59e0b' },
    { label: '4-5', lo: 4, hi: 5, color: '#fb923c' },
    { label: '5+', lo: 5, hi: Infinity, color: '#f43f5e' },
  ]
  return bands.map((b) => ({
    label: b.label,
    value: quakes.filter((q) => q.mag != null && q.mag >= b.lo && q.mag < b.hi).length,
    color: b.color,
  }))
}

export function shipsByCategory(ships: Ship[]): Datum[] {
  const counts = new Map<string, number>()
  for (const s of ships) counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
}

export function threatsByCountry(threats: ThreatMapPoint[]): Datum[] {
  const counts = new Map<string, number>()
  for (const t of threats) {
    const c = t.country ?? 'Unknown'
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
}

// ---------- timeline (earthquakes over last 24h) ----------
export function quakeTimeline(quakes: Earthquake[], now: number): Datum[] {
  const buckets = 12 // 2-hour buckets
  const span = 24 * 3600 * 1000
  const arr = new Array(buckets).fill(0)
  for (const q of quakes) {
    if (q.time == null) continue
    const age = now - q.time
    if (age < 0 || age > span) continue
    const idx = Math.min(buckets - 1, Math.floor(((span - age) / span) * buckets))
    arr[idx]++
  }
  return arr.map((value, i) => ({ label: i % 3 === 0 ? `${(buckets - i) * 2}h` : '', value, color: '#38bdf8' }))
}

// ---------- movement analysis ----------
export function speedHistogram(aircraft: Aircraft[]): { data: Datum[]; avg: number } {
  const bands = [
    { label: '<200', lo: 0, hi: 200 },
    { label: '200-300', lo: 200, hi: 300 },
    { label: '300-400', lo: 300, hi: 400 },
    { label: '400-500', lo: 400, hi: 500 },
    { label: '500+', lo: 500, hi: Infinity },
  ]
  const speeds = aircraft.map((a) => a.groundSpeed).filter((s): s is number => s != null)
  const avg = speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0
  const data = bands.map((b, i) => ({
    label: b.label,
    value: speeds.filter((s) => s >= b.lo && s < b.hi).length,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }))
  return { data, avg }
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export function headingDistribution(aircraft: Aircraft[]): Datum[] {
  const arr = new Array(8).fill(0)
  for (const a of aircraft) {
    if (a.track == null) continue
    const idx = Math.round(((a.track % 360) + 360) % 360 / 45) % 8
    arr[idx]++
  }
  return COMPASS.map((label, i) => ({ label, value: arr[i], color: '#22d3ee' }))
}

// ---------- cluster analysis (spatial grid binning) ----------
export interface Cluster {
  lat: number
  lon: number
  count: number
}
export function gridClusters(points: { lat: number; lon: number }[], cellDeg = 10): Cluster[] {
  const cells = new Map<string, { sumLat: number; sumLon: number; count: number }>()
  for (const p of points) {
    if (p.lat == null || p.lon == null) continue
    const key = `${Math.floor(p.lat / cellDeg)}_${Math.floor(p.lon / cellDeg)}`
    const c = cells.get(key) ?? { sumLat: 0, sumLon: 0, count: 0 }
    c.sumLat += p.lat
    c.sumLon += p.lon
    c.count++
    cells.set(key, c)
  }
  return Array.from(cells.values())
    .map((c) => ({ lat: c.sumLat / c.count, lon: c.sumLon / c.count, count: c.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

// ---------- export ----------
export function toCsvSection(title: string, data: Datum[]): string {
  return `# ${title}\nlabel,value\n${data.map((d) => `${JSON.stringify(d.label)},${d.value}`).join('\n')}\n`
}
