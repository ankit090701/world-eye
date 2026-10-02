import type { GridPoint } from './types.js'

// Deterministic fallback so the temperature layer is always demonstrable even
// when Open-Meteo is unreachable.

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
