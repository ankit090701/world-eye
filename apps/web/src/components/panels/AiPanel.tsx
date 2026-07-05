import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, FileText, Download, Gauge, MapPin, Eraser } from 'lucide-react'
import { PanelShell, SectionTitle } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { addMessage, clearChat } from '../../store/aiSlice'
import { useMapContext } from '../../map/MapContext'
import { useAircraftSnapshot } from '../../data/aircraftStore'
import { useWeatherEvents } from '../../data/weatherStore'
import { useThreatSnapshot } from '../../data/cyberThreatStore'
import { answerQuery, computeRisk, gatherContext, generateReport } from '../../lib/aiEngine'
import type { AiAction, RiskLevel } from '../../types'
import { cx } from '../../lib/cx'

const mid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const QUICK = ['Situation summary', 'Current risk', 'Any anomalies?', 'Outlook']

const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#84cc16',
  elevated: '#f59e0b',
  high: '#f97316',
  severe: '#f43f5e',
}

export default function AiPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const messages = useAppSelector((s) => s.ai.messages)
  const [input, setInput] = useState('')
  const [report, setReport] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // subscribe to a few live stores so the dashboard refreshes as data arrives
  useAircraftSnapshot()
  useWeatherEvents()
  useThreatSnapshot()
  const ctx = gatherContext()
  const risk = computeRisk(ctx)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const ask = (raw: string) => {
    const q = raw.trim()
    if (!q) return
    dispatch(addMessage({ id: mid(), role: 'user', text: q, time: Date.now() }))
    const ans = answerQuery(q, gatherContext())
    dispatch(addMessage({ id: mid(), role: 'assistant', text: ans.text, actions: ans.actions, time: Date.now() }))
    setInput('')
  }

  const flyTo = (a: AiAction) => {
    if (map) map.flyTo({ center: [a.lon, a.lat], zoom: a.zoom ?? 5, speed: 1.3 })
  }

  const makeReport = () => setReport(generateReport(gatherContext()))
  const download = () => {
    if (!report) return
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldeye-sitrep-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const metrics: [string, number][] = [
    ['Aircraft', ctx.aircraft.count],
    ['Vessels', ctx.ships.count],
    ['Quakes 24h', ctx.weather.quakes.length],
    ['Cyclones', ctx.weather.cyclones.length],
    ['Threats', ctx.cyber.threats],
    ['Satellites', ctx.satellites.count],
  ]

  return (
    <PanelShell
      title="AI Intelligence"
      subtitle="Module 15 · situational analysis & assistant"
      icon={<Sparkles size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* risk gauge */}
      <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-we-muted"><Gauge size={13} className="text-we-accent" /> Risk index</span>
          <span className="font-mono text-we-text">{risk.score}/100 · <span style={{ color: RISK_COLOR[risk.level] }}>{risk.level}</span></span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-we-panel">
          <div className="h-full rounded-full transition-all" style={{ width: `${risk.score}%`, background: RISK_COLOR[risk.level] }} />
        </div>
        {risk.factors.length > 0 && (
          <div className="mt-1 text-[10px] text-we-muted">Top: {risk.factors.slice(0, 2).map((f) => f.label).join('; ')}</div>
        )}
      </div>

      {/* metrics */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {metrics.map(([label, val]) => (
          <div key={label} className="rounded-lg border border-we-border bg-we-panel-2/30 px-2 py-1.5 text-center">
            <div className="text-sm font-semibold text-we-text">{val}</div>
            <div className="text-[9px] uppercase tracking-wide text-we-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* report */}
      <div className="mt-2 flex gap-1.5">
        <button onClick={makeReport} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-we-border bg-we-panel-2/40 px-2 py-1.5 text-[11px] text-we-text hover:border-we-border-2">
          <FileText size={12} /> Generate report
        </button>
        {report && (
          <button onClick={download} className="flex items-center justify-center gap-1 rounded-lg border border-we-border px-2 py-1.5 text-[11px] text-we-muted hover:text-we-text">
            <Download size={12} /> .md
          </button>
        )}
      </div>
      {report && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-we-border bg-we-panel-2/30 p-2 text-[10px] leading-snug text-we-muted">
          {report}
        </pre>
      )}

      {/* chat */}
      <div className="mt-3 flex items-center justify-between">
        <SectionTitle>Assistant</SectionTitle>
        <button onClick={() => dispatch(clearChat())} className="flex items-center gap-1 text-[10px] text-we-muted hover:text-we-text">
          <Eraser size={10} /> clear
        </button>
      </div>
      <div ref={scrollRef} className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug', m.role === 'user' ? 'bg-we-accent/15 text-we-text' : 'border border-we-border bg-we-panel-2/40 text-we-text')}>
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.actions.map((a, i) => (
                    <button key={i} onClick={() => flyTo(a)} className="flex items-center gap-0.5 rounded-full border border-we-border px-1.5 py-0.5 text-[9px] text-we-accent hover:border-we-accent/60">
                      <MapPin size={8} /> {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="mt-2 flex flex-wrap gap-1">
        {QUICK.map((q) => (
          <button key={q} onClick={() => ask(q)} className="rounded-full border border-we-border px-2 py-0.5 text-[10px] text-we-muted hover:border-we-border-2 hover:text-we-text">
            {q}
          </button>
        ))}
      </div>

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="mt-2 flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-2.5 py-2 focus-within:border-we-accent/60"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the live picture…"
          className="w-full bg-transparent text-xs text-we-text placeholder:text-we-muted focus:outline-none"
        />
        <button type="submit" disabled={!input.trim()} className="text-we-accent disabled:opacity-40">
          <Send size={15} />
        </button>
      </form>

      <p className="mt-3 text-[10px] leading-relaxed text-we-muted">
        Computed intelligence over your live WorldEye data — keyless. Plug in an LLM
        (ANTHROPIC_API_KEY) for free-form language; see docs.
      </p>
    </PanelShell>
  )
}
