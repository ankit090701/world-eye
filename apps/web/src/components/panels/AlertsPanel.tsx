import { useState } from 'react'
import {
  BellRing,
  Plus,
  Trash2,
  MapPin,
  Crosshair,
  Send,
  ListChecks,
  Radio,
  X,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import {
  addRule,
  clearEvents,
  deleteRule,
  newId,
  setChannel,
  toggleRule,
} from '../../store/alertsSlice'
import { useMapContext } from '../../map/MapContext'
import { deliverAlert, type WebhookKind } from '../../api/alertsApi'
import { CATEGORY_OPTIONS } from '../../lib/alertEval'
import type {
  AlertRule,
  AlertRuleType,
  AlertSeverity,
  AlertSource,
  ChannelConfig,
  ChannelId,
} from '../../types'
import { cx } from '../../lib/cx'

const RULE_TYPES: { id: AlertRuleType; label: string }[] = [
  { id: 'emergency', label: 'Aircraft emergency' },
  { id: 'speed', label: 'Speed threshold' },
  { id: 'geo', label: 'Geo-fence entry' },
  { id: 'earthquake', label: 'Earthquake magnitude' },
  { id: 'cyclone', label: 'Cyclone category' },
  { id: 'threat', label: 'Cyber threat active' },
]
const CHANNELS: { id: ChannelId; label: string }[] = [
  { id: 'inapp', label: 'In-app' },
  { id: 'slack', label: 'Slack' },
  { id: 'discord', label: 'Discord' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
]
const SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical']
const SEL = 'w-full rounded border border-we-border bg-we-panel px-2 py-1 text-xs text-we-text focus:outline-none'

function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return `${Math.round(s)}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}
function ruleSummary(r: AlertRule): string {
  switch (r.type) {
    case 'emergency': return 'any aircraft squawking 7500/7600/7700'
    case 'speed': return `${r.source} faster than ${r.params.threshold ?? 0}${r.source === 'aircraft' ? ' kt' : ' km/h'}`
    case 'geo': return `${r.source} within ${r.params.radiusKm ?? 0} km of a point`
    case 'earthquake': return `magnitude ≥ ${r.params.minMag ?? 0}`
    case 'cyclone': return CATEGORY_OPTIONS.find((c) => c.rank === (r.params.minCategory ?? 0))?.label ?? 'any'
    case 'threat': return 'malicious infrastructure detected'
  }
}

export default function AlertsPanel() {
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<'rules' | 'alerts' | 'channels'>('rules')
  const rules = useAppSelector((s) => s.alerts.rules)
  const events = useAppSelector((s) => s.alerts.events)

  return (
    <PanelShell
      title="Alert Engine"
      subtitle="Module 14 · rules, alerts & notifications"
      icon={<BellRing size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <div className="mb-3 flex gap-1">
        {(['rules', 'alerts', 'channels'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              'flex-1 rounded-md border px-2 py-1 text-[11px] capitalize transition-colors',
              tab === t ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted hover:text-we-text',
            )}
          >
            {t}
            {t === 'alerts' && events.length > 0 ? ` (${events.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'rules' && <RulesTab rules={rules} />}
      {tab === 'alerts' && <AlertsTab />}
      {tab === 'channels' && <ChannelsTab />}
    </PanelShell>
  )
}

function RulesTab({ rules }: { rules: AlertRule[] }) {
  const dispatch = useAppDispatch()
  return (
    <div>
      <RuleBuilder />
      <SectionTitle>Rules ({rules.length})</SectionTitle>
      <div className="space-y-1.5">
        {rules.map((r) => (
          <div key={r.id} className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cx('h-1.5 w-1.5 rounded-full', r.severity === 'critical' ? 'bg-we-danger' : r.severity === 'warning' ? 'bg-we-warn' : 'bg-we-accent')} />
                  <span className="truncate text-xs text-we-text">{r.name}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-we-muted">{ruleSummary(r)}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.channels.map((c) => (
                    <span key={c} className="rounded bg-we-panel px-1 py-0.5 text-[9px] text-we-muted">{c}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Switch checked={r.enabled} onChange={() => dispatch(toggleRule(r.id))} />
                <button onClick={() => dispatch(deleteRule(r.id))} className="text-we-muted hover:text-we-danger" title="Delete rule">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="text-[11px] text-we-muted">No rules yet — create one above.</div>}
      </div>
    </div>
  )
}

function RuleBuilder() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AlertRuleType>('speed')
  const [source, setSource] = useState<AlertSource>('aircraft')
  const [severity, setSeverity] = useState<AlertSeverity>('warning')
  const [threshold, setThreshold] = useState(500)
  const [radiusKm, setRadiusKm] = useState(100)
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null)
  const [minMag, setMinMag] = useState(4.5)
  const [minCategory, setMinCategory] = useState(2)
  const [channels, setChannels] = useState<ChannelId[]>(['inapp'])

  const toggleCh = (c: ChannelId) => setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
  const captureCentre = () => {
    if (!map) return
    const c = map.getCenter()
    setCenter({ lat: Number(c.lat.toFixed(3)), lon: Number(c.lng.toFixed(3)) })
  }

  const submit = () => {
    const params: AlertRule['params'] = {}
    if (type === 'speed') params.threshold = threshold
    if (type === 'geo') {
      if (!center) return
      params.lat = center.lat
      params.lon = center.lon
      params.radiusKm = radiusKm
    }
    if (type === 'earthquake') params.minMag = minMag
    if (type === 'cyclone') params.minCategory = minCategory
    const rule: AlertRule = {
      id: newId(),
      name: name.trim() || RULE_TYPES.find((t) => t.id === type)!.label,
      type,
      enabled: true,
      severity,
      source,
      params,
      channels: channels.length ? channels : ['inapp'],
      createdAt: Date.now(),
    }
    dispatch(addRule(rule))
    setName('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text hover:shadow-glow"
      >
        <Plus size={14} className="text-we-accent" /> New alert rule
      </button>
    )
  }

  const showSource = type === 'speed' || type === 'geo'
  return (
    <div className="mb-3 space-y-2 rounded-lg border border-we-border bg-we-panel-2/40 p-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Rule name (optional)"
        className="w-full rounded border border-we-border bg-we-panel px-2 py-1 text-xs text-we-text placeholder:text-we-muted focus:outline-none"
      />
      <Field label="Trigger">
        <select value={type} onChange={(e) => setType(e.target.value as AlertRuleType)} className={SEL}>
          {RULE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </Field>
      {showSource && (
        <Field label="Object">
          <select value={source} onChange={(e) => setSource(e.target.value as AlertSource)} className={SEL}>
            <option value="aircraft">Aircraft</option>
            <option value="fleet">Fleet vehicles</option>
          </select>
        </Field>
      )}
      {type === 'speed' && (
        <Field label={`Threshold (${source === 'aircraft' ? 'kt' : 'km/h'})`}>
          <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className={SEL} />
        </Field>
      )}
      {type === 'geo' && (
        <>
          <Field label="Radius (km)">
            <input type="number" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className={SEL} />
          </Field>
          <button onClick={captureCentre} className="flex w-full items-center justify-center gap-1 rounded border border-we-border px-2 py-1 text-[11px] text-we-muted hover:text-we-text">
            <Crosshair size={12} /> {center ? `${center.lat}, ${center.lon}` : 'Use map centre as zone centre'}
          </button>
        </>
      )}
      {type === 'earthquake' && (
        <Field label="Min magnitude">
          <input type="number" step="0.1" value={minMag} onChange={(e) => setMinMag(Number(e.target.value))} className={SEL} />
        </Field>
      )}
      {type === 'cyclone' && (
        <Field label="Min category">
          <select value={minCategory} onChange={(e) => setMinCategory(Number(e.target.value))} className={SEL}>
            {CATEGORY_OPTIONS.map((c) => <option key={c.rank} value={c.rank}>{c.label}</option>)}
          </select>
        </Field>
      )}
      <Field label="Severity">
        <select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity)} className={SEL}>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div>
        <div className="mb-1 text-[10px] text-we-muted">Notify via</div>
        <div className="flex flex-wrap gap-1">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCh(c.id)}
              className={cx('rounded-full border px-2 py-0.5 text-[10px]', channels.includes(c.id) ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-1.5 text-xs text-we-text hover:shadow-glow">
          Create rule
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-we-border px-3 py-1.5 text-xs text-we-muted hover:text-we-text">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

function AlertsTab() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const events = useAppSelector((s) => s.alerts.events)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Recent alerts</SectionTitle>
        {events.length > 0 && (
          <button onClick={() => dispatch(clearEvents())} className="text-[10px] text-we-muted hover:text-we-text">clear</button>
        )}
      </div>
      {events.length === 0 && (
        <div className="flex items-center gap-2 py-4 text-[11px] text-we-muted">
          <ListChecks size={14} /> No alerts fired yet — rules evaluate live data as it arrives.
        </div>
      )}
      <div className="space-y-1.5">
        {events.map((e) => (
          <button
            key={e.id}
            onClick={() => e.lat != null && e.lon != null && map?.flyTo({ center: [e.lon, e.lat], zoom: Math.max(map.getZoom(), 5), speed: 1.3 })}
            className="block w-full rounded-lg border border-we-border bg-we-panel-2/30 p-2.5 text-left hover:border-we-border-2"
          >
            <div className="flex items-center gap-1.5">
              <span className={cx('h-1.5 w-1.5 rounded-full', e.severity === 'critical' ? 'bg-we-danger' : e.severity === 'warning' ? 'bg-we-warn' : 'bg-we-accent')} />
              <span className="flex-1 truncate text-[11px] text-we-text">{e.title}</span>
              {e.lat != null && <MapPin size={10} className="text-we-muted" />}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[10px] text-we-muted">
              <span className="truncate">{e.detail}</span>
              <span className="shrink-0">{timeAgo(e.time)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChannelsTab() {
  const dispatch = useAppDispatch()
  const channels = useAppSelector((s) => s.alerts.channels)
  return (
    <div className="space-y-2">
      <WebhookRow kind="slack" label="Slack" cfg={channels.slack} placeholder="https://hooks.slack.com/services/…" />
      <WebhookRow kind="discord" label="Discord" cfg={channels.discord} placeholder="https://discord.com/api/webhooks/…" />
      <WebhookRow kind="webhook" label="Webhook" cfg={channels.webhook} placeholder="https://your-endpoint/…" />

      <SectionTitle>Provider channels</SectionTitle>
      <StubRow k="email" label="Email" value={channels.email.address} enabled={channels.email.enabled}
        onToggle={(v) => dispatch(setChannel({ key: 'email', patch: { enabled: v } }))}
        onChange={(v) => dispatch(setChannel({ key: 'email', patch: { address: v } }))} placeholder="alerts@example.com" />
      <StubRow k="sms" label="SMS" value={channels.sms.number} enabled={channels.sms.enabled}
        onToggle={(v) => dispatch(setChannel({ key: 'sms', patch: { enabled: v } }))}
        onChange={(v) => dispatch(setChannel({ key: 'sms', patch: { number: v } }))} placeholder="+1 555 0100" />
      <p className="mt-1 text-[10px] leading-relaxed text-we-muted">
        Slack / Discord / Webhook deliver in real time via the WorldEye API (https only,
        private hosts blocked). Email & SMS require a provider (SendGrid / Twilio) — stored
        here, delivery is stubbed.
      </p>
    </div>
  )
}

function WebhookRow({ kind, label, cfg, placeholder }: { kind: WebhookKind; label: string; cfg: ChannelConfig['slack']; placeholder: string }) {
  const dispatch = useAppDispatch()
  const [status, setStatus] = useState<string | null>(null)
  const test = async () => {
    if (!cfg.url) return
    setStatus('…')
    const r = await deliverAlert(kind, cfg.url, `WorldEye test alert ✅ (${label})`)
    setStatus(r.ok ? 'sent ✓' : `failed: ${r.error ?? r.status}`)
    window.setTimeout(() => setStatus(null), 4000)
  }
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-we-text"><Radio size={12} className="text-we-accent" /> {label}</span>
        <Switch checked={cfg.enabled} onChange={(v) => dispatch(setChannel({ key: kind, patch: { enabled: v } }))} />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={cfg.url}
          onChange={(e) => dispatch(setChannel({ key: kind, patch: { url: e.target.value } }))}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded border border-we-border bg-we-panel px-2 py-1 font-mono text-[10px] text-we-text placeholder:text-we-muted focus:outline-none"
        />
        <button onClick={test} disabled={!cfg.url} className="flex items-center gap-1 rounded border border-we-border px-2 py-1 text-[10px] text-we-muted hover:text-we-text disabled:opacity-40">
          <Send size={11} /> Test
        </button>
      </div>
      {status && <div className="mt-1 text-[10px] text-we-muted">{status}</div>}
    </div>
  )
}

function StubRow({ k, label, value, enabled, onToggle, onChange, placeholder }: { k: string; label: string; value: string; enabled: boolean; onToggle: (v: boolean) => void; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-we-text">{label} <span className="text-[9px] text-we-muted">· stub</span></span>
        <Switch checked={enabled} onChange={onToggle} />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded border border-we-border bg-we-panel px-2 py-1 text-[10px] text-we-text placeholder:text-we-muted focus:outline-none"
        data-k={k}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-we-muted">{label}</span>
      <span className="w-40">{children}</span>
    </label>
  )
}
