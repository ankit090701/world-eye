import type { CongestionLevel, IncidentType } from '../types'

export const INCIDENT_COLORS: Record<IncidentType, string> = {
  accident: '#ef4444',
  closure: '#b91c1c',
  roadwork: '#f59e0b',
  restriction: '#38bdf8',
  other: '#94a3b8',
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  accident: 'Accident',
  closure: 'Closure',
  roadwork: 'Roadworks',
  restriction: 'Restriction',
  other: 'Notice',
}

export const INCIDENT_TYPES: IncidentType[] = [
  'accident',
  'closure',
  'roadwork',
  'restriction',
  'other',
]

export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  free: '#22c55e',
  moderate: '#f59e0b',
  heavy: '#ef4444',
  unknown: '#64748b',
}

export const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  free: 'Free-flowing',
  moderate: 'Moderate',
  heavy: 'Heavy',
  unknown: 'Unknown',
}
