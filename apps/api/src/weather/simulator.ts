import type { Cyclone, GridPoint } from './types.js'
import { cycloneCategory } from './sources.js'

// Deterministic fallbacks so the cyclone and temperature layers are always
// demonstrable even when NHC has no active storms or Open-Meteo is unreachable.

interface SimStorm {
  id: string
  name: string
  basin: string
  lat0: number
  lon0: number
  windKt: number
  pressure: number
}

// A few plausible storms across the main tropical basins.
const SIM_STORMS: SimStorm[] = [
  { id: 'sim-al', name: 'Simulated · Bonnie', basin: 'Atlantic', lat0: 22, lon0: -62, windKt: 85, pressure: 968 },
  { id: 'sim-ep', name: 'Simulated · Estelle', basin: 'E. Pacific', lat0: 15, lon0: -112, windKt: 110, pressure: 950 },
  { id: 'sim-wp', name: 'Simulated · Haishen', basin: 'W. Pacific', lat0: 18, lon0: 135, windKt: 130, pressure: 935 },
  { id: 'sim-ni', name: 'Simulated · Mocha', basin: 'N. Indian', lat0: 13, lon0: 88, windKt: 50, pressure: 990 },
]

export function simCyclones(now: number): Cyclone[] {
  // slow westward + poleward drift so they look alive across polls
  const hours = now / (1000 * 60 * 60)
  return SIM_STORMS.map((s) => {
    const lon = ((((s.lon0 - (hours % 48) * 0.3 + 180) % 360) + 360) % 360) - 180
    const lat = s.lat0 + Math.sin(hours / 6) * 1.2
    return {
      id: s.id,
      name: s.name,
      basin: s.basin,
      classification: s.windKt >= 64 ? 'HU' : s.windKt >= 34 ? 'TS' : 'TD',
      category: cycloneCategory(s.windKt),
      lat: Math.round(lat * 10) / 10,
      lon: Math.round(lon * 10) / 10,
      windKt: s.windKt,
      pressureMb: s.pressure,
      movementDir: 290,
      movementSpeedKt: 10,
      lastUpdate: new Date(now).toISOString(),
      source: 'sim' as const,
    }
  })
}

export function simGrid(): GridPoint[] {
  const out: GridPoint[] = []
  for (let lat = -60; lat <= 70; lat += 20) {
    for (let lon = -170; lon <= 170; lon += 24) {
      // warm near the equator, cold toward the poles, mild longitudinal ripple
      const base = 30 - Math.abs(lat) * 0.7
      const temp = Math.round((base + Math.sin((lon / 180) * Math.PI) * 4) * 10) / 10
      const cape = Math.abs(lat) < 25 ? 600 + Math.round(Math.abs(Math.sin(lon / 30)) * 900) : 50
      out.push({
        lat,
        lon,
        temp,
        windSpeed: 10 + Math.round(Math.abs(Math.cos(lat / 20)) * 25),
        windDir: (Math.round((lon + 180) * 2) % 360),
        cloud: Math.round(Math.abs(Math.sin(lon / 40 + lat / 30)) * 100),
        cape,
        code: cape > 800 ? 95 : 2,
        lightning: cape > 800,
      })
    }
  }
  return out
}
