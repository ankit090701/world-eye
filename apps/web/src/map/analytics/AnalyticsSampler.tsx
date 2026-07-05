import { useEffect } from 'react'
import { trendStore } from '../../data/analyticsSampler'

// Samples live totals into a session time-series every 20s so the Analytics
// panel's trend chart has history whenever it is opened. Cheap (reads counts).
export function AnalyticsSampler() {
  useEffect(() => {
    trendStore.sample()
    const id = window.setInterval(() => trendStore.sample(), 20_000)
    return () => window.clearInterval(id)
  }, [])
  return null
}
