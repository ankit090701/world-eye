import { useSyncExternalStore } from 'react'
import type { ActivitySignal } from '../types'
import { generateHistory, generateLiveBatch, HISTORY_WINDOW_MS } from './activitySimulator'

// External store holding the full activity signal set (history + appended live).
// Kept outside Redux to avoid large state churn during live updates.

const MAX_SIGNALS = 4000

let signals: ActivitySignal[] = generateHistory(Date.now())
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const activityStore = {
  getSnapshot(): ActivitySignal[] {
    return signals
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  /** Append a fresh live batch stamped at `now`, prune to the 24h window + cap. */
  addLive(now: number, n = 3) {
    const batch = generateLiveBatch(now, n)
    const cutoff = now - HISTORY_WINDOW_MS
    let next = signals.concat(batch).filter((s) => s.timestamp >= cutoff)
    if (next.length > MAX_SIGNALS) next = next.slice(next.length - MAX_SIGNALS)
    signals = next
    emit()
  },
}

export function useActivitySignals(): ActivitySignal[] {
  return useSyncExternalStore(activityStore.subscribe, activityStore.getSnapshot)
}
