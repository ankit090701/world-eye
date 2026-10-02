import type { TrainCategory } from '../types'

export const TRAIN_COLORS: Record<TrainCategory, string> = {
  longdistance: '#34d399',
  commuter: '#38bdf8',
  cargo: '#f59e0b',
  other: '#a78bfa',
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
