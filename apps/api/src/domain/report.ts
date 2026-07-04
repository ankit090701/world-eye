import {
  certTransparency,
  emailSecurity,
  extendedDns,
  hostingInfo,
  infraFootprint,
  rdapDomain,
} from './sources.js'
import type { DomainReport } from './types.js'

/** Normalise user input to a bare hostname (strip scheme, path, port, leading dot). */
export function normalizeDomain(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\.+|\.+$/g, '')
}

export function isDomainLike(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(s) && /[a-z]{2,}$/.test(s)
}

export async function buildDomainReport(q: string): Promise<DomainReport> {
  const domain = normalizeDomain(q)
  const errors: string[] = []

  // Independent lookups first (RDAP WHOIS, DNS, certificate transparency).
  const [whois, dns, crt] = await Promise.all([
    rdapDomain(domain),
    extendedDns(domain),
    certTransparency(domain),
  ])

  const resolvedIp = dns.A[0] ?? null

  // Dependent lookups (need DNS / subdomains).
  const [email, hosting, infra] = await Promise.all([
    emailSecurity(domain, dns.TXT, dns.MX),
    hostingInfo(resolvedIp),
    infraFootprint(domain, dns, crt.subdomains),
  ])

  if (!whois) errors.push('WHOIS/RDAP unavailable (registry may not support RDAP)')
  if (!resolvedIp) errors.push('Domain did not resolve to an A record')
  if (crt.subdomains.length === 0) errors.push('No certificate-transparency records found')

  return {
    domain,
    resolvedIp,
    whois,
    dns,
    email,
    hosting,
    certs: crt.certs,
    subdomains: crt.subdomains,
    history: crt.history,
    firstSeen: crt.firstSeen,
    ctSource: crt.source,
    infra,
    errors,
  }
}
