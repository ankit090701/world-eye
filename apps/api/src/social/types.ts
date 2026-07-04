// Social Intelligence (Module 12) — trends & public posts from keyless sources:
// Reddit (Atom RSS), Google Trends (RSS, a keyless proxy for search/X-style
// trends), Hacker News (Algolia), YouTube (Piped), and public Telegram channels.
// Titles are geoparsed (shared gazetteer) so social buzz can be mapped.

export type SocialSource = 'reddit' | 'trends' | 'youtube' | 'hn' | 'telegram'

export interface SocialPost {
  id: string
  source: SocialSource
  title: string
  author: string | null // subreddit / channel / uploader
  url: string
  score: number | null // upvotes / points / views / search volume
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
