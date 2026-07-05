import { useSyncExternalStore } from 'react'

// Real API-usage analytics: a one-time fetch interceptor counts calls to the
// WorldEye API by category (aircraft, weather, cyber, …) for the Admin panel.

export interface UsageSnapshot {
  total: number
  byCategory: Record<string, number>
  startedAt: number
}

let snap: UsageSnapshot = { total: 0, byCategory: {}, startedAt: Date.now() }
const listeners = new Set<() => void>()

function record(category: string) {
  snap = {
    ...snap,
    total: snap.total + 1,
    byCategory: { ...snap.byCategory, [category]: (snap.byCategory[category] ?? 0) + 1 },
  }
  for (const l of listeners) l()
}

export const usageStore = {
  getSnapshot: (): UsageSnapshot => snap,
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

export function useUsage(): UsageSnapshot {
  return useSyncExternalStore(usageStore.subscribe, usageStore.getSnapshot)
}

function categoryOf(url: string): string | null {
  const m = url.match(/\/api\/([a-z]+)/i)
  return m ? m[1].toLowerCase() : null
}

let installed = false
export function installUsageTracker() {
  if (installed || typeof window === 'undefined' || !window.fetch) return
  installed = true
  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      const cat = categoryOf(url)
      if (cat) record(cat)
    } catch {
      /* never let tracking break a request */
    }
    return original(input, init)
  }
}
