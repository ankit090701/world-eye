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
  | 'cyber'
  | 'domain'
  | 'weather'
  | 'satellites'
  | 'news'
  | 'social'
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

// ---- Module 7: Cyber Intelligence ----

export type QueryKind = 'ip' | 'domain' | 'asn' | 'unknown'

export interface GeoInfo {
  country: string | null
  countryCode: string | null
  city: string | null
  lat: number | null
  lon: number | null
  isp: string | null
  org: string | null
  as: string | null
  asname: string | null
  mobile: boolean
  proxy: boolean
  hosting: boolean
}

export interface RdapInfo {
  handle: string | null
  name: string | null
  type: string | null
  country: string | null
  startAddress: string | null
  endAddress: string | null
  cidr: string | null
  registrar: string | null
  entities: { role: string; name: string }[]
}

export interface DnsRecords {
  A: string[]
  AAAA: string[]
  MX: string[]
  NS: string[]
  TXT: string[]
}

export interface CertInfo {
  issuer: string | null
  commonName: string | null
  notBefore: string | null
  notAfter: string | null
}

export interface ThreatIntel {
  listed: boolean
  feodo: { listed: boolean; malware: string | null }
  tor: boolean
  proxy: boolean
  hosting: boolean
}

export interface CyberReport {
  query: string
  kind: QueryKind
  resolvedIp: string | null
  geo: GeoInfo | null
  cloud: string | null
  rdap: RdapInfo | null
  asn: { asn: string | null; name: string | null; country: string | null } | null
  dns: DnsRecords | null
  ptr: string | null
  certs: CertInfo[]
  threat: ThreatIntel
  ports: { supported: false; note: string }
  errors: string[]
}

export interface ThreatMapPoint {
  ip: string
  malware: string | null
  country: string | null
  as: string | null
  lat: number
  lon: number
  firstSeen: string | null
}

export interface ThreatMapResponse {
  now: number
  count: number
  source: 'live' | 'sim'
  points: ThreatMapPoint[]
}

// ---- Module 8: Domain Intelligence ----

export interface DomainWhois {
  handle: string | null
  registrar: string | null
  registrarUrl: string | null
  createdDate: string | null
  updatedDate: string | null
  expiryDate: string | null
  statuses: string[]
  nameservers: string[]
  dnssec: boolean | null
  registrant: string | null
}

export interface DomainDns {
  A: string[]
  AAAA: string[]
  MX: string[]
  NS: string[]
  TXT: string[]
  CNAME: string[]
  SOA: string[]
  CAA: string[]
}

export type SpfPolicy = 'pass' | 'neutral' | 'softfail' | 'hardfail' | 'unknown'
export type DmarcPolicy = 'none' | 'quarantine' | 'reject' | 'unknown'

export interface EmailSecurity {
  spf: { present: boolean; record: string | null; policy: SpfPolicy }
  dmarc: { present: boolean; record: string | null; policy: DmarcPolicy; pct: number | null; rua: string | null }
  dkim: { selector: string; present: boolean }[]
  mxProviders: string[]
}

export interface DomainHosting {
  ip: string | null
  country: string | null
  countryCode: string | null
  city: string | null
  isp: string | null
  org: string | null
  asn: string | null
  cloud: string | null
}

export interface DomainCert {
  issuer: string | null
  commonName: string | null
  notBefore: string | null
  notAfter: string | null
}

export interface CtHistoryEntry {
  name: string
  firstSeen: string | null
  lastSeen: string | null
  issuer: string | null
}

export type InfraRole = 'apex' | 'www' | 'mail' | 'ns' | 'sub'

export interface DomainInfraPoint {
  host: string
  ip: string
  role: InfraRole
  country: string | null
  city: string | null
  org: string | null
  as: string | null
  lat: number
  lon: number
}

export interface DomainReport {
  domain: string
  resolvedIp: string | null
  whois: DomainWhois | null
  dns: DomainDns
  email: EmailSecurity
  hosting: DomainHosting | null
  certs: DomainCert[]
  subdomains: string[]
  history: CtHistoryEntry[]
  firstSeen: string | null
  ctSource: 'certspotter' | 'crt.sh' | null
  infra: DomainInfraPoint[]
  errors: string[]
}

