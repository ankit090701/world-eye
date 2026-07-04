import { useMemo } from 'react'
import { useAppSelector } from '../store/hooks'
import { useActivitySignals } from '../data/activityStore'
import type { ActivitySignal } from '../types'

/** Signals visible for the current timeline playhead + window. */
export function useVisibleSignals(): ActivitySignal[] {
  const currentTime = useAppSelector((s) => s.timeline.currentTime)
  const windowMinutes = useAppSelector((s) => s.timeline.windowMinutes)
  const signals = useActivitySignals()
  return useMemo(() => {
    const lower = currentTime - windowMinutes * 60000
    return signals.filter((s) => s.timestamp <= currentTime && s.timestamp >= lower)
  }, [signals, currentTime, windowMinutes])
}
