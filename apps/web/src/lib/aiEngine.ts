// Module 15 — AI Intelligence. A keyless, client-side "computed intelligence"
// engine: it reads the live data every prior module already streams into the
// browser stores and produces natural-language answers, situation summaries,
// heuristic risk scores, anomaly/pattern detection, an outlook and a report.
// (A real LLM can be layered on top via ANTHROPIC_API_KEY — see docs.)

import { aircraftStore } from '../data/aircraftStore'
import { shipStore } from '../data/shipStore'
import { trainStore } from '../data/trainStore'
import { fleetStore } from '../data/fleetStore'
import { trafficStore } from '../data/trafficStore'
import { weatherEventsStore } from '../data/weatherStore'
import { cyberThreatStore } from '../data/cyberThreatStore'
import { satelliteStore } from '../data/satelliteStore'
import { newsMapStore } from '../data/newsStore'
import { socialMapStore } from '../data/socialStore'
import type { Aircraft, AiAction, Cyclone, Earthquake, RiskAssessment } from '../types'

export interface AiContext {
  aircraft: { count: number; emergencies: Aircraft[] }
  ships: { count: number }
  trains: { count: number }
  fleet: { count: number; criticalAlerts: number }
  traffic: { incidents: number; highSeverity: number }
  weather: { quakes: Earthquake[]; maxMag: number; majorQuakes: Earthquake[]; cyclones: Cyclone[]; majorCyclones: Cyclone[]; wildfires: number }
  cyber: { threats: number }
  satellites: { count: number }
  news: { hotspots: number }
  social: { buzz: number }
}

const CAT_RANK: Record<string, number> = { td: 0, ts: 1, cat1: 2, cat2: 3, cat3: 4, cat4: 5, cat5: 6 }

export function gatherContext(): AiContext {
  const ac = aircraftStore.getSnapshot()
  const wx = weatherEventsStore.getSnapshot()
  const fl = fleetStore.getSnapshot()
  const tr = trafficStore.getSnapshot()
  const quakes = wx.earthquakes
  const maxMag = quakes.reduce((m, q) => Math.max(m, q.mag ?? 0), 0)
  return {
    aircraft: { count: ac.aircraft.length, emergencies: ac.aircraft.filter((a) => a.emergency) },
    ships: { count: shipStore.getSnapshot().ships.length },
    trains: { count: trainStore.getSnapshot().trains.length },
    fleet: { count: fl.vehicles.length, criticalAlerts: fl.alerts.filter((a) => a.severity === 'critical').length },
    traffic: { incidents: tr.incidents.length, highSeverity: tr.incidents.filter((i) => i.severity === 'high').length },
    weather: {
      quakes,
      maxMag,
      majorQuakes: quakes.filter((q) => (q.mag ?? 0) >= 5),
      cyclones: wx.cyclones,
      majorCyclones: wx.cyclones.filter((c) => (CAT_RANK[c.category] ?? 0) >= 4),
      wildfires: wx.wildfires.length,
    },
    cyber: { threats: cyberThreatStore.getSnapshot().points.length },
    satellites: { count: satelliteStore.getSnapshot().positions.length },
    news: { hotspots: newsMapStore.getSnapshot().points.length },
    social: { buzz: socialMapStore.getSnapshot().points.length },
  }
}

