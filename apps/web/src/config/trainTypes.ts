import type { TrainCategory } from '../types'

export const TRAIN_COLORS: Record<TrainCategory, string> = {
  longdistance: '#34d399', // green
  commuter: '#38bdf8', // blue
  cargo: '#f59e0b', // amber
  other: '#a78bfa', // purple
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
