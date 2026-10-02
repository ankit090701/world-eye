import type { ShipCategory } from '../types'

export const SHIP_COLORS: Record<ShipCategory, string> = {
  cargo: '#0ea5e9',
  tanker: '#f59e0b',
  passenger: '#10b981',
  fishing: '#06b6d4',
  tug: '#8b5cf6',
  highspeed: '#ec4899',
  military: '#f43f5e',
  pleasure: '#94a3b8',
  other: '#64748b',
}

export const SHIP_LABELS: Record<ShipCategory, string> = {
  cargo: 'Cargo',
  tanker: 'Tanker',
  passenger: 'Passenger',
  fishing: 'Fishing',
  tug: 'Tug / Service',
  highspeed: 'High-speed',
  military: 'Military / Gov',
  pleasure: 'Pleasure / Sailing',
  other: 'Other',
}

export const SHIP_CATEGORIES: ShipCategory[] = [
  'cargo',
  'tanker',
  'passenger',
  'fishing',
  'tug',
  'highspeed',
  'military',
  'pleasure',
  'other',
]

export const NAV_STATUS: Record<number, string> = {
  0: 'Under way (engine)',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way (sailing)',
  15: 'Undefined',
}
