import type { Aircraft } from './types.js'
import { hashStr, mulberry32 } from '../lib/random.js'

// Deterministic fallback feed: stable identities per area, positions animate with
// `now`, so planes visibly move and build trails even when upstream is unavailable.

const AIRLINES = [
  { icao: 'BAW', reg: 'G-' },
  { icao: 'DLH', reg: 'D-' },
  { icao: 'AFR', reg: 'F-' },
  { icao: 'UAL', reg: 'N' },
  { icao: 'AAL', reg: 'N' },
  { icao: 'UAE', reg: 'A6-' },
  { icao: 'QTR', reg: 'A7-' },
  { icao: 'SIA', reg: '9V-' },
  { icao: 'KLM', reg: 'PH-' },
  { icao: 'RYR', reg: 'EI-' },
]
const TYPES = ['A320', 'A321', 'A359', 'B738', 'B77W', 'B789', 'A20N', 'E190', 'B763']

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** Move from (lat,lon) by `distNm` at math angle `ang` (radians). */
function offset(lat: number, lon: number, ang: number, distNm: number): [number, number] {
  const dLat = (distNm / 60) * Math.cos(ang)
  const dLon = (distNm / 60) * Math.sin(ang) / Math.max(0.2, Math.cos(toRad(lat)))
  return [lat + dLat, lon + dLon]
}
function bearing(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const y = Math.sin(toRad(bLon - aLon)) * Math.cos(toRad(bLat))
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLon - aLon))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function simulateAircraft(
  lat: number,
  lon: number,
  radiusNm: number,
  now: number,
  count = 26,
): Aircraft[] {
  const t = now / 1000
  const bucket = `${Math.round(lat * 2)}_${Math.round(lon * 2)}_${Math.round(radiusNm)}`
  const out: Aircraft[] = []

  for (let i = 0; i < count; i++) {
    const rng = mulberry32(hashStr(`${bucket}:${i}`))
    const baseAngle = rng() * Math.PI * 2
    const angSpeed = (rng() * 0.02 + 0.004) * (rng() < 0.5 ? 1 : -1)
    const baseR = (0.15 + rng() * 0.75) * radiusNm
    const amp = rng() * 0.12 * radiusNm
    const w = rng() * 0.05 + 0.01

    const posAt = (tt: number) => {
      const ang = baseAngle + angSpeed * tt
      const rNm = Math.max(1, baseR + amp * Math.sin(tt * w))
      return offset(lat, lon, ang, rNm)
    }
    const [plat, plon] = posAt(t)
    const [plat2, plon2] = posAt(t + 3)
    const track = bearing(plat, plon, plat2, plon2)

    const airline = AIRLINES[Math.floor(rng() * AIRLINES.length)]
    const type = TYPES[Math.floor(rng() * TYPES.length)]
    const flightNo = 100 + Math.floor(rng() * 8900)
    const onGround = rng() < 0.05
    const altitude = onGround ? 0 : Math.round((28000 + rng() * 12000) / 100) * 100
    const gs = onGround ? Math.round(rng() * 20) : Math.round(380 + rng() * 160)
    const vr = onGround ? 0 : Math.round((rng() - 0.5) * 2000)

    // ordinary codes only: a simulated plane must never look like a real emergency
    const squawk = String(1000 + Math.floor(rng() * 6000)).padStart(4, '0')

    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const regTail = Array.from({ length: 4 }, () => letters[Math.floor(rng() * letters.length)]).join('')
    out.push({
      hex: hashStr(`${bucket}:${i}`).toString(16).padStart(6, '0').slice(0, 6),
      callsign: `${airline.icao}${flightNo}`,
      registration: `${airline.reg}${regTail}`,
      type,
      category: 'A3',
      lat: plat,
      lon: plon,
      altitude,
      groundSpeed: gs,
      track: Math.round(track),
      verticalRate: vr,
      squawk,
      emergency: false,
      emergencyKind: null,
      onGround,
      source: 'sim',
      seen: 0,
    })
  }
  return out
}
