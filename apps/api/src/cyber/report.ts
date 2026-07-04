import {
  certs,
  checkThreat,
  cloudFromText,
  detectKind,
  dnsRecords,
  geoIp,
  rdapAsn,
  rdapIp,
  reverseDns,
} from './sources.js'
import type { CyberReport } from './types.js'

const PORTS_NOTE =
  'Active port scanning is disabled. WorldEye only performs port discovery against authorized targets via a configured Shodan/Censys integration (not enabled).'

function parseAsn(as: string | null): { asn: string | null; name: string | null } {
  if (!as) return { asn: null, name: null }
  const m = as.match(/^AS(\d+)\s*(.*)$/i)
  return m ? { asn: `AS${m[1]}`, name: m[2] || null } : { asn: as, name: null }
}

export async function buildReport(q: string): Promise<CyberReport> {
  const { kind, value } = detectKind(q)
  const errors: string[] = []
  const base: CyberReport = {
    query: q.trim(),
    kind,
    resolvedIp: null,
    geo: null,
    cloud: null,
    rdap: null,
    asn: null,
    dns: null,
    ptr: null,
    certs: [],
    threat: { listed: false, feodo: { listed: false, malware: null }, tor: false, proxy: false, hosting: false },
    ports: { supported: false, note: PORTS_NOTE },
    errors,
  }

  if (kind === 'ip') {
    const [geo, rdap, ptr] = await Promise.all([geoIp(value), rdapIp(value), reverseDns(value)])
    base.resolvedIp = value
    base.geo = geo
    base.rdap = rdap
    base.ptr = ptr
    base.threat = await checkThreat(value, geo)
    const parsed = parseAsn(geo?.as ?? rdap?.name ?? null)
    base.asn = { asn: parsed.asn, name: parsed.name ?? geo?.asname ?? null, country: geo?.countryCode ?? null }
    base.cloud = cloudFromText(geo?.as, geo?.org, geo?.isp, geo?.asname, rdap?.name)
    if (!geo) errors.push('Geolocation unavailable')
  } else if (kind === 'domain') {
    const [dns, certList] = await Promise.all([dnsRecords(value), certs(value)])
    base.dns = dns
    base.certs = certList
    const ip = dns.A[0] ?? null
    base.resolvedIp = ip
    if (ip) {
      const [geo, rdap] = await Promise.all([geoIp(ip), rdapIp(ip)])
      base.geo = geo
      base.rdap = rdap
      base.ptr = await reverseDns(ip)
      base.threat = await checkThreat(ip, geo)
      const parsed = parseAsn(geo?.as ?? null)
      base.asn = { asn: parsed.asn, name: parsed.name ?? geo?.asname ?? null, country: geo?.countryCode ?? null }
      base.cloud = cloudFromText(geo?.as, geo?.org, geo?.isp, geo?.asname)
    } else {
      errors.push('Domain did not resolve to an A record')
    }
  } else if (kind === 'asn') {
    const info = await rdapAsn(value)
    if (info) {
      base.asn = { asn: info.asn, name: info.name, country: info.country }
      base.rdap = info.rdap
      base.cloud = cloudFromText(info.name)
    } else {
      errors.push('ASN lookup unavailable')
    }
  } else {
    errors.push('Could not classify query as an IP, domain or ASN')
  }

  return base
}
