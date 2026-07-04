import { fetchJSON, TTLCache } from '../lib/cache.js'
import type {
  CertInfo,
  DnsRecords,
  GeoInfo,
  QueryKind,
  RdapInfo,
  ThreatMapPoint,
} from './types.js'

// ---------- query classification ----------
export function detectKind(q: string): { kind: QueryKind; value: string } {
  const s = q.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return { kind: 'ip', value: s }
  if (s.includes(':') && /^[0-9a-f:]+$/.test(s)) return { kind: 'ip', value: s }
  if (/^as\d+$/.test(s)) return { kind: 'asn', value: s.replace('as', '') }
  if (/^\d+$/.test(s)) return { kind: 'asn', value: s }
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return { kind: 'domain', value: s }
  return { kind: 'unknown', value: s }
}

// ---------- geolocation (ip-api, keyless) ----------
const GEO_FIELDS = 'status,country,countryCode,city,lat,lon,isp,org,as,asname,mobile,proxy,hosting,query'

export async function geoIp(ip: string): Promise<GeoInfo | null> {
  try {
    const d = await fetchJSON(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${GEO_FIELDS}`, 6000)
    if (d?.status !== 'success') return null
    return {
      country: d.country ?? null,
      countryCode: d.countryCode ?? null,
      city: d.city ?? null,
      lat: typeof d.lat === 'number' ? d.lat : null,
      lon: typeof d.lon === 'number' ? d.lon : null,
      isp: d.isp ?? null,
      org: d.org ?? null,
      as: d.as ?? null,
      asname: d.asname ?? null,
      mobile: !!d.mobile,
      proxy: !!d.proxy,
      hosting: !!d.hosting,
    }
  } catch {
    return null
  }
}

export async function geoBatch(ips: string[]): Promise<any[]> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`http://ip-api.com/batch?fields=${GEO_FIELDS}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as any[]
  } finally {
    clearTimeout(t)
  }
}

// ---------- RDAP (whois) ----------
function rdapEntities(entities: any[]): { role: string; name: string }[] {
  const out: { role: string; name: string }[] = []
  for (const e of entities ?? []) {
    const role = Array.isArray(e.roles) ? e.roles[0] : 'entity'
    let name = e.handle ?? ''
    const v = e.vcardArray?.[1]
    if (Array.isArray(v)) {
      const fn = v.find((x: any) => x[0] === 'fn')
      if (fn) name = fn[3]
    }
    if (name) out.push({ role, name: String(name) })
  }
  return out.slice(0, 6)
}

export async function rdapIp(ip: string): Promise<RdapInfo | null> {
  try {
    const d = await fetchJSON(`https://rdap.org/ip/${encodeURIComponent(ip)}`, 7000)
    let cidr: string | null = null
    if (Array.isArray(d.cidr0_cidrs) && d.cidr0_cidrs[0]) {
      const c = d.cidr0_cidrs[0]
      cidr = `${c.v4prefix ?? c.v6prefix}/${c.length}`
    }
    const entities = rdapEntities(d.entities)
    return {
      handle: d.handle ?? null,
      name: d.name ?? null,
      type: d.type ?? null,
      country: d.country ?? null,
      startAddress: d.startAddress ?? null,
      endAddress: d.endAddress ?? null,
      cidr,
      registrar: entities.find((e) => e.role === 'registrar')?.name ?? null,
      entities,
    }
  } catch {
    return null
  }
}

export async function rdapAsn(asn: string): Promise<{ asn: string; name: string | null; country: string | null; rdap: RdapInfo | null } | null> {
  try {
    const d = await fetchJSON(`https://rdap.org/autnum/${encodeURIComponent(asn)}`, 7000)
    const entities = rdapEntities(d.entities)
    return {
      asn: `AS${asn}`,
      name: d.name ?? null,
      country: d.country ?? null,
      rdap: {
        handle: d.handle ?? null,
        name: d.name ?? null,
        type: d.type ?? null,
        country: d.country ?? null,
        startAddress: null,
        endAddress: null,
        cidr: null,
        registrar: null,
        entities,
      },
    }
  } catch {
    return null
  }
}

// ---------- DNS over HTTPS ----------
export async function doh(name: string, type: string): Promise<string[]> {
  try {
    const d = await fetchJSON(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, 6000)
    const ans: any[] = Array.isArray(d.Answer) ? d.Answer : []
    return ans.map((a) => String(a.data)).filter(Boolean)
  } catch {
    return []
  }
}

export async function dnsRecords(domain: string): Promise<DnsRecords> {
  const [A, AAAA, MX, NS, TXT] = await Promise.all([
    doh(domain, 'A'),
    doh(domain, 'AAAA'),
    doh(domain, 'MX'),
    doh(domain, 'NS'),
    doh(domain, 'TXT'),
  ])
  return {
    A,
    AAAA,
    MX: MX.map((m) => m.replace(/^\d+\s+/, '').replace(/\.$/, '')),
    NS: NS.map((n) => n.replace(/\.$/, '')),
    TXT: TXT.map((t) => t.replace(/^"|"$/g, '')),
  }
}

export async function reverseDns(ip: string): Promise<string | null> {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return null
  const arpa = `${ip.split('.').reverse().join('.')}.in-addr.arpa`
  const r = await doh(arpa, 'PTR')
  return r[0]?.replace(/\.$/, '') ?? null
}

// ---------- certificates (crt.sh) ----------
export async function certs(domain: string): Promise<CertInfo[]> {
  try {
    const d = await fetchJSON(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, 9000)
    if (!Array.isArray(d)) return []
    const seen = new Set<string>()
    const out: CertInfo[] = []
    for (const c of d) {
      const key = `${c.issuer_name}|${c.not_after}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        issuer: (c.issuer_name ?? '').replace(/.*O=([^,]+).*/, '$1') || c.issuer_name || null,
        commonName: c.common_name ?? null,
        notBefore: c.not_before ?? null,
        notAfter: c.not_after ?? null,
      })
      if (out.length >= 8) break
    }
    return out
  } catch {
    return []
  }
}

// ---------- threat lists ----------
const feodoCache = new TTLCache<Map<string, string>>(60 * 60 * 1000) // 1h
const torCache = new TTLCache<Set<string>>(60 * 60 * 1000)

export async function getFeodo(): Promise<Map<string, string>> {
  const hit = feodoCache.get('all')
  if (hit) return hit
  const map = new Map<string, string>()
  try {
    const arr: any[] = await fetchJSON('https://feodotracker.abuse.ch/downloads/ipblocklist.json', 9000)
    if (Array.isArray(arr)) for (const e of arr) if (e?.ip_address) map.set(String(e.ip_address), e.malware ?? 'C2')
  } catch {
    /* best-effort */
  }
  if (map.size > 0) feodoCache.set('all', map)
  return map
}

async function getTor(): Promise<Set<string>> {
  const hit = torCache.get('all')
  if (hit) return hit
  const set = new Set<string>()
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch('https://check.torproject.org/torbulkexitlist', { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      const txt = await res.text()
      for (const line of txt.split('\n')) {
        const ip = line.trim()
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) set.add(ip)
      }
    }
  } catch {
    /* best-effort */
  }
  if (set.size > 0) torCache.set('all', set)
  return set
}

export async function checkThreat(ip: string, geo: GeoInfo | null) {
  const [feodo, tor] = await Promise.all([getFeodo(), getTor()])
  const malware = feodo.get(ip) ?? null
  const isFeodo = feodo.has(ip)
  const isTor = tor.has(ip)
  return {
    listed: isFeodo || isTor,
    feodo: { listed: isFeodo, malware },
    tor: isTor,
    proxy: !!geo?.proxy,
    hosting: !!geo?.hosting,
  }
}

// ---------- cloud detection ----------
const CLOUDS: [RegExp, string][] = [
  [/amazon|aws|ec2/i, 'Amazon AWS'],
  [/google|gcp|1e100/i, 'Google Cloud'],
  [/microsoft|azure/i, 'Microsoft Azure'],
  [/cloudflare/i, 'Cloudflare'],
  [/digitalocean/i, 'DigitalOcean'],
  [/linode|akamai/i, 'Akamai / Linode'],
  [/hetzner/i, 'Hetzner'],
  [/ovh/i, 'OVHcloud'],
  [/oracle/i, 'Oracle Cloud'],
  [/alibaba|aliyun/i, 'Alibaba Cloud'],
]
export function cloudFromText(...text: (string | null | undefined)[]): string | null {
  const s = text.filter(Boolean).join(' ')
  for (const [re, name] of CLOUDS) if (re.test(s)) return name
  return null
}

// ---------- threat map points ----------
const threatPointsCache = new TTLCache<ThreatMapPoint[]>(30 * 60 * 1000) // 30min

export async function threatMapPoints(): Promise<ThreatMapPoint[]> {
  const hit = threatPointsCache.get('all')
  if (hit) return hit
  const feodo = await getFeodo()
  const entries = Array.from(feodo.keys()).slice(0, 100)
  if (entries.length === 0) return []
  let geoResults: any[] = []
  try {
    geoResults = await geoBatch(entries)
  } catch {
    geoResults = []
  }
  const points: ThreatMapPoint[] = []
  for (const g of geoResults) {
    if (g?.status !== 'success' || typeof g.lat !== 'number' || typeof g.lon !== 'number') continue
    points.push({
      ip: g.query,
      malware: feodo.get(g.query) ?? 'C2',
      country: g.country ?? null,
      as: g.as ?? null,
      lat: g.lat,
      lon: g.lon,
      firstSeen: null,
    })
  }
  if (points.length > 0) threatPointsCache.set('all', points)
  return points
}
