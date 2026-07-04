// Shared domain types for WorldEye Module 1 (World Map Dashboard).

export type Theme = 'dark' | 'light'

export type BasemapId = 'dark' | 'light' | 'voyager' | 'liberty' | 'satellite'

export type ProjectionType = 'globe' | 'mercator'

export type TimelineMode = 'live' | 'historical'

export type ToolId =
  | 'none'
  | 'measure'
  | 'draw-point'
  | 'draw-line'
  | 'draw-polygon'
  | 'draw-rectangle'
  | 'draw-circle'

export type PanelId =
  | 'layers'
  | 'search'
  | 'bookmarks'
  | 'info'
  | 'aircraft'
  | 'ships'
  | 'trains'
  | 'fleet'
  | 'traffic'
  | null

// ---- Module 2: Aircraft Tracking ----

export interface Aircraft {
  hex: string
  callsign: string | null
  registration: string | null
  type: string | null
  category: string | null
  lat: number
  lon: number
  altitude: number | null // ft
  groundSpeed: number | null // kt
  track: number | null // deg
  verticalRate: number | null // fpm
  squawk: string | null
  emergency: boolean
  emergencyKind: 'hijack' | 'radio' | 'general' | null
  onGround: boolean
  source: 'live' | 'sim'
  seen: number | null
}

export interface AircraftResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  aircraft: Aircraft[]
}

export interface Airport {
  name: string | null
  municipality: string | null
  countryName: string | null
  iata: string | null
  icao: string | null
  lat: number | null
  lon: number | null
}

export interface FlightRoute {
  airline: { name: string | null; icao: string | null; iata: string | null } | null
  origin: Airport | null
  destination: Airport | null
}

export interface AircraftMeta {
  type: string | null
  manufacturer: string | null
  registration: string | null
  owner: string | null
  registeredOwnerCountry: string | null
}

// ---- Module 3: Ship Tracking ----

export type ShipCategory =
  | 'cargo'
  | 'tanker'
  | 'passenger'
  | 'fishing'
  | 'tug'
  | 'highspeed'
  | 'military'
  | 'pleasure'
  | 'other'

export interface Ship {
  mmsi: number
  name: string | null
  shipType: number | null
  category: ShipCategory
  lat: number
  lon: number
  sog: number | null // kn
  cog: number | null // deg
  heading: number | null // deg
  navStat: number | null
  destination: string | null
  eta: string | null
  draught: number | null // m
  callSign: string | null
  imo: number | null
  source: 'live' | 'sim'
  timestamp: number | null
}

export interface ShipsResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  ships: Ship[]
}

// ---- Module 4: Train Tracking ----

export type TrainCategory = 'longdistance' | 'commuter' | 'cargo' | 'other'

export interface Train {
  id: string
  trainNumber: number
  departureDate: string
  category: TrainCategory
  trainType: string | null
  lineId: string | null
  operator: string | null
  lat: number
  lon: number
  speed: number | null // km/h
  origin: string | null
  destination: string | null
  delayMin: number | null
  source: 'live' | 'sim'
  timestamp: number | null
}

export interface TrainsResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  trains: Train[]
}

export interface TrainStop {
  shortCode: string
  name: string
  lat: number | null
  lon: number | null
  scheduled: string | null
  actual: string | null
  delayMin: number | null
  passed: boolean
  commercial: boolean
}

export interface TrainRoute {
  stops: TrainStop[]
  origin: string | null
  destination: string | null
  delayMin: number | null
}

// ---- Module 5: Fleet Tracking ----

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
  name: string
  type: VehicleType
  driver: string
  lat: number
  lon: number
  heading: number
  speed: number
  engineStatus: EngineStatus
  status: VehicleStatus
  fuelPct: number
  odometerKm: number
  lastUpdate: number
  geofence: string | null
  nextServiceKm: number
  trips: Trip[]
}

export type GeofenceType = 'depot' | 'customer' | 'restricted' | 'zone'

export interface Geofence {
  id: string
  name: string
  type: GeofenceType
  center: [number, number]
  radiusM: number
  color: string
}

export type FleetAlertType =
  | 'speeding'
  | 'geofence'
  | 'low-fuel'
  | 'idling'
  | 'maintenance'
  | 'offline'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface FleetAlert {
  id: string
  vehicleId: string
  vehicleName: string
  type: FleetAlertType
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

// ---- Module 6: Traffic Intelligence ----

export type IncidentType = 'accident' | 'roadwork' | 'closure' | 'restriction' | 'other'
export type IncidentSeverity = 'low' | 'medium' | 'high'
export type CongestionLevel = 'free' | 'moderate' | 'heavy' | 'unknown'

export interface TrafficIncident {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  title: string
  description: string | null
  roads: string | null
  lat: number
  lon: number
  startTime: number | null
  endTime: number | null
  source: 'live' | 'sim'
}

export interface FlowPoint {
  id: string
  name: string | null
  lat: number
  lon: number
  speed: number | null
  volume: number | null
  congestion: CongestionLevel
  source: 'live' | 'sim'
}

export interface TrafficResponse {
  source: 'live' | 'sim'
  now: number
  incidents: TrafficIncident[]
  flow: FlowPoint[]
}

/** A toggleable data/overlay layer shown in the Layer Controls panel. */
export interface LayerState {
  id: string
  name: string
  /** grouping for the panel */
  group: 'Overlays' | 'Reference'
  visible: boolean
  /** 0..1 */
  opacity: number
  /** legend swatch color */
  color: string
  description?: string
}

/** Demo "activity signal" — placeholder feed until real tracking modules connect. */
export interface ActivitySignal {
  id: string
  lng: number
  lat: number
  category: ActivityCategory
  intensity: number // 0..1
  timestamp: number // epoch ms
  label: string
  place: string
}

export type ActivityCategory = 'signal' | 'transit' | 'event' | 'sensor' | 'alert'

export interface Bookmark {
  id: string
  name: string
  lng: number
  lat: number
  zoom: number
  pitch: number
  bearing: number
  basemap: BasemapId
  createdAt: number
}

export interface CameraView {
  lng: number
  lat: number
  zoom: number
  pitch: number
  bearing: number
}
