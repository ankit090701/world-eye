import { createHash } from 'node:crypto'
import { parsePhoneNumber } from 'libphonenumber-js'
import { fetchJSON } from '../lib/cache.js'
import { doh, geoIp } from '../cyber/sources.js'
import { geoparse } from '../news/gazetteer.js'
import { COUNTRIES } from './countries.js'
import type {
  CompanyReport,
  CompanySuggestion,
  EmailReport,
  OsintLocation,
  PhoneReport,
  PlatformHit,
  UsernameReport,
} from './types.js'

const UA = 'WorldEye/1.0 (OSINT; +https://worldeye.local)'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'yopmail.com', 'temp-mail.org',
  'tempmail.com', 'throwawaymail.com', 'getnada.com', 'trashmail.com', 'sharklasers.com',
  'maildrop.cc', 'dispostable.com', 'fakeinbox.com',
])
const FREE = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com', 'zoho.com', 'live.com', 'msn.com',
])

// ---------- email ----------
async function gravatar(md5: string) {
  try {
    const d = await fetchJSON(`https://en.gravatar.com/${md5}.json`, 6000, { 'User-Agent': UA })
    const e = Array.isArray(d?.entry) ? d.entry[0] : null
    if (!e) return { found: false, profileUrl: null, username: null, displayName: null, avatarUrl: null }
    return {
      found: true,
      profileUrl: e.profileUrl ?? null,
      username: e.preferredUsername ?? null,
      displayName: e.displayName ?? e.name?.formatted ?? null,
      avatarUrl: e.thumbnailUrl ?? null,
    }
  } catch {
    return { found: false, profileUrl: null, username: null, displayName: null, avatarUrl: null }
  }
}

async function breachCheck(email: string) {
  try {
    const d = await fetchJSON(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, 8000, {
      'User-Agent': UA,
    })
    const list: string[] = Array.isArray(d?.breaches?.[0]) ? d.breaches[0] : []
    return { exposed: list.length > 0, count: list.length, names: list.slice(0, 40) }
  } catch {
    return { exposed: false, count: 0, names: [] }
  }
}

export async function emailLookup(raw: string): Promise<{ report: EmailReport; location: OsintLocation | null }> {
  const address = raw.trim().toLowerCase()
  const validFormat = EMAIL_RE.test(address)
  const domain = validFormat ? address.split('@')[1] : null
  const md5 = createHash('md5').update(address).digest('hex')

  const [grav, breaches, mxRaw] = await Promise.all([
    gravatar(md5),
    breachCheck(address),
    domain ? doh(domain, 'MX') : Promise.resolve<string[]>([]),
  ])
  const mx = mxRaw.map((m) => m.replace(/^\d+\s+/, '').replace(/\.$/, '')).filter(Boolean)

  let host: EmailReport['host'] = null
  let location: OsintLocation | null = null
  if (domain) {
    const a = await doh(domain, 'A')
    const ip = a.find((x) => /^(\d{1,3}\.){3}\d{1,3}$/.test(x)) ?? null
    if (ip) {
      const geo = await geoIp(ip)
      host = { ip, org: geo?.org ?? geo?.isp ?? null, country: geo?.country ?? null }
      if (geo?.lat != null && geo?.lon != null) {
        location = { lat: geo.lat, lon: geo.lon, label: `${domain} · ${geo.country ?? ''}`.trim() }
      }
    }
  }

  const report: EmailReport = {
    address,
    validFormat,
    domain,
    deliverable: mx.length > 0,
    disposable: domain ? DISPOSABLE.has(domain) : false,
    freeProvider: domain ? FREE.has(domain) : false,
    mx,
    gravatar: grav,
    breaches,
    host,
  }
  return { report, location }
}

// ---------- username ----------
async function githubUser(u: string) {
  try {
    const d = await fetchJSON(`https://api.github.com/users/${encodeURIComponent(u)}`, 7000, {
      'User-Agent': UA,
      Accept: 'application/vnd.github+json',
    })
    if (!d?.login) return null
    return {
      login: d.login,
      name: d.name ?? null,
      bio: d.bio ?? null,
      company: d.company ?? null,
      location: d.location ?? null,
      avatarUrl: d.avatar_url ?? null,
      followers: typeof d.followers === 'number' ? d.followers : 0,
      repos: typeof d.public_repos === 'number' ? d.public_repos : 0,
      url: d.html_url ?? `https://github.com/${u}`,
      createdAt: d.created_at ?? null,
    }
  } catch {
    return null
  }
}

async function exists(url: string, check: (d: any) => boolean): Promise<boolean> {
  try {
    const d = await fetchJSON(url, 6000, { 'User-Agent': UA })
    return check(d)
  } catch {
    return false
  }
}

