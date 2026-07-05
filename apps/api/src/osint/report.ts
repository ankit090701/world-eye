import { companyLookup, emailLookup, phoneLookup, usernameLookup } from './sources.js'
import type { OsintKind, OsintResponse } from './types.js'

export function isOsintKind(k: string): k is OsintKind {
  return k === 'email' || k === 'username' || k === 'phone' || k === 'company'
}

export async function buildOsintReport(
  kind: OsintKind,
  q: string,
  country?: string,
): Promise<OsintResponse> {
  const base: OsintResponse = { kind, query: q.trim(), location: null, errors: [] }
  try {
    if (kind === 'email') {
      const { report, location } = await emailLookup(q)
      base.email = report
      base.location = location
      if (!report.validFormat) base.errors.push('Not a valid email format')
    } else if (kind === 'username') {
      const { report, location } = await usernameLookup(q)
      base.username = report
      base.location = location
    } else if (kind === 'phone') {
      const { report, location } = phoneLookup(q, country)
      base.phone = report
      base.location = location
      if (!report.valid) base.errors.push('Could not parse as a valid phone number (include country code, e.g. +1…)')
    } else if (kind === 'company') {
      const { report, location } = await companyLookup(q)
      base.company = report
      base.location = location
      if (report.suggestions.length === 0 && !report.wikipedia) base.errors.push('No company match found')
    }
  } catch {
    base.errors.push('Lookup failed')
  }
  return base
}