// ---- Module 9: Weather Intelligence ----

export interface CurrentConditions {
  lat: number
  lon: number
  time: string | null
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  precipitation: number | null
  weatherCode: number | null
  weatherText: string
  cloudCover: number | null
  windSpeed: number | null
  windDir: number | null
  windGusts: number | null
  cape: number | null
  isDay: boolean
}

export interface GridPoint {
  lat: number
  lon: number
  temp: number | null
  windSpeed: number | null
  windDir: number | null
  cloud: number | null
  cape: number | null
  code: number | null
  lightning: boolean
}

export interface WeatherGridResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  points: GridPoint[]
}

export type CycloneCategory = 'td' | 'ts' | 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5'

export interface Cyclone {
  id: string
  name: string
  basin: string | null
  classification: string
  category: CycloneCategory
  lat: number
  lon: number
  windKt: number | null
  pressureMb: number | null
  movementDir: number | null
  movementSpeedKt: number | null
  lastUpdate: string | null
  source: 'live' | 'sim'
}

export interface Wildfire {
  id: string
  title: string
  lat: number
  lon: number
  date: string | null
  magnitude: number | null
  magnitudeUnit: string | null
}

export interface Earthquake {
  id: string
  mag: number | null
  place: string | null
  lat: number
  lon: number
  depthKm: number | null
  time: number | null
  tsunami: boolean
  url: string | null
}

export interface WeatherEventsResponse {
  now: number
  cyclones: Cyclone[]
  wildfires: Wildfire[]
  earthquakes: Earthquake[]
  cycloneSource: 'live' | 'sim'
}

// ---- Module 10: Satellite Intelligence ----

export type SatGroup = 'iss' | 'active' | 'starlink' | 'debris' | 'launches'

export interface TleRecord {
  name: string
  noradId: number
  line1: string
  line2: string
}

export interface TleResponse {
  group: SatGroup
  source: 'live' | 'sim'
  count: number
  sats: TleRecord[]
}

/** A propagated satellite position (recomputed client-side every second). */
export interface SatPosition {
  noradId: number
  name: string
  group: SatGroup
  lat: number
  lon: number
  altKm: number
  speedKmS: number
  periodMin: number | null
  inclinationDeg: number | null
  selected: boolean
}

// ---- Module 11: News Intelligence ----

export type NewsCategory = 'breaking' | 'disasters' | 'wars' | 'economic' | 'political'

export interface NewsArticle {
  id: string
  title: string
  source: string | null
  url: string
  publishedAt: number | null
  category: NewsCategory
  place: string | null
  lat: number | null
  lon: number | null
}

export interface NewsFeedResponse {
  category: NewsCategory
  source: 'live' | 'sim'
  count: number
  articles: NewsArticle[]
}

export interface NewsMapPoint {
  place: string
  lat: number
  lon: number
  count: number
  category: NewsCategory
  title: string
  url: string
}

export interface NewsMapResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  points: NewsMapPoint[]
}

export interface TrendingTopic {
  term: string
  count: number
}

export interface TrendingResponse {
  now: number
  topics: TrendingTopic[]
}

// ---- Module 12: Social Intelligence ----

export type SocialSource = 'reddit' | 'trends' | 'youtube' | 'hn' | 'telegram'

export interface SocialPost {
  id: string
  source: SocialSource
  title: string
  author: string | null
  url: string
  score: number | null
  meta: string | null
  publishedAt: number | null
  place: string | null
  lat: number | null
  lon: number | null
}

export interface SocialFeedResponse {
  source: SocialSource
  origin: 'live' | 'sim'
  count: number
  posts: SocialPost[]
}

export interface SocialMapPoint {
  place: string
  lat: number
  lon: number
  count: number
  source: SocialSource
  title: string
  url: string
}

export interface SocialMapResponse {
  origin: 'live' | 'sim'
  now: number
  count: number
  points: SocialMapPoint[]
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
