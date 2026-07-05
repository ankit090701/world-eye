import { useState } from 'react'
import { FileText, Download, Plus, Trash2, Clock, Calendar, Loader2, FileDown } from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { addSchedule, deleteSchedule, newReportId, toggleSchedule } from '../../store/reportsSlice'
import { buildReport, toCsv, toJson, toMarkdown, type Report } from '../../lib/reportBuilder'
import { toExcel, toPdf } from '../../lib/reportExport'
import type { GeneratedReport, ReportKind, ScheduledReport } from '../../types'
import { cx } from '../../lib/cx'

function downloadBlob(content: string, type: string, name: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const KINDS: { id: ReportKind; label: string }[] = [
  { id: 'situation', label: 'Situation' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'full', label: 'Full' },
]
const INTERVALS = [
  { min: 15, label: '15 min' },
  { min: 60, label: 'Hourly' },
  { min: 360, label: '6 hours' },
  { min: 1440, label: 'Daily' },
]

export default function ReportsPanel() {
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<'generate' | 'scheduled'>('generate')
  const recent = useAppSelector((s) => s.reports.recent)
  const scheduled = useAppSelector((s) => s.reports.scheduled)

  return (
    <PanelShell
      title="Reports"
      subtitle="Module 17 · PDF · Excel · CSV · scheduled"
      icon={<FileText size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <div className="mb-3 flex gap-1">
        {(['generate', 'scheduled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx('flex-1 rounded-md border px-2 py-1 text-[11px] capitalize', tab === t ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted hover:text-we-text')}
          >
            {t}
            {t === 'scheduled' && scheduled.length ? ` (${scheduled.length})` : ''}
          </button>
        ))}
      </div>
      {tab === 'generate' ? <GenerateTab recent={recent} /> : <ScheduledTab scheduled={scheduled} />}
    </PanelShell>
  )
}

