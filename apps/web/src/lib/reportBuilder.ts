// Module 17 — Reports. Builds a structured report from the live data (reusing the
// Module 15 intelligence engine + Module 16 analytics), then renders it to Markdown /
// CSV / JSON here; PDF and Excel are rendered in reportExport.ts (dynamic imports).

import { aircraftStore } from '../data/aircraftStore'
import { shipStore } from '../data/shipStore'
import { weatherEventsStore } from '../data/weatherStore'
import { cyberThreatStore } from '../data/cyberThreatStore'
import { computeRisk, detectAnomalies, forecast, gatherContext, generateSummary } from './aiEngine'
import { altitudeBands, gridClusters, magnitudeBands, shipsByCategory, speedHistogram, threatsByCountry } from './analytics'
import type { ReportKind } from '../types'

export type { ReportKind }

export interface ReportSection {
  title: string
  kind: 'text' | 'kv' | 'table'
  text?: string
  kv?: [string, string | number][]
  table?: { headers: string[]; rows: (string | number)[][] }
}

export interface Report {
  title: string
  kind: ReportKind
  generatedAt: string
  sections: ReportSection[]
}

const KIND_TITLE: Record<ReportKind, string> = {
  situation: 'WorldEye Situation Report',
  analytics: 'WorldEye Analytics Report',
  full: 'WorldEye Intelligence Report',
}

function situationSections(): ReportSection[] {
  const ctx = gatherContext()
  const risk = computeRisk(ctx)
  const sections: ReportSection[] = []
  sections.push({ title: 'Summary', kind: 'text', text: generateSummary(ctx) })
  sections.push({
    title: `Risk index — ${risk.score}/100 (${risk.level})`,
    kind: 'kv',
    kv: risk.factors.length ? risk.factors.map((f) => [f.label, `+${f.points}`] as [string, string]) : [['No elevated factors', '—']],
  })
  const anomalies = detectAnomalies(ctx)
  sections.push({
    title: 'Notable activity',
    kind: 'table',
    table: { headers: ['Severity', 'Event'], rows: anomalies.map((a) => [a.severity, a.text]) },
  })
  sections.push({ title: 'Outlook', kind: 'text', text: forecast(ctx).map((f) => `• ${f}`).join('\n') })
  sections.push({
    title: 'Tracked totals',
    kind: 'kv',
    kv: [
      ['Aircraft', ctx.aircraft.count],
      ['Vessels', ctx.ships.count],
      ['Trains', ctx.trains.count],
      ['Fleet vehicles', ctx.fleet.count],
      ['Earthquakes (24h)', ctx.weather.quakes.length],
      ['Active cyclones', ctx.weather.cyclones.length],
      ['Wildfires', ctx.weather.wildfires],
      ['Malicious hosts', ctx.cyber.threats],
      ['Satellites', ctx.satellites.count],
    ],
  })
  return sections
}

function analyticsSections(): ReportSection[] {
  const aircraft = aircraftStore.getSnapshot().aircraft
  const ships = shipStore.getSnapshot().ships
  const quakes = weatherEventsStore.getSnapshot().earthquakes
  const threats = cyberThreatStore.getSnapshot().points
  const speed = speedHistogram(aircraft)
  const datumTable = (headers: [string, string], data: { label: string; value: number }[]): ReportSection['table'] => ({
    headers,
    rows: data.map((d) => [d.label, d.value]),
  })
  const sections: ReportSection[] = []
  sections.push({ title: 'Aircraft altitude (ft)', kind: 'table', table: datumTable(['Band', 'Count'], altitudeBands(aircraft)) })
  sections.push({ title: 'Earthquake magnitude (24h)', kind: 'table', table: datumTable(['Band', 'Count'], magnitudeBands(quakes)) })
  if (ships.length) sections.push({ title: 'Vessels by category', kind: 'table', table: datumTable(['Category', 'Count'], shipsByCategory(ships)) })
  if (threats.length) sections.push({ title: 'Threats by country', kind: 'table', table: datumTable(['Country', 'Count'], threatsByCountry(threats)) })
  sections.push({ title: `Aircraft speed (kt) — avg ${speed.avg}`, kind: 'table', table: datumTable(['Band', 'Count'], speed.data) })
  const clusters = gridClusters(quakes.map((q) => ({ lat: q.lat, lon: q.lon })))
  if (clusters.length)
    sections.push({
      title: 'Seismic clusters',
      kind: 'table',
      table: { headers: ['Lat', 'Lon', 'Count'], rows: clusters.map((c) => [c.lat.toFixed(1), c.lon.toFixed(1), c.count]) },
    })
  return sections
}

export function buildReport(kind: ReportKind): Report {
  const sections =
    kind === 'situation' ? situationSections() : kind === 'analytics' ? analyticsSections() : [...situationSections(), ...analyticsSections()]
  return { title: KIND_TITLE[kind], kind, generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC', sections }
}

// ---------- text renderers ----------
export function toMarkdown(r: Report): string {
  const out: string[] = [`# ${r.title}`, `_Generated ${r.generatedAt}_`, '']
  for (const s of r.sections) {
    out.push(`## ${s.title}`)
    if (s.kind === 'text' && s.text) out.push(s.text)
    else if (s.kind === 'kv' && s.kv) for (const [k, v] of s.kv) out.push(`- **${k}:** ${v}`)
    else if (s.kind === 'table' && s.table) {
      out.push(`| ${s.table.headers.join(' | ')} |`)
      out.push(`| ${s.table.headers.map(() => '---').join(' | ')} |`)
      for (const row of s.table.rows) out.push(`| ${row.join(' | ')} |`)
    }
    out.push('')
  }
  return out.join('\n')
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function toCsv(r: Report): string {
  const out: string[] = [`# ${r.title} — ${r.generatedAt}`]
  for (const s of r.sections) {
    out.push('', `# ${s.title}`)
    if (s.kind === 'text' && s.text) out.push(csvCell(s.text))
    else if (s.kind === 'kv' && s.kv) for (const [k, v] of s.kv) out.push(`${csvCell(k)},${csvCell(v)}`)
    else if (s.kind === 'table' && s.table) {
      out.push(s.table.headers.map(csvCell).join(','))
      for (const row of s.table.rows) out.push(row.map(csvCell).join(','))
    }
  }
  return out.join('\n')
}

export function toJson(r: Report): string {
  return JSON.stringify(r, null, 2)
}
