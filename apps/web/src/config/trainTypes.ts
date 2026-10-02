import type { TrainCategory } from '../types'

export const TRAIN_COLORS: Record<TrainCategory, string> = {
  longdistance: '#10b981',
  commuter: '#0ea5e9',
  cargo: '#f59e0b',
  other: '#8b5cf6',
}

export const TRAIN_LABELS: Record<TrainCategory, string> = {
  longdistance: 'Long-distance',
  commuter: 'Commuter',
  cargo: 'Cargo',
  other: 'Other',
}

export const TRAIN_CATEGORIES: TrainCategory[] = [
  'longdistance',
  'commuter',
  'cargo',
  'other',
]
