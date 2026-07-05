import type { Aircraft, AlertRule, Cyclone, CycloneCategory, Earthquake, ThreatMapPoint, Vehicle } from '../types'

export interface EvalContext {
  aircraft: Aircraft[]
  vehicles: Vehicle[]
  cyclones: Cyclone[]
  earthquakes: Earthquake[]
  threats: ThreatMapPoint[]
}

export interface Candidate {
  objectKey: string // stable per matched object → drives cooldown de-dup
  title: string
  detail: string
  lat: number | null
  lon: number | null
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Approximate geographic circle as a polygon ring [ [lon,lat], … ]. */
export function circlePolygon(lat: number, lon: number, radiusKm: number, steps = 48): number[][][] {
  const ring: number[][] = []
  const latR = radiusKm / 110.574
  const lonR = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180) || 1e-6)
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    ring.push([lon + lonR * Math.cos(a), lat + latR * Math.sin(a)])
  }
  return [ring]
}

const CAT_RANK: Record<CycloneCategory, number> = {
  td: 0, ts: 1, cat1: 2, cat2: 3, cat3: 4, cat4: 5, cat5: 6,
}
export const CATEGORY_OPTIONS: { rank: number; label: string }[] = [
  { rank: 0, label: 'Tropical depression+' },
  { rank: 1, label: 'Tropical storm+' },
  { rank: 2, label: 'Category 1+' },
  { rank: 4, label: 'Category 3+ (major)' },
  { rank: 6, label: 'Category 5' },
]

export function matchRule(rule: AlertRule, ctx: EvalContext): Candidate[] {
  const out: Candidate[] = []
  const p = rule.params

  if (rule.type === 'emergency') {
    for (const a of ctx.aircraft) {
      if (!a.emergency) continue
      out.push({
        objectKey: a.hex,
        title: `Emergency squawk · ${a.callsign ?? a.hex}`,
        detail: `${a.emergencyKind ?? 'emergency'} · ${a.registration ?? a.type ?? ''}`.trim(),
        lat: a.lat,
        lon: a.lon,
      })
    }
  } else if (rule.type === 'speed') {
    const th = p.threshold ?? 0
    if (rule.source === 'aircraft') {
      for (const a of ctx.aircraft) {
        if (a.groundSpeed != null && a.groundSpeed > th) {
          out.push({ objectKey: a.hex, title: `Overspeed · ${a.callsign ?? a.hex}`, detail: `${Math.round(a.groundSpeed)} kt (> ${th})`, lat: a.lat, lon: a.lon })
        }
      }
    } else {
      for (const v of ctx.vehicles) {
        if (v.speed > th) {
          out.push({ objectKey: v.id, title: `Speeding · ${v.name}`, detail: `${Math.round(v.speed)} km/h (> ${th})`, lat: v.lat, lon: v.lon })
        }
      }
    }
  } else if (rule.type === 'geo') {
    if (p.lat == null || p.lon == null || !p.radiusKm) return out
    if (rule.source === 'aircraft') {
      for (const a of ctx.aircraft) {
        if (haversineKm(p.lat, p.lon, a.lat, a.lon) <= p.radiusKm) {
          out.push({ objectKey: a.hex, title: `Zone entry · ${a.callsign ?? a.hex}`, detail: `aircraft inside ${p.radiusKm} km zone`, lat: a.lat, lon: a.lon })
        }
      }
    } else {
      for (const v of ctx.vehicles) {
        if (haversineKm(p.lat, p.lon, v.lat, v.lon) <= p.radiusKm) {
          out.push({ objectKey: v.id, title: `Zone entry · ${v.name}`, detail: `vehicle inside ${p.radiusKm} km zone`, lat: v.lat, lon: v.lon })
        }
      }
    }
  } else if (rule.type === 'earthquake') {
    const min = p.minMag ?? 0
    for (const q of ctx.earthquakes) {
      if (q.mag != null && q.mag >= min) {
        out.push({ objectKey: q.id, title: `Earthquake M${q.mag}`, detail: q.place ?? 'seismic event', lat: q.lat, lon: q.lon })
      }
    }
  } else if (rule.type === 'cyclone') {
    const min = p.minCategory ?? 0
    for (const c of ctx.cyclones) {
      if ((CAT_RANK[c.category] ?? 0) >= min) {
        out.push({ objectKey: c.id, title: `Cyclone · ${c.name}`, detail: `${c.category.toUpperCase()}${c.windKt != null ? ` · ${c.windKt} kt` : ''}`, lat: c.lat, lon: c.lon })
      }
    }
  } else if (rule.type === 'threat') {
    if (ctx.threats.length > 0) {
      const first = ctx.threats[0]
      out.push({
        objectKey: 'cyber-threats',
        title: `Malicious infrastructure active`,
        detail: `${ctx.threats.length} tracked C2 hosts`,
        lat: first?.lat ?? null,
        lon: first?.lon ?? null,
      })
    }
  }
  return out
}
