import { fetchJSON } from '../lib/cache.js'
import type { Omm, SatGroup, TleRecord } from './types.js'

// group → CelesTrak GROUP name + a sample cap (some groups have thousands of
// objects; we sample evenly so client-side propagation stays smooth).
const GROUP_MAP: Record<SatGroup, { celestrak: string; cap: number }> = {
  iss: { celestrak: 'stations', cap: 60 },
  active: { celestrak: 'visual', cap: 200 },
  starlink: { celestrak: 'starlink', cap: 300 },
  debris: { celestrak: 'cosmos-2251-debris', cap: 300 },
  launches: { celestrak: 'last-30-days', cap: 300 },
}

export function isSatGroup(g: string): g is SatGroup {
  return g === 'iss' || g === 'active' || g === 'starlink' || g === 'debris' || g === 'launches'
}

const OMM_FIELDS = [
  'OBJECT_NAME',
  'OBJECT_ID',
  'EPOCH',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'NORAD_CAT_ID',
  'ELEMENT_SET_NO',
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
] as const

/** Keeps just the fields propagation needs from CelesTrak's OMM rows, dropping malformed ones. */
function toRecords(rows: unknown): TleRecord[] {
  if (!Array.isArray(rows)) return []
  const out: TleRecord[] = []
  for (const row of rows) {
    const r = row as Record<string, unknown> | null
    if (!r || OMM_FIELDS.some((k) => r[k] == null)) continue
    const omm = Object.fromEntries(OMM_FIELDS.map((k) => [k, r[k]])) as unknown as Omm
    out.push({ name: String(omm.OBJECT_NAME).trim(), noradId: Number(omm.NORAD_CAT_ID), omm })
  }
  return out
}

function sampleEvenly<T>(arr: T[], cap: number): T[] {
  if (arr.length <= cap) return arr
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}

// Hardcoded station element sets so the module is demonstrable even if CelesTrak is
// unreachable (epoch drifts, but propagation still yields a plausible orbit).
const ISS_FALLBACK: TleRecord[] = [
  {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    omm: {
      OBJECT_NAME: 'ISS (ZARYA)',
      OBJECT_ID: '1998-067A',
      EPOCH: '2026-07-04T02:07:57.020160',
      MEAN_MOTION: 15.48879284,
      ECCENTRICITY: 0.0006763,
      INCLINATION: 51.6303,
      RA_OF_ASC_NODE: 216.4301,
      ARG_OF_PERICENTER: 253.0749,
      MEAN_ANOMALY: 106.9498,
      NORAD_CAT_ID: 25544,
      ELEMENT_SET_NO: 999,
      BSTAR: 0.00014587,
      MEAN_MOTION_DOT: 0.00007564,
      MEAN_MOTION_DDOT: 0,
    },
  },
  {
    name: 'CSS (TIANHE)',
    noradId: 48274,
    omm: {
      OBJECT_NAME: 'CSS (TIANHE)',
      OBJECT_ID: '2021-035A',
      EPOCH: '2026-07-03T05:28:28.025760',
      MEAN_MOTION: 15.57904594,
      ECCENTRICITY: 0.000288,
      INCLINATION: 41.4672,
      RA_OF_ASC_NODE: 224.3616,
      ARG_OF_PERICENTER: 262.1202,
      MEAN_ANOMALY: 97.9309,
      NORAD_CAT_ID: 48274,
      ELEMENT_SET_NO: 999,
      BSTAR: 0.00010678,
      MEAN_MOTION_DOT: 0.00007882,
      MEAN_MOTION_DDOT: 0,
    },
  },
]

// Last successful fetch per group, kept beyond the route cache's TTL. CelesTrak
// returns 403 ("data has not updated since your last download") if the same
// group is re-requested inside its 2h window, so serving the last-known-good set
// keeps the module working across cache expiries / restarts.
const lastGood = new Map<SatGroup, TleRecord[]>()

export async function fetchGroup(group: SatGroup): Promise<{ sats: TleRecord[]; source: 'live' | 'sim' }> {
  const { celestrak, cap } = GROUP_MAP[group]
  try {
    const rows = await fetchJSON(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${celestrak}&FORMAT=json`,
      // starlink is a large (several MB) payload; give the big groups more headroom.
      group === 'starlink' ? 25000 : 12000,
    )
    let sats = toRecords(rows)
    // The "stations" group is broad; keep the crewed/large stations for the ISS layer.
    if (group === 'iss') {
      const wanted = sats.filter((s) => /ISS|ZARYA|TIANHE|CSS|NAUKA|TIANGONG/i.test(s.name))
      if (wanted.length) sats = wanted
    }
    sats = sampleEvenly(sats, cap)
    if (sats.length > 0) {
      lastGood.set(group, sats)
      return { sats, source: 'live' }
    }
    // nothing usable — fall through to stale/sim
    throw new Error('empty')
  } catch {
    const stale = lastGood.get(group)
    if (stale) return { sats: stale, source: 'live' } // CelesTrak throttled; serve last-known-good
    return { sats: group === 'iss' ? ISS_FALLBACK : [], source: 'sim' }
  }
}
