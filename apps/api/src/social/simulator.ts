import type { SocialMapPoint, SocialPost, SocialSource } from './types.js'

// Deterministic samples used only if a source is unreachable, so each tab is
// always demonstrable. Flagged origin: 'sim' in the API responses.
const SAMPLES: Record<SocialSource, { title: string; author: string; place?: string; lat?: number; lon?: number; score?: number; meta?: string }[]> = {
  bluesky: [
    { title: 'Battery research milestone', author: 'Science', place: 'Tokyo', lat: 35.68, lon: 139.69, score: 2800, meta: '2,800 posts' },
    { title: 'Weekend art share', author: 'Culture', score: 1500, meta: '1,500 posts' },
  ],
  trends: [
    { title: 'World Cup', author: 'Google Trends', meta: '500K+ searches' },
    { title: 'Election results', author: 'Google Trends', place: 'Brazil', lat: -14.24, lon: -51.93, meta: '200K+ searches' },
  ],
  mastodon: [
    { title: 'A thread on open-source mapping tools', author: '@mapper', score: 320, meta: '140 boosts · 180 favourites' },
    { title: 'Photos from this morning’s launch', author: '@spacefan', score: 210, meta: '90 boosts · 120 favourites' },
  ],
  hn: [
    { title: 'Show HN: I built a global intelligence platform', author: '@builder', score: 640, meta: '210 comments' },
    { title: 'The architecture behind real-time map rendering', author: '@dev', score: 480, meta: '95 comments' },
  ],
  telegram: [
    { title: 'Breaking: major infrastructure announcement expected today', author: '@telegram' },
    { title: 'Channel update: new features rolling out this week', author: '@durov' },
  ],
}

export function simPosts(source: SocialSource, now: number): SocialPost[] {
  return SAMPLES[source].map((s, i) => ({
    id: `sim-${source}-${i}`,
    source,
    title: s.title,
    author: s.author,
    url: 'https://worldeye.local/social',
    score: s.score ?? null,
    meta: s.meta ?? null,
    publishedAt: now - i * 1800_000,
    place: s.place ?? null,
    lat: s.lat ?? null,
    lon: s.lon ?? null,
  }))
}

export function simSocialMap(): SocialMapPoint[] {
  const pts: SocialMapPoint[] = []
  ;(['bluesky', 'trends', 'hn'] as SocialSource[]).forEach((src) => {
    for (const s of SAMPLES[src]) {
      if (s.lat == null || s.lon == null || !s.place) continue
      pts.push({ place: s.place, lat: s.lat, lon: s.lon, count: 1, source: src, title: s.title, url: 'https://worldeye.local/social' })
    }
  })
  // guarantee a couple of points even if samples lack geo
  if (pts.length === 0) {
    pts.push({ place: 'Tokyo', lat: 35.68, lon: 139.69, count: 2, source: 'bluesky', title: 'Battery research milestone', url: 'https://worldeye.local/social' })
    pts.push({ place: 'Brazil', lat: -14.24, lon: -51.93, count: 1, source: 'trends', title: 'Election results', url: 'https://worldeye.local/social' })
  }
  return pts
}
