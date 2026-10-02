// Social Intelligence (Module 12) — trends & public posts from keyless sources:
// Bluesky trending topics, Google Trends (RSS, a keyless proxy for search trends),
// Hacker News (Algolia), Mastodon trending posts, and public Telegram channels.
// Titles are geoparsed (shared gazetteer) so social buzz can be mapped.

export type SocialSource = 'bluesky' | 'trends' | 'mastodon' | 'hn' | 'telegram'

export interface SocialPost {
  id: string
  source: SocialSource
  title: string
  author: string | null // account / channel / topic category
  url: string
  score: number | null // posts / points / boosts + favourites / search volume
  meta: string | null // human label (e.g. "372 comments", "20K+ searches")
  publishedAt: number | null
  place: string | null
  lat: number | null
  lon: number | null
}

export interface SocialFeedResponse {
  source: SocialSource
  origin: 'live' | 'sim'
  count: number
  posts: SocialPost[]
}

export interface SocialMapPoint {
  place: string
  lat: number
  lon: number
  count: number
  source: SocialSource
  title: string
  url: string
}

export interface SocialMapResponse {
  origin: 'live' | 'sim'
  now: number
  count: number
  points: SocialMapPoint[]
}
