import { fetchJSON } from '../lib/cache.js'
import { cloudFromText, doh, geoBatch, geoIp } from '../cyber/sources.js'
import type {
  CtHistoryEntry,
  DmarcPolicy,
  DomainCert,
  DomainDns,
  DomainHosting,
  DomainInfraPoint,
  DomainWhois,
  EmailSecurity,
  InfraRole,
  SpfPolicy,
} from './types.js'

const clean = (s: string) => s.replace(/^"|"$/g, '').replace(/\.$/, '').trim()

// ---------- RDAP domain WHOIS ----------
function vcardField(entity: any, field: string): string | null {
  const v = entity?.vcardArray?.[1]
  if (!Array.isArray(v)) return null
  const f = v.find((x: any) => x[0] === field)
  const val = f?.[3]
  return val == null ? null : String(val)
}

export async function rdapDomain(domain: string): Promise<DomainWhois | null> {
  try {
    const d = await fetchJSON(`https://rdap.org/domain/${encodeURIComponent(domain)}`, 8000)
    if (!d || typeof d !== 'object') return null

    const events: any[] = Array.isArray(d.events) ? d.events : []
    const eventDate = (action: string) =>
      events.find((e) => String(e.eventAction).toLowerCase() === action)?.eventDate ?? null

    const entities: any[] = Array.isArray(d.entities) ? d.entities : []
    const registrarEnt = entities.find((e) => Array.isArray(e.roles) && e.roles.includes('registrar'))
    const registrar = registrarEnt ? vcardField(registrarEnt, 'fn') ?? registrarEnt.handle ?? null : null
    const registrarUrl =
      registrarEnt?.links?.find((l: any) => l.rel === 'about' || l.rel === 'self')?.href ??
      vcardField(registrarEnt, 'url') ??
      null
    const registrantEnt = entities.find((e) => Array.isArray(e.roles) && e.roles.includes('registrant'))
    const registrant = registrantEnt ? vcardField(registrantEnt, 'fn') ?? registrantEnt.handle ?? null : null

    const nameservers: string[] = Array.isArray(d.nameservers)
      ? d.nameservers.map((n: any) => clean(String(n.ldhName ?? n.unicodeName ?? ''))).filter(Boolean)
      : []

    const dnssec =
      d.secureDNS && typeof d.secureDNS.delegationSigned === 'boolean' ? d.secureDNS.delegationSigned : null

    return {
      handle: d.handle ?? null,
      registrar,
      registrarUrl,
      createdDate: eventDate('registration'),
      updatedDate: eventDate('last changed') ?? eventDate('last update of rdap database'),
      expiryDate: eventDate('expiration'),
      statuses: Array.isArray(d.status) ? d.status.map(String) : [],
      nameservers,
      dnssec,
      registrant,
    }
  } catch {
    return null
  }
}

// ---------- extended DNS ----------
export async function extendedDns(domain: string): Promise<DomainDns> {
  const [A, AAAA, MX, NS, TXT, CNAME, SOA, CAA] = await Promise.all([
    doh(domain, 'A'),
    doh(domain, 'AAAA'),
    doh(domain, 'MX'),
    doh(domain, 'NS'),
    doh(domain, 'TXT'),
    doh(domain, 'CNAME'),
    doh(domain, 'SOA'),
    doh(domain, 'CAA'),
  ])
  return {
    A,
    AAAA,
    MX: MX.map((m) => clean(m.replace(/^\d+\s+/, ''))),
    NS: NS.map(clean),
    TXT: TXT.map((t) => t.replace(/^"|"$/g, '')),
    CNAME: CNAME.map(clean),
    SOA: SOA.map((s) => s.trim()),
    CAA: CAA.map((c) => c.replace(/^"|"$/g, '')),
  }
}

// ---------- email security (SPF / DMARC / DKIM) ----------
// Kept to the most common selectors — each is a DNS query, so the list is a
// direct multiplier on the route's upstream fan-out.
const DKIM_SELECTORS = ['google', 'default', 'selector1', 'selector2', 'k1', 's1']

function spfPolicy(record: string): SpfPolicy {
  if (/-all/.test(record)) return 'hardfail'
  if (/~all/.test(record)) return 'softfail'
  if (/\?all/.test(record)) return 'neutral'
  if (/\+all/.test(record)) return 'pass'
  return 'unknown'
}

function mxProvider(host: string): string | null {
  const s = host.toLowerCase()
  if (/google|googlemail|aspmx/.test(s)) return 'Google Workspace'
  if (/outlook|office365|microsoft|protection\.outlook/.test(s)) return 'Microsoft 365'
  if (/protonmail|proton\.me/.test(s)) return 'Proton Mail'
  if (/zoho/.test(s)) return 'Zoho Mail'
  if (/amazonaws|amazonses/.test(s)) return 'Amazon SES'
  if (/mailgun/.test(s)) return 'Mailgun'
  if (/sendgrid/.test(s)) return 'SendGrid'
  if (/mimecast/.test(s)) return 'Mimecast'
  if (/pphosted|proofpoint/.test(s)) return 'Proofpoint'
  if (/yandex/.test(s)) return 'Yandex'
  if (/icloud|apple/.test(s)) return 'iCloud'
  return null
}