export async function usernameLookup(raw: string): Promise<{ report: UsernameReport; location: OsintLocation | null }> {
  const username = raw.trim().replace(/^@/, '')
  const [github, gitlab, hn, devto] = await Promise.all([
    githubUser(username),
    exists(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`, (d) => Array.isArray(d) && d.length > 0),
    exists(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(username)}.json`, (d) => d && d.id),
    exists(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`, (d) => d && d.id),
  ])

  const platforms: PlatformHit[] = [
    { platform: 'GitHub', url: `https://github.com/${username}`, found: !!github },
    { platform: 'GitLab', url: `https://gitlab.com/${username}`, found: gitlab },
    { platform: 'Hacker News', url: `https://news.ycombinator.com/user?id=${username}`, found: hn },
    { platform: 'DEV', url: `https://dev.to/${username}`, found: devto },
  ]

  // Best-effort map location from the GitHub location text (if it names a known place)
  let location: OsintLocation | null = null
  if (github?.location) {
    const g = geoparse(github.location)
    if (g) location = { lat: g.lat, lon: g.lon, label: `${username} · ${g.place}` }
  }

  return { report: { username, github, platforms }, location }
}

// ---------- phone (metadata only) ----------
const TYPE_LABEL: Record<string, string> = {
  MOBILE: 'Mobile',
  FIXED_LINE: 'Fixed line',
  FIXED_LINE_OR_MOBILE: 'Fixed line or mobile',
  VOIP: 'VoIP',
  TOLL_FREE: 'Toll-free',
  PREMIUM_RATE: 'Premium rate',
  PERSONAL_NUMBER: 'Personal number',
  PAGER: 'Pager',
  UAN: 'UAN',
}

export function phoneLookup(raw: string, defaultCountry?: string): { report: PhoneReport; location: OsintLocation | null } {
  const input = raw.trim()
  try {
    const p = parsePhoneNumber(input, defaultCountry ? (defaultCountry.toUpperCase() as any) : undefined)
    const iso = p.country ?? null
    const country = iso ? COUNTRIES[iso] ?? null : null
    const type = p.getType()
    const report: PhoneReport = {
      input,
      valid: p.isValid(),
      country: iso,
      countryName: country?.name ?? null,
      callingCode: p.countryCallingCode ? `+${p.countryCallingCode}` : null,
      type: type ? TYPE_LABEL[type] ?? type : null,
      national: p.formatNational(),
      international: p.formatInternational(),
    }
    const location = country ? { lat: country.lat, lon: country.lon, label: `${report.national} · ${country.name}` } : null
    return { report, location }
  } catch {
    return {
      report: { input, valid: false, country: null, countryName: null, callingCode: null, type: null, national: null, international: null },
      location: null,
    }
  }
}

// ---------- company / organization ----------
async function clearbitSuggest(q: string): Promise<CompanySuggestion[]> {
  try {
    const d = await fetchJSON(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`, 7000, {
      'User-Agent': UA,
    })
    if (!Array.isArray(d)) return []
    return d.slice(0, 8).map((c: any) => ({ name: c.name, domain: c.domain ?? null, logo: c.logo ?? null }))
  } catch {
    return []
  }
}

async function wikiSummary(title: string) {
  try {
    const d = await fetchJSON(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      7000,
      { 'User-Agent': UA },
    )
    if (!d?.title || d.type === 'disambiguation') return { wiki: null as CompanyReport['wikipedia'], coords: null as OsintLocation | null }
    const wiki = {
      title: d.title,
      extract: d.extract ?? '',
      thumbnail: d.thumbnail?.source ?? null,
      url: d.content_urls?.desktop?.page ?? null,
    }
    const coords =
      d.coordinates?.lat != null && d.coordinates?.lon != null
        ? { lat: d.coordinates.lat, lon: d.coordinates.lon, label: d.title }
        : null
    return { wiki, coords }
  } catch {
    return { wiki: null as CompanyReport['wikipedia'], coords: null as OsintLocation | null }
  }
}

export async function companyLookup(raw: string): Promise<{ report: CompanyReport; location: OsintLocation | null }> {
  const query = raw.trim()
  const [suggestions, wikiRes] = await Promise.all([clearbitSuggest(query), wikiSummary(query)])
  // Prefer an exact (case-insensitive) name match over Clearbit's fuzzy ordering.
  const exact = suggestions.find((s) => s.name.toLowerCase() === query.toLowerCase())
  const top = exact ?? suggestions[0] ?? null

  let location = wikiRes.coords
  // fall back to the company domain's hosting location if Wikipedia had no coordinates
  if (!location && top?.domain) {
    try {
      const a = await doh(top.domain, 'A')
      const ip = a.find((x) => /^(\d{1,3}\.){3}\d{1,3}$/.test(x)) ?? null
      if (ip) {
        const geo = await geoIp(ip)
        if (geo?.lat != null && geo?.lon != null) location = { lat: geo.lat, lon: geo.lon, label: `${top.name} · ${geo.country ?? ''}`.trim() }
      }
    } catch {
      /* ignore */
    }
  }

  return { report: { query, top, suggestions, wikipedia: wikiRes.wiki }, location }
}
