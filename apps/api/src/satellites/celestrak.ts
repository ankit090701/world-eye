import type { SatGroup, TleRecord } from './types.js'

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

function parseTle(text: string): TleRecord[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''))
  const out: TleRecord[] = []
  for (let i = 0; i + 2 < lines.length || (i + 2 === lines.length && lines[i]); i += 3) {
    const name = (lines[i] ?? '').trim()
    const l1 = lines[i + 1] ?? ''
    const l2 = lines[i + 2] ?? ''
    if (!name || !l1.startsWith('1 ') || !l2.startsWith('2 ')) continue
    const noradId = parseInt(l1.substring(2, 7), 10)
    if (!Number.isFinite(noradId)) continue
    out.push({ name, noradId, line1: l1, line2: l2 })
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

// Hardcoded ISS element set so the module is demonstrable even if CelesTrak is
// unreachable (epoch drifts, but propagation still yields a plausible orbit).
const ISS_FALLBACK: TleRecord[] = [
  {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    line1: '1 25544U 98067A   26185.08885440  .00007564  00000+0  14587-3 0  9998',
    line2: '2 25544  51.6303 216.4301 0006763 253.0749 106.9498 15.48879284574378',
  },
  {
    name: 'CSS (TIANHE)',
    noradId: 48274,
    line1: '1 48274U 21035A   26184.22810215  .00007882  00000+0  10678-3 0  9997',
    line2: '2 48274  41.4672 224.3616 0002880 262.1202  97.9309 15.57904594296214',
  },
]

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'WorldEye/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

// Last successful fetch per group, kept beyond the route cache's TTL. CelesTrak
// returns 403 ("data has not updated since your last download") if the same
// group is re-requested inside its 2h window, so serving the last-known-good set
// keeps the module working across cache expiries / restarts.
const lastGood = new Map<SatGroup, TleRecord[]>()

export async function fetchGroup(group: SatGroup): Promise<{ sats: TleRecord[]; source: 'live' | 'sim' }> {
  const { celestrak, cap } = GROUP_MAP[group]
  try {
    const text = await fetchText(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${celestrak}&FORMAT=tle`,
      // starlink is a large (~700 KB) payload; give the big groups more headroom.
      group === 'starlink' ? 20000 : 12000,
    )
    let sats = parseTle(text)
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
    // empty parse (e.g. a 403 throttle body) — fall through to stale/sim
    throw new Error('empty')
  } catch {
    const stale = lastGood.get(group)
    if (stale) return { sats: stale, source: 'live' } // CelesTrak throttled; serve last-known-good
    return { sats: group === 'iss' ? ISS_FALLBACK : [], source: 'sim' }
  }
}
