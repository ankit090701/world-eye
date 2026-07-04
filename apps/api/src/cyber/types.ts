// Cyber Intelligence — IP/domain/ASN OSINT lookups + threat overlay.
// All sources free & keyless. Active port scanning is intentionally NOT
// performed (authorized-targets only) — it is gated behind a note.

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