function GenerateTab({ recent }: { recent: GeneratedReport[] }) {
  const dispatch = useAppDispatch()
  const [kind, setKind] = useState<ReportKind>('situation')
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const generate = () => {
    setErr(null)
    setReport(buildReport(kind))
  }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const run = async (fmt: string, fn: () => void | Promise<void>) => {
    setErr(null)
    setBusy(fmt)
    try {
      await fn()
    } catch (e) {
      setErr(`${fmt} export failed: ${e instanceof Error ? e.message : 'error'}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className="flex-1 rounded border border-we-border bg-we-panel px-2 py-1.5 text-xs text-we-text focus:outline-none">
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label} report</option>)}
        </select>
        <button onClick={generate} className="flex items-center gap-1.5 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-1.5 text-xs text-we-text hover:shadow-glow">
          <FileText size={13} className="text-we-accent" /> Generate
        </button>
      </div>

      {err && <div className="mt-2 text-[11px] text-we-warn">{err}</div>}

      {report && (
        <>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {([
              ['PDF', () => toPdf(report, `${report.kind}-${stamp()}.pdf`)],
              ['Excel', () => toExcel(report, `${report.kind}-${stamp()}.xlsx`)],
              ['CSV', () => downloadBlob(toCsv(report), 'text/csv', `${report.kind}-${stamp()}.csv`)],
              ['MD', () => downloadBlob(toMarkdown(report), 'text/markdown', `${report.kind}-${stamp()}.md`)],
              ['JSON', () => downloadBlob(toJson(report), 'application/json', `${report.kind}-${stamp()}.json`)],
            ] as [string, () => void | Promise<void>][]).map(([label, fn]) => (
              <button
                key={label}
                onClick={() => run(label, fn)}
                disabled={busy != null}
                className="flex items-center justify-center gap-1 rounded-lg border border-we-border bg-we-panel-2/40 px-1 py-1.5 text-[10px] text-we-text hover:border-we-border-2 disabled:opacity-40"
              >
                {busy === label ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} {label}
              </button>
            ))}
          </div>
          <ReportPreview report={report} />
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionTitle>Recent reports</SectionTitle>
          <div className="space-y-1">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/30 px-2.5 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-we-text">{r.title}</div>
                  <div className="text-[9px] text-we-muted">{new Date(r.at).toLocaleTimeString()}</div>
                </div>
                <button onClick={() => downloadBlob(r.markdown, 'text/markdown', `${r.kind}-${r.at}.md`)} className="flex items-center gap-1 text-[10px] text-we-accent hover:underline">
                  <FileDown size={11} /> .md
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ReportPreview({ report }: { report: Report }) {
  return (
    <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
      <div className="text-xs font-semibold text-we-text">{report.title}</div>
      <div className="text-[9px] text-we-muted">{report.generatedAt}</div>
      {report.sections.map((s, i) => (
        <div key={i} className="mt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-we-accent">{s.title}</div>
          {s.kind === 'text' && <div className="mt-0.5 whitespace-pre-wrap text-[10px] leading-snug text-we-muted">{s.text}</div>}
          {s.kind === 'kv' && (
            <div className="mt-0.5 space-y-0.5">
              {s.kv!.map(([k, v], j) => (
                <div key={j} className="flex justify-between gap-2 text-[10px]">
                  <span className="text-we-muted">{k}</span>
                  <span className="font-mono text-we-text">{v}</span>
                </div>
              ))}
            </div>
          )}
          {s.kind === 'table' && s.table && (
            <table className="mt-0.5 w-full text-[9.5px]">
              <thead>
                <tr>{s.table.headers.map((h, j) => <th key={j} className="border-b border-we-border py-0.5 text-left text-we-muted">{h}</th>)}</tr>
              </thead>
              <tbody>
                {s.table.rows.slice(0, 12).map((row, j) => (
                  <tr key={j}>{row.map((c, k) => <td key={k} className="py-0.5 text-we-text">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

function ScheduledTab({ scheduled }: { scheduled: ScheduledReport[] }) {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ReportKind>('situation')
  const [intervalMin, setIntervalMin] = useState(60)
  const [delivery, setDelivery] = useState<'notify' | 'webhook'>('notify')
  const [webhookUrl, setWebhookUrl] = useState('')

  const add = () => {
    const s: ScheduledReport = {
      id: newReportId(),
      name: name.trim() || `${KINDS.find((k) => k.id === kind)!.label} report`,
      kind,
      intervalMin,
      delivery,
      webhookUrl: webhookUrl.trim(),
      enabled: true,
      lastRun: 0,
    }
    dispatch(addSchedule(s))
    setName('')
    setWebhookUrl('')
  }

  return (
    <div>
      <div className="space-y-2 rounded-lg border border-we-border bg-we-panel-2/40 p-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Schedule name (optional)" className="w-full rounded border border-we-border bg-we-panel px-2 py-1 text-xs text-we-text placeholder:text-we-muted focus:outline-none" />
        <div className="flex gap-1.5">
          <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className="flex-1 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text focus:outline-none">
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <select value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} className="flex-1 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text focus:outline-none">
            {INTERVALS.map((iv) => <option key={iv.min} value={iv.min}>{iv.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          {(['notify', 'webhook'] as const).map((d) => (
            <button key={d} onClick={() => setDelivery(d)} className={cx('flex-1 rounded border px-2 py-1 text-[10px] capitalize', delivery === d ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted')}>{d}</button>
          ))}
        </div>
        {delivery === 'webhook' && (
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/…" className="w-full rounded border border-we-border bg-we-panel px-2 py-1 font-mono text-[10px] text-we-text placeholder:text-we-muted focus:outline-none" />
        )}
        <button onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-1.5 text-xs text-we-text hover:shadow-glow">
          <Plus size={13} className="text-we-accent" /> Add schedule
        </button>
      </div>

      <SectionTitle>Schedules ({scheduled.length})</SectionTitle>
      <div className="space-y-1.5">
        {scheduled.map((s) => (
          <div key={s.id} className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs text-we-text">{s.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-we-muted">
                  <span className="flex items-center gap-0.5"><Calendar size={9} /> {s.kind}</span>
                  <span className="flex items-center gap-0.5"><Clock size={9} /> {INTERVALS.find((i) => i.min === s.intervalMin)?.label ?? `${s.intervalMin}m`}</span>
                  <span>· {s.delivery}</span>
                </div>
                <div className="text-[9px] text-we-muted">{s.lastRun ? `last run ${new Date(s.lastRun).toLocaleTimeString()}` : 'not run yet'}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Switch checked={s.enabled} onChange={() => dispatch(toggleSchedule(s.id))} />
                <button onClick={() => dispatch(deleteSchedule(s.id))} className="text-we-muted hover:text-we-danger"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
        {scheduled.length === 0 && <div className="text-[11px] text-we-muted">No schedules yet.</div>}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-we-muted">
        Schedules run in-app while WorldEye is open (checked each minute). Webhook delivery
        uses the same SSRF-guarded relay as alerts. In production a server/worker cron runs
        the same report builder.
      </p>
    </div>
  )
}
