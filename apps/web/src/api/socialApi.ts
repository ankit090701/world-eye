import { API_BASE } from '../config/api'
import type { SocialFeedResponse, SocialMapResponse, SocialSource } from '../types'

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

export function fetchSocialFeed(source: SocialSource): Promise<SocialFeedResponse> {
  return getJSON<SocialFeedResponse>(`/api/social/feed?source=${source}`)
}
export function fetchSocialMap(): Promise<SocialMapResponse> {
  return getJSON<SocialMapResponse>('/api/social/map')
}
