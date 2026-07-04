// Fleet Tracking — authorized/enterprise-owned devices only (BRD). Simulated
// telematics feed representing an organisation's own fleet.

export type VehicleType = 'van' | 'truck' | 'car' | 'bike'
export type VehicleStatus = 'moving' | 'idle' | 'parked' | 'offline'
export type EngineStatus = 'on' | 'idle' | 'off'

export interface Trip {
  from: string
  to: string
  distanceKm: number
  durationMin: number
  startTime: number
  endTime: number
}

export interface Vehicle {
  id: string
  name: string // plate / label
  type: VehicleType
  driver: string
  lat: number
  lon: number
  heading: number
  speed: number // km/h
  engineStatus: EngineStatus
  status: VehicleStatus
  fuelPct: number
  odometerKm: number
  lastUpdate: number // epoch ms
  geofence: string | null // geofence currently inside
  nextServiceKm: number
  trips: Trip[]
}

export type GeofenceType = 'depot' | 'customer' | 'restricted' | 'zone'

export interface Geofence {
  id: string
  name: string
  type: GeofenceType
  center: [number, number] // [lon, lat]
  radiusM: number
  color: string
}

export type AlertType = 'speeding' | 'geofence' | 'low-fuel' | 'idling' | 'maintenance' | 'offline'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface FleetAlert {
  id: string
  vehicleId: string
  vehicleName: string
  type: AlertType
  severity: AlertSeverity
  message: string
  time: number
}

export interface FleetResponse {
  now: number
  count: number
  vehicles: Vehicle[]
  geofences: Geofence[]
  alerts: FleetAlert[]
}
