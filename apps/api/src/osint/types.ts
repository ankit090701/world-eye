// OSINT Search (Module 13) — public / consent-based OSINT only, per the BRD:
// email (format · deliverability · public Gravatar · public breach notifications),
// username (public profiles), phone METADATA (from the number itself — no owner
// lookup), company/organization (public directories). Free & keyless. No private
// data lookups, no scraping of protected content.

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
  deliverable: boolean // domain has MX records
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
  country: string | null // ISO2
  countryName: string | null
  callingCode: string | null
  type: string | null // mobile / fixed line / voip …
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