export async function emailSecurity(domain: string, txt: string[], mx: string[]): Promise<EmailSecurity> {
  const spfRecord = txt.find((t) => /^v=spf1/i.test(t.trim())) ?? null

  const dmarcTxt = await doh(`_dmarc.${domain}`, 'TXT')
  const dmarcRecord = dmarcTxt.map((t) => t.replace(/^"|"$/g, '')).find((t) => /v=DMARC1/i.test(t)) ?? null
  let dmarcPolicy: DmarcPolicy = 'unknown'
  let pct: number | null = null
  let rua: string | null = null
  if (dmarcRecord) {
    const p = dmarcRecord.match(/[;\s]p=([a-z]+)/i)?.[1]?.toLowerCase()
    if (p === 'none' || p === 'quarantine' || p === 'reject') dmarcPolicy = p
    const pm = dmarcRecord.match(/pct=(\d+)/i)
    if (pm) pct = Number(pm[1])
    rua = dmarcRecord.match(/rua=([^;]+)/i)?.[1]?.trim() ?? null
  }

  const dkim = await Promise.all(
    DKIM_SELECTORS.map(async (selector) => {
      const ans = await doh(`${selector}._domainkey.${domain}`, 'TXT')
      const joined = ans.join(' ')
      const present = /v=DKIM1|k=rsa|p=[A-Za-z0-9+/]/.test(joined)
      return { selector, present }
    }),
  )

  const mxProviders = Array.from(new Set(mx.map(mxProvider).filter((x): x is string => !!x)))

  return {
    spf: { present: !!spfRecord, record: spfRecord, policy: spfRecord ? spfPolicy(spfRecord) : 'unknown' },
    dmarc: { present: !!dmarcRecord, record: dmarcRecord, policy: dmarcPolicy, pct, rua },
    dkim: dkim.filter((d) => d.present),
    mxProviders,
  }
}

// ---------- certificate transparency (certs + subdomains + CT history) ----------
// Passive OSINT: reads public CT logs. certspotter (keyless, fast, reliable) is
// tried first; crt.sh is a fallback since it is frequently overloaded.
export interface CrtDerived {
  certs: DomainCert[]
  subdomains: string[]
  history: CtHistoryEntry[]
  firstSeen: string | null
  source: 'certspotter' | 'crt.sh' | null
}

interface RawCert {
  dnsNames: string[]
  commonName: string | null
  issuer: string | null
  notBefore: string | null
  notAfter: string | null
}

function issuerOrg(name: string | null): string | null {
  if (!name) return null
  const m = name.match(/O="?([^",]+)"?/)
  return (m ? m[1] : name).trim() || null
}

async function fetchCertSpotter(domain: string): Promise<RawCert[]> {
  const url =
    `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}` +
    `&include_subdomains=true&expand=dns_names&expand=issuer&expand=not_before&expand=not_after`
  const arr = await fetchJSON(url, 10000)
  if (!Array.isArray(arr)) return []
  return arr.map((c: any) => ({
    dnsNames: Array.isArray(c.dns_names) ? c.dns_names.map(String) : [],
    commonName: Array.isArray(c.dns_names) ? c.dns_names[0] ?? null : null,
    issuer: c.issuer?.friendly_name ?? issuerOrg(c.issuer?.name ?? null),
    notBefore: c.not_before ?? null,
    notAfter: c.not_after ?? null,
  }))
}

async function fetchCrtSh(domain: string): Promise<RawCert[]> {
  const arr = await fetchJSON(`https://crt.sh/?q=${encodeURIComponent('%.' + domain)}&output=json`, 8000)
  if (!Array.isArray(arr)) return []
  return arr.slice(0, 2000).map((c: any) => ({
    dnsNames: String(c.name_value ?? '').split(/\n/),
    commonName: c.common_name ?? null,
    issuer: issuerOrg(c.issuer_name ?? null),
    notBefore: c.not_before ?? null,
    notAfter: c.not_after ?? null,
  }))
}

