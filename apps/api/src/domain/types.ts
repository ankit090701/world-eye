// Domain Intelligence (Module 8) — WHOIS/RDAP, DNS, email security (SPF/DMARC/
// DKIM), hosting, certificates, subdomains, historical CT records + a geolocated
// hosting-infrastructure footprint. All sources free & keyless (passive OSINT
// only — certificate-transparency logs + public DNS/RDAP, no active scanning).

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

// One historical certificate-transparency record (a proxy for historical DNS —
// when a (sub)domain first appeared publicly).
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