// ---------- risk ----------
export function computeRisk(ctx: AiContext): RiskAssessment {
  const factors: { label: string; points: number }[] = []
  const add = (label: string, points: number) => {
    if (points > 0) factors.push({ label, points: Math.round(points) })
  }
  add(`${ctx.aircraft.emergencies.length} aircraft emergency squawk(s)`, Math.min(ctx.aircraft.emergencies.length * 15, 45))
  add(`${ctx.weather.majorQuakes.length} major earthquake(s) (M5+)`, Math.min(ctx.weather.majorQuakes.length * 12, 36))
  if (ctx.weather.maxMag >= 6) add(`strong earthquake M${ctx.weather.maxMag.toFixed(1)}`, 12)
  add(`${ctx.weather.majorCyclones.length} major cyclone(s) (Cat 3+)`, Math.min(ctx.weather.majorCyclones.length * 15, 30))
  add(`${ctx.cyber.threats} malicious host(s) tracked`, Math.min(ctx.cyber.threats / 8, 20))
  add(`${ctx.traffic.highSeverity} high-severity traffic incident(s)`, Math.min(ctx.traffic.highSeverity * 2, 10))
  add(`${ctx.weather.wildfires} active wildfire(s)`, Math.min(ctx.weather.wildfires / 6, 10))
  add(`${ctx.fleet.criticalAlerts} critical fleet alert(s)`, Math.min(ctx.fleet.criticalAlerts * 3, 10))

  const score = Math.max(0, Math.min(100, Math.round(factors.reduce((s, f) => s + f.points, 0))))
  const level = score < 15 ? 'low' : score < 35 ? 'moderate' : score < 55 ? 'elevated' : score < 75 ? 'high' : 'severe'
  return { score, level, factors: factors.sort((a, b) => b.points - a.points) }
}

// ---------- summary ----------
export function generateSummary(ctx: AiContext): string {
  const risk = computeRisk(ctx)
  const parts: string[] = []
  parts.push(
    `WorldEye is tracking ${ctx.aircraft.count} aircraft, ${ctx.ships.count} vessels, ${ctx.trains.count} trains and ${ctx.fleet.count} fleet vehicles.`,
  )
  if (ctx.aircraft.emergencies.length > 0)
    parts.push(`⚠ ${ctx.aircraft.emergencies.length} aircraft squawking an emergency code.`)
  const wxBits: string[] = []
  if (ctx.weather.quakes.length) wxBits.push(`${ctx.weather.quakes.length} earthquakes in 24h (strongest M${ctx.weather.maxMag.toFixed(1)})`)
  if (ctx.weather.cyclones.length) wxBits.push(`${ctx.weather.cyclones.length} active cyclone(s)`)
  if (ctx.weather.wildfires) wxBits.push(`${ctx.weather.wildfires} wildfires`)
  if (wxBits.length) parts.push(`Natural hazards: ${wxBits.join(', ')}.`)
  if (ctx.cyber.threats) parts.push(`Cyber: ${ctx.cyber.threats} malicious hosts on the threat map.`)
  if (ctx.traffic.incidents) parts.push(`Traffic: ${ctx.traffic.incidents} incidents (${ctx.traffic.highSeverity} high-severity).`)
  if (ctx.satellites.count) parts.push(`${ctx.satellites.count} satellites being propagated.`)
  parts.push(`Overall risk index: ${risk.score}/100 (${risk.level}).`)
  return parts.join(' ')
}

// ---------- anomalies / patterns ----------
export function detectAnomalies(ctx: AiContext): { severity: 'critical' | 'warning' | 'info'; text: string; action?: AiAction }[] {
  const out: { severity: 'critical' | 'warning' | 'info'; text: string; action?: AiAction }[] = []
  for (const a of ctx.aircraft.emergencies.slice(0, 4)) {
    out.push({ severity: 'critical', text: `Aircraft ${a.callsign ?? a.hex} squawking ${a.emergencyKind ?? 'emergency'}`, action: { label: 'show', lat: a.lat, lon: a.lon, zoom: 7 } })
  }
  for (const q of [...ctx.weather.majorQuakes].sort((a, b) => (b.mag ?? 0) - (a.mag ?? 0)).slice(0, 3)) {
    out.push({ severity: (q.mag ?? 0) >= 6 ? 'critical' : 'warning', text: `M${q.mag} earthquake — ${q.place ?? 'unknown'}`, action: { label: 'show', lat: q.lat, lon: q.lon, zoom: 5 } })
  }
  for (const c of ctx.weather.majorCyclones.slice(0, 3)) {
    out.push({ severity: 'warning', text: `Cyclone ${c.name} (${c.category.toUpperCase()})`, action: { label: 'show', lat: c.lat, lon: c.lon, zoom: 4 } })
  }
  if (ctx.cyber.threats >= 50) out.push({ severity: 'warning', text: `Elevated malicious infrastructure — ${ctx.cyber.threats} C2 hosts tracked` })
  if (ctx.fleet.criticalAlerts > 0) out.push({ severity: 'warning', text: `${ctx.fleet.criticalAlerts} critical fleet alert(s)` })
  if (out.length === 0) out.push({ severity: 'info', text: 'No significant anomalies detected across the live feeds.' })
  return out.slice(0, 10)
}

