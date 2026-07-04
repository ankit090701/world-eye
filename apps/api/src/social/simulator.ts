import type { SocialMapPoint, SocialPost, SocialSource } from './types.js'

// Deterministic samples used only if a source is unreachable, so each tab is
// always demonstrable. Flagged origin: 'sim' in the API responses.
const SAMPLES: Record<SocialSource, { title: string; author: string; place?: string; lat?: number; lon?: number; score?: number; meta?: string }[]> = {
  reddit: [
    { title: 'What is a small thing that instantly makes your day better?', author: 'r/AskReddit', score: 42000, meta: '3.1k comments' },
    { title: 'Scientists announce breakthrough in battery technology', author: 'r/science', place: 'Tokyo', lat: 35.68, lon: 139.69, score: 28000 },
  ],
  trends: [
    { title: 'World Cup', author: 'Google Trends', meta: '500K+ searches' },
    { title: 'Election results', author: 'Google Trends', place: 'Brazil', lat: -14.24, lon: -51.93, meta: '200K+ searches' },
  ],
  youtube: [
    { title: 'Official Trailer (2026)', author: 'Movie Studio', score: 4200000, meta: '4.2M views' },
    { title: 'Live: Space launch coverage', author: 'Space Channel', score: 1800000, meta: '1.8M views' },
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
  ;(['reddit', 'trends', 'hn'] as SocialSource[]).forEach((src) => {
    for (const s of SAMPLES[src]) {
      if (s.lat == null || s.lon == null || !s.place) continue
      pts.push({ place: s.place, lat: s.lat, lon: s.lon, count: 1, source: src, title: s.title, url: 'https://worldeye.local/social' })
    }
  })
  // guarantee a couple of points even if samples lack geo
  if (pts.length === 0) {
    pts.push({ place: 'Tokyo', lat: 35.68, lon: 139.69, count: 2, source: 'reddit', title: 'Battery breakthrough', url: 'https://worldeye.local/social' })
    pts.push({ place: 'Brazil', lat: -14.24, lon: -51.93, count: 1, source: 'trends', title: 'Election results', url: 'https://worldeye.local/social' })
  }
  return pts
}
