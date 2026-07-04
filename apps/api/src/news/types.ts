// News Intelligence (Module 11) — global news via Google News RSS (free, keyless),
// with headline geoparsing against a built-in gazetteer so news can be plotted on
// the map. No API keys.

export type NewsCategory = 'breaking' | 'disasters' | 'wars' | 'economic' | 'political'

export interface NewsArticle {
  id: string
  title: string
  source: string | null
  url: string
  publishedAt: number | null
  category: NewsCategory
  place: string | null
  lat: number | null
  lon: number | null
}

export interface NewsFeedResponse {
  category: NewsCategory
  source: 'live' | 'sim'
  count: number
  articles: NewsArticle[]
}

export interface NewsMapPoint {
  place: string
  lat: number
  lon: number
  count: number
  category: NewsCategory
  title: string
  url: string
}

export interface NewsMapResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  points: NewsMapPoint[]
}

export interface TrendingTopic {
  term: string
  count: number
}

export interface TrendingResponse {
  now: number
  topics: TrendingTopic[]
}