// ---------- outlook / forecast ----------
export function forecast(ctx: AiContext): string[] {
  const out: string[] = []
  if (ctx.weather.majorCyclones.length)
    out.push(`Severe-weather risk elevated near ${ctx.weather.majorCyclones.map((c) => c.basin ?? c.name).slice(0, 2).join(' & ')} over the next 24–72h.`)
  if (ctx.weather.majorQuakes.length)
    out.push(`Aftershock activity possible near recent M5+ epicentres; monitor USGS updates.`)
  if (ctx.cyber.threats >= 40) out.push(`Threat-feed volume is elevated — expect continued C2 churn.`)
  if (ctx.aircraft.emergencies.length) out.push(`Active aircraft emergencies may drive short-term airspace disruption.`)
  if (out.length === 0) out.push('Conditions are broadly stable across tracked domains over the near term.')
  return out
}

// ---------- report ----------
export function generateReport(ctx: AiContext): string {
  const risk = computeRisk(ctx)
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const lines: string[] = []
  lines.push(`# WorldEye Situation Report`, `_Generated ${now}_`, '')
  lines.push(`## Summary`, generateSummary(ctx), '')
  lines.push(`## Risk index: ${risk.score}/100 (${risk.level})`)
  for (const f of risk.factors) lines.push(`- ${f.label} (+${f.points})`)
  if (risk.factors.length === 0) lines.push('- No elevated risk factors.')
  lines.push('', `## Notable activity`)
  for (const a of detectAnomalies(ctx)) lines.push(`- [${a.severity}] ${a.text}`)
  lines.push('', `## Outlook`)
  for (const f of forecast(ctx)) lines.push(`- ${f}`)
  lines.push('', `## Tracked totals`)
  lines.push(
    `- Aircraft: ${ctx.aircraft.count}`,
    `- Vessels: ${ctx.ships.count}`,
    `- Trains: ${ctx.trains.count}`,
    `- Fleet vehicles: ${ctx.fleet.count}`,
    `- Earthquakes (24h): ${ctx.weather.quakes.length}`,
    `- Active cyclones: ${ctx.weather.cyclones.length}`,
    `- Wildfires: ${ctx.weather.wildfires}`,
    `- Malicious hosts: ${ctx.cyber.threats}`,
    `- Satellites: ${ctx.satellites.count}`,
    `- News hotspots: ${ctx.news.hotspots}`,
    `- Social buzz points: ${ctx.social.buzz}`,
  )
  return lines.join('\n')
}

// ---------- natural-language answer ----------
export interface AiAnswer {
  text: string
  actions?: AiAction[]
}
const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w))

