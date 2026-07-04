import { API_BASE } from '../config/api'
import type { NewsCategory, NewsFeedResponse, NewsMapResponse, TrendingResponse } from '../types'

async function getJSON<T>(path: string, timeoutMs = 14000): Promise<T> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal })
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null)
      throw new Error(msg || `HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    window.clearTimeout(t)
  }
}

export function fetchNewsFeed(category: NewsCategory): Promise<NewsFeedResponse> {
  return getJSON<NewsFeedResponse>(`/api/news/feed?category=${category}`)
}
export function fetchNewsMap(): Promise<NewsMapResponse> {
  return getJSON<NewsMapResponse>('/api/news/map')
}
export function fetchNewsTrending(): Promise<TrendingResponse> {
  return getJSON<TrendingResponse>('/api/news/trending')
}
