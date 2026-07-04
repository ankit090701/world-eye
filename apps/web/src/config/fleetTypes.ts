import type { VehicleStatus, VehicleType } from '../types'

export const STATUS_COLORS: Record<VehicleStatus, string> = {
  moving: '#22c55e',
  idle: '#f59e0b',
  parked: '#64748b',
  offline: '#ef4444',
}

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  moving: 'Moving',
  idle: 'Idling',
  parked: 'Parked',
  offline: 'Offline',
}

export const VEHICLE_STATUSES: VehicleStatus[] = ['moving', 'idle', 'parked', 'offline']

export const TYPE_LABELS: Record<VehicleType, string> = {
  van: 'Van',
  truck: 'Truck',
  car: 'Car',
  bike: 'Bike',
}