export function answerQuery(raw: string, ctx: AiContext): AiAnswer {
  const q = raw.toLowerCase().trim()

  if (has(q, 'help', 'what can you', 'capabilities')) {
    return {
      text: 'Ask me about the live picture: “situation summary”, “current risk”, “any anomalies”, “outlook”, or a domain like aircraft, ships, trains, fleet, traffic, earthquakes, storms, wildfires, cyber threats, satellites, news or social. I can also “generate a report”.',
    }
  }
  if (has(q, 'summary', 'situation', 'overview', "what's happening", 'whats happening', 'sitrep', 'brief')) {
    return { text: generateSummary(ctx) }
  }
  if (has(q, 'risk')) {
    const r = computeRisk(ctx)
    const top = r.factors.slice(0, 4).map((f) => `${f.label} (+${f.points})`).join('; ')
    return { text: `Current risk index is ${r.score}/100 — ${r.level}.${top ? ` Top drivers: ${top}.` : ' No elevated factors right now.'}` }
  }
  if (has(q, 'anomal', 'unusual', 'notable', 'pattern', 'detect')) {
    const a = detectAnomalies(ctx)
    return { text: a.map((x) => `• [${x.severity}] ${x.text}`).join('\n'), actions: a.map((x) => x.action).filter(Boolean) as AiAction[] }
  }
  if (has(q, 'forecast', 'outlook', 'predict', 'expect', 'next 24', 'trend')) {
    return { text: forecast(ctx).map((f) => `• ${f}`).join('\n') }
  }
  if (has(q, 'report')) {
    return { text: 'I can compile a full situation report — use the “Generate report” button above to view & download it.' }
  }
  if (has(q, 'emergency', 'squawk', 'mayday')) {
    if (!ctx.aircraft.emergencies.length) return { text: 'No aircraft are currently squawking an emergency code in view.' }
    const a = ctx.aircraft.emergencies
    return {
      text: `${a.length} aircraft in emergency: ${a.slice(0, 5).map((x) => `${x.callsign ?? x.hex} (${x.emergencyKind ?? 'emergency'})`).join(', ')}.`,
      actions: a.slice(0, 5).map((x) => ({ label: x.callsign ?? x.hex, lat: x.lat, lon: x.lon, zoom: 7 })),
    }
  }
  if (has(q, 'aircraft', 'flight', 'plane', 'airplane')) {
    return { text: `Tracking ${ctx.aircraft.count} aircraft in the current view${ctx.aircraft.emergencies.length ? `, including ${ctx.aircraft.emergencies.length} squawking an emergency` : ''}.` }
  }
  if (has(q, 'ship', 'vessel', 'boat', 'maritime')) return { text: `Tracking ${ctx.ships.count} vessels (AIS).` }
  if (has(q, 'train', 'rail')) return { text: `Tracking ${ctx.trains.count} trains.` }
  if (has(q, 'fleet', 'vehicle', 'truck')) return { text: `Tracking ${ctx.fleet.count} fleet vehicles${ctx.fleet.criticalAlerts ? ` with ${ctx.fleet.criticalAlerts} critical alert(s)` : ''}.` }
  if (has(q, 'traffic', 'congestion', 'incident', 'road')) return { text: `${ctx.traffic.incidents} traffic incidents (${ctx.traffic.highSeverity} high-severity).` }
  if (has(q, 'earthquake', 'quake', 'seismic')) {
    if (!ctx.weather.quakes.length) return { text: 'No recent earthquakes in the feed yet.' }
    const strongest = [...ctx.weather.quakes].sort((a, b) => (b.mag ?? 0) - (a.mag ?? 0))[0]
    return {
      text: `${ctx.weather.quakes.length} earthquakes in the last 24h. Strongest: M${strongest.mag} — ${strongest.place ?? 'unknown'}.`,
      actions: [{ label: `M${strongest.mag}`, lat: strongest.lat, lon: strongest.lon, zoom: 5 }],
    }
  }
  if (has(q, 'storm', 'cyclone', 'hurricane', 'typhoon')) {
    if (!ctx.weather.cyclones.length) return { text: 'No active tropical cyclones right now.' }
    return {
      text: `${ctx.weather.cyclones.length} active cyclone(s): ${ctx.weather.cyclones.map((c) => `${c.name} (${c.category.toUpperCase()})`).join(', ')}.`,
      actions: ctx.weather.cyclones.slice(0, 4).map((c) => ({ label: c.name, lat: c.lat, lon: c.lon, zoom: 4 })),
    }
  }
  if (has(q, 'wildfire', 'fire')) return { text: `${ctx.weather.wildfires} active wildfires (NASA EONET).` }
  if (has(q, 'threat', 'cyber', 'malware', 'c2', 'botnet', 'malicious')) return { text: `${ctx.cyber.threats} malicious hosts (botnet C2) currently on the threat map.` }
  if (has(q, 'satellite', 'iss', 'orbit', 'starlink')) return { text: `${ctx.satellites.count} satellites being propagated in real time.` }
  if (has(q, 'news')) return { text: `${ctx.news.hotspots} geolocated news hotspots on the map.` }
  if (has(q, 'social', 'trend', 'reddit')) return { text: `${ctx.social.buzz} social-buzz hotspots geolocated.` }

  return {
    text: `I focus on the live operational picture. Try “situation summary”, “current risk”, “any anomalies”, or ask about aircraft, ships, weather, earthquakes, storms, cyber threats, satellites, news or social. Type “help” for the full list.`,
  }
}