export async function certTransparency(domain: string): Promise<CrtDerived> {
  const empty: CrtDerived = { certs: [], subdomains: [], history: [], firstSeen: null, source: null }

  let rows: RawCert[] = []
  let source: 'certspotter' | 'crt.sh' | null = null
  try {
    rows = await fetchCertSpotter(domain)
    if (rows.length > 0) source = 'certspotter'
  } catch {
    /* fall back */
  }
  if (rows.length === 0) {
    try {
      rows = await fetchCrtSh(domain)
      if (rows.length > 0) source = 'crt.sh'
    } catch {
      /* both unavailable */
    }
  }
  if (rows.length === 0) return empty

  const dom = domain.toLowerCase()
  const suffix = '.' + dom
  const nameFirst = new Map<string, { firstSeen: string | null; lastSeen: string | null; issuer: string | null }>()
  const subs = new Set<string>()
  const certSeen = new Set<string>()
  const certs: DomainCert[] = []
  let firstSeen: string | null = null

  for (const c of rows) {
    const { notBefore, notAfter, issuer } = c
    if (notBefore && (!firstSeen || notBefore < firstSeen)) firstSeen = notBefore

    const ck = `${issuer}|${notAfter}`
    if (!certSeen.has(ck) && certs.length < 10) {
      certSeen.add(ck)
      certs.push({ issuer, commonName: c.commonName, notBefore, notAfter })
    }

    const names = [...c.dnsNames]
    if (c.commonName) names.push(c.commonName)
    for (let raw of names) {
      raw = raw.replace(/^\*\./, '').toLowerCase().trim()
      if (!raw || raw.includes(' ') || raw.includes('@')) continue
      if (raw !== dom && !raw.endsWith(suffix)) continue
      subs.add(raw)
      const prev = nameFirst.get(raw)
      if (!prev) {
        nameFirst.set(raw, { firstSeen: notBefore, lastSeen: notBefore, issuer })
      } else {
        if (notBefore && (!prev.firstSeen || notBefore < prev.firstSeen)) prev.firstSeen = notBefore
        if (notBefore && (!prev.lastSeen || notBefore > prev.lastSeen)) prev.lastSeen = notBefore
      }
    }
  }

  // Cap the payload — huge domains can yield thousands of names (the UI shows 60).
  const subdomains = Array.from(subs).sort().slice(0, 500)
  const history: CtHistoryEntry[] = Array.from(nameFirst.entries())
    .map(([name, v]) => ({ name, firstSeen: v.firstSeen, lastSeen: v.lastSeen, issuer: v.issuer }))
    .sort((a, b) => (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''))
    .slice(0, 20)

  return { certs, subdomains, history, firstSeen, source }
}

// ---------- hosting (apex IP → geo/ASN/cloud) ----------
export async function hostingInfo(ip: string | null): Promise<DomainHosting | null> {
  if (!ip) return null
  const geo = await geoIp(ip)
  if (!geo) return { ip, country: null, countryCode: null, city: null, isp: null, org: null, asn: null, cloud: null }
  return {
    ip,
    country: geo.country,
    countryCode: geo.countryCode,
    city: geo.city,
    isp: geo.isp,
    org: geo.org,
    asn: geo.as,
    cloud: cloudFromText(geo.as, geo.org, geo.isp, geo.asname),
  }
}

// ---------- infrastructure footprint (geolocated host IPs) ----------
async function resolveA(host: string): Promise<string | null> {
  const a = await doh(host, 'A')
  return a.find((x) => /^(\d{1,3}\.){3}\d{1,3}$/.test(x)) ?? null
}

export async function infraFootprint(
  domain: string,
  dns: DomainDns,
  subdomains: string[],
): Promise<DomainInfraPoint[]> {
  // Candidate hosts with a role priority (apex > www > mail > ns > sub).
  const candidates: { host: string; role: InfraRole }[] = []
  candidates.push({ host: domain, role: 'apex' })
  candidates.push({ host: `www.${domain}`, role: 'www' })
  for (const m of dns.MX.slice(0, 2)) candidates.push({ host: m, role: 'mail' })
  for (const n of dns.NS.slice(0, 2)) candidates.push({ host: n, role: 'ns' })
  for (const s of subdomains.filter((s) => s !== domain && s !== `www.${domain}`).slice(0, 6))
    candidates.push({ host: s, role: 'sub' })

  // Resolve each host → IP (apex/www can reuse the DNS we already have).
  const resolved = await Promise.all(
    candidates.map(async (c) => {
      let ip: string | null = null
      if (c.role === 'apex') ip = dns.A[0] ?? (await resolveA(c.host))
      else ip = await resolveA(c.host)
      return { ...c, ip }
    }),
  )

  // Dedupe by IP, keeping the highest-priority role/host per IP.
  const byIp = new Map<string, { host: string; role: InfraRole }>()
  for (const r of resolved) {
    if (!r.ip) continue
    if (!byIp.has(r.ip)) byIp.set(r.ip, { host: r.host, role: r.role })
  }
  const ips = Array.from(byIp.keys()).slice(0, 20)
  if (ips.length === 0) return []

  let geo: any[] = []
  try {
    geo = await geoBatch(ips)
  } catch {
    return []
  }

  const points: DomainInfraPoint[] = []
  for (const g of geo) {
    if (g?.status !== 'success' || typeof g.lat !== 'number' || typeof g.lon !== 'number') continue
    const meta = byIp.get(g.query)
    if (!meta) continue
    points.push({
      host: meta.host,
      ip: g.query,
      role: meta.role,
      country: g.country ?? null,
      city: g.city ?? null,
      org: g.org ?? g.isp ?? null,
      as: g.as ?? null,
      lat: g.lat,
      lon: g.lon,
    })
  }
  return points
}
