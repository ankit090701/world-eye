export type BasemapId = 'light' | 'bright' | 'liberty' | 'satellite'

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
  | 'osint'
  | 'alerts'
  | 'ai'
  | 'analytics'
  | 'reports'
  | 'admin'
  | null

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
}

export type SatGroup = 'iss' | 'active' | 'starlink' | 'debris' | 'launches'

/** CelesTrak OMM element set (JSON form: TLE text can't hold 6-digit catalog numbers). */
export type Omm = {
  OBJECT_NAME: string
  OBJECT_ID: string
  EPOCH: string
  MEAN_MOTION: number
  ECCENTRICITY: number
  INCLINATION: number
  RA_OF_ASC_NODE: number
  ARG_OF_PERICENTER: number
  MEAN_ANOMALY: number
  NORAD_CAT_ID: number
  ELEMENT_SET_NO: number
  BSTAR: number
  MEAN_MOTION_DOT: number
  MEAN_MOTION_DDOT: number
}

export interface TleRecord {
  name: string
  noradId: number
  omm: Omm
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

export type SocialSource = 'bluesky' | 'trends' | 'mastodon' | 'hn' | 'telegram'

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

export type OsintKind = 'email' | 'username' | 'phone' | 'company'

export interface OsintLocation {
  lat: number
  lon: number
  label: string
}

export interface EmailReport {
  address: string
  validFormat: boolean
  domain: string | null
  deliverable: boolean
  disposable: boolean
  freeProvider: boolean
  mx: string[]
  gravatar: {
    found: boolean
    profileUrl: string | null
    username: string | null
    displayName: string | null
    avatarUrl: string | null
  }
  breaches: { exposed: boolean; count: number; names: string[] }
  host: { ip: string | null; org: string | null; country: string | null } | null
}

export interface PlatformHit {
  platform: string
  url: string
  found: boolean
}

export interface UsernameReport {
  username: string
  github: {
    login: string
    name: string | null
    bio: string | null
    company: string | null
    location: string | null
    avatarUrl: string | null
    followers: number
    repos: number
    url: string
    createdAt: string | null
  } | null
  platforms: PlatformHit[]
}

export interface PhoneReport {
  input: string
  valid: boolean
  country: string | null
  countryName: string | null
  callingCode: string | null
  type: string | null
  national: string | null
  international: string | null
}

export interface CompanySuggestion {
  name: string
  domain: string | null
  logo: string | null
}

export interface CompanyReport {
  query: string
  top: CompanySuggestion | null
  suggestions: CompanySuggestion[]
  wikipedia: { title: string; extract: string; thumbnail: string | null; url: string | null } | null
}

export interface OsintResponse {
  kind: OsintKind
  query: string
  location: OsintLocation | null
  email?: EmailReport
  username?: UsernameReport
  phone?: PhoneReport
  company?: CompanyReport
  errors: string[]
}

export type AlertRuleType = 'emergency' | 'speed' | 'geo' | 'earthquake' | 'cyclone' | 'threat'
export type AlertSource = 'aircraft' | 'fleet'
// AlertSeverity ('info' | 'warning' | 'critical') is already defined for Module 5.
export type ChannelId = 'inapp' | 'slack' | 'discord' | 'webhook' | 'email' | 'sms'

export interface AlertRule {
  id: string
  name: string
  type: AlertRuleType
  enabled: boolean
  severity: AlertSeverity
  source: AlertSource // used by speed/geo (aircraft vs fleet)
  params: {
    threshold?: number // speed (kt for aircraft, km/h for fleet)
    lat?: number
    lon?: number
    radiusKm?: number
    minMag?: number // earthquake
    minCategory?: number // cyclone rank 0..6
  }
  channels: ChannelId[]
  createdAt: number
}

export interface AlertEvent {
  id: string
  ruleId: string
  ruleName: string
  type: AlertRuleType
  severity: AlertSeverity
  title: string
  detail: string
  lat: number | null
  lon: number | null
  time: number
}

export interface ChannelConfig {
  slack: { enabled: boolean; url: string }
  discord: { enabled: boolean; url: string }
  webhook: { enabled: boolean; url: string }
  email: { enabled: boolean; address: string }
  sms: { enabled: boolean; number: string }
}

export interface AiAction {
  label: string
  lat: number
  lon: number
  zoom?: number
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: AiAction[]
  time: number
}

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'severe'

export interface RiskAssessment {
  score: number // 0..100
  level: RiskLevel
  factors: { label: string; points: number }[]
}

export type ReportKind = 'situation' | 'analytics' | 'full'

export interface ScheduledReport {
  id: string
  name: string
  kind: ReportKind
  intervalMin: number
  delivery: 'notify' | 'webhook'
  webhookUrl: string
  enabled: boolean
  lastRun: number
}

export interface GeneratedReport {
  id: string
  title: string
  kind: ReportKind
  at: number
  markdown: string
}

export type Role = 'Administrator' | 'Analyst' | 'Operator' | 'Viewer' | 'API User'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  lastActive: number
}

export interface ApiKey {
  id: string
  name: string
  prefix: string // shown, e.g. we_ab12cd34
  last4: string
  scopes: string[]
  createdAt: number
  lastUsed: number | null
  revoked: boolean
}

export interface AuditEntry {
  id: string
  time: number
  actor: string
  action: string
  target: string | null
  severity: 'info' | 'warning'
}

export interface Organization {
  id: string
  name: string
  plan: string
  members: number
  createdAt: number
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
