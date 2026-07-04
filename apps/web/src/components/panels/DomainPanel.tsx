import maplibregl from 'maplibre-gl'
import {
  Globe,
  Search,
  Loader2,
  ScrollText,
  Server,
  MailCheck,
  Lock,
  Boxes,
  History,
  Cloud,
  MapPin,
  Network,
} from 'lucide-react'
import { PanelShell, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { clearReport, lookupError, lookupOk, lookupStart, setQuery } from '../../store/domainSlice'
import { setLayerVisible, toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { fetchDomainLookup } from '../../api/domainApi'
import { domainInfraStore } from '../../data/domainInfraStore'
import type { DomainReport, EmailSecurity } from '../../types'
import { cx } from '../../lib/cx'

let lookupSeq = 0
const EXAMPLES = ['github.com', 'wikipedia.org', 'anthropic.com', 'kagi.com']
const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10) : null)

export default function DomainPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const query = useAppSelector((s) => s.domain.query)
  const report = useAppSelector((s) => s.domain.report)
  const loading = useAppSelector((s) => s.domain.loading)
  const error = useAppSelector((s) => s.domain.error)
  const infraOn = useAppSelector((s) => s.layers.items.find((l) => l.id === 'domain-infra')?.visible ?? false)

  const doLookup = async (raw: string) => {
    const q = raw.trim()
    if (!q) return
    const seq = ++lookupSeq
    dispatch(setQuery(q))
    dispatch(lookupStart())
    try {
      const r = await fetchDomainLookup(q)
      if (seq !== lookupSeq) return // superseded by a newer lookup
      dispatch(lookupOk(r))
      if (r.infra.length > 0) {
        domainInfraStore.update(r.domain, r.infra)
        // Idempotent set (not toggle): safe even if the layer was toggled mid-request.
        dispatch(setLayerVisible({ id: 'domain-infra', visible: true }))
        if (map) {
          const b = new maplibregl.LngLatBounds()
          r.infra.forEach((p) => b.extend([p.lon, p.lat]))
          map.fitBounds(b, { padding: 120, maxZoom: 5, duration: 1200 })
        }
      } else {
        domainInfraStore.clear()
      }
    } catch (err) {
      if (seq !== lookupSeq) return
      if (err instanceof DOMException && err.name === 'AbortError') {
        dispatch(lookupError('Lookup timed out — the domain may be very large. Try again.'))
        return
      }
      const msg = err instanceof Error && err.message && !err.message.startsWith('HTTP') ? err.message : null
      dispatch(lookupError(msg || 'Lookup failed — is the WorldEye API running?'))
    }
  }

  return (
    <PanelShell
      title="Domain Intelligence"
      subtitle="Module 8 · WHOIS · DNS · email · certs · subdomains"
      icon={<Globe size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          doLookup(query)
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-2.5 py-2 focus-within:border-we-accent/60">
          <Search size={14} className="text-we-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => dispatch(setQuery(e.target.value))}
            placeholder="domain  (e.g. github.com)"
            className="w-full bg-transparent font-mono text-xs text-we-text placeholder:text-we-muted focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text hover:shadow-glow disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} className="text-we-accent" />}
          {loading ? 'Investigating…' : 'Investigate'}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => doLookup(ex)}
            className="rounded-full border border-we-border px-2 py-0.5 font-mono text-[10px] text-we-muted hover:border-we-border-2 hover:text-we-text"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="mt-3 text-[11px] text-we-warn">{error}</div>}

      {report && <Report report={report} infraOn={infraOn} />}

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Sources: RDAP · Google DoH · certspotter / crt.sh · ip-api — all free, no keys. Passive OSINT
        only (certificate-transparency + public DNS); no active scanning of the target.
      </p>
    </PanelShell>
  )
}

function Report({ report, infraOn }: { report: DomainReport; infraOn: boolean }) {
  const dispatch = useAppDispatch()
  const w = report.whois
  const d = report.dns
  return (
    <div className="mt-3 space-y-3">
      {/* header */}
      <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-semibold text-we-text">{report.domain}</div>
            <div className="text-[10px] uppercase tracking-wide text-we-muted">
              {report.resolvedIp ? `resolves → ${report.resolvedIp}` : 'no A record'}
            </div>
          </div>
          {report.hosting?.cloud && (
            <span className="flex items-center gap-1 rounded bg-we-accent/15 px-2 py-1 text-[10px] font-semibold text-we-accent">
              <Cloud size={11} /> {report.hosting.cloud}
            </span>
          )}
        </div>
      </div>

      {/* whois */}
      {w && (
        <Section icon={<ScrollText size={13} />} title="WHOIS / Registration">
          <Row label="Registrar" value={w.registrar} />
          <Row label="Created" value={fmtDate(w.createdDate)} />
          <Row label="Updated" value={fmtDate(w.updatedDate)} />
          <Row label="Expires" value={fmtDate(w.expiryDate)} />
          <Row label="DNSSEC" value={w.dnssec == null ? null : w.dnssec ? 'Signed' : 'Unsigned'} />
          <Row label="Registrant" value={w.registrant} />
          {w.nameservers.length > 0 && <RecordRow label="NS" values={w.nameservers} />}
          {w.statuses.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {w.statuses.slice(0, 4).map((s) => (
                <Pill key={s}>{s.replace(/\s*https?:\/\/.*/, '')}</Pill>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* email security */}
      <EmailSection email={report.email} />

      {/* dns */}
      <Section icon={<Server size={13} />} title="DNS records">
        <RecordRow label="A" values={d.A} />
        <RecordRow label="AAAA" values={d.AAAA} />
        <RecordRow label="MX" values={d.MX} />
        <RecordRow label="NS" values={d.NS} />
        <RecordRow label="CNAME" values={d.CNAME} />
        <RecordRow label="CAA" values={d.CAA} />
        <RecordRow label="TXT" values={d.TXT} mono={false} />
      </Section>

      {/* hosting */}
      {report.hosting && (
        <Section icon={<MapPin size={13} />} title="Hosting">
          <Row label="IP" value={report.hosting.ip} />
          <Row label="Org" value={report.hosting.org} />
          <Row label="ISP" value={report.hosting.isp} />
          <Row label="ASN" value={report.hosting.asn} />
          <Row label="Location" value={[report.hosting.city, report.hosting.country].filter(Boolean).join(', ') || null} />
        </Section>
      )}

      {/* infrastructure footprint */}
      {report.infra.length > 0 && (
        <Section icon={<Network size={13} />} title={`Infrastructure footprint (${report.infra.length})`}>
          <div className="mb-1.5 text-[10px] text-we-muted">
            {report.infra.length} hosts ·{' '}
            {new Set(report.infra.map((p) => p.country).filter(Boolean)).size} countries — plotted on the map.
          </div>
          <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-2.5 py-1.5">
            <span className="text-[11px] text-we-text">Show on map</span>
            <Switch checked={infraOn} onChange={() => dispatch(toggleLayer('domain-infra'))} />
          </div>
        </Section>
      )}

      {/* certificates */}
      {report.certs.length > 0 && (
        <Section icon={<Lock size={13} />} title={`Certificates (${report.certs.length})`}>
          {report.certs.slice(0, 5).map((c, i) => (
            <div key={i} className="border-t border-we-border/50 py-1 first:border-0">
              <div className="truncate font-mono text-[11px] text-we-text">{c.commonName || '—'}</div>
              <div className="text-[10px] text-we-muted">
                {c.issuer || 'CA'} · until {fmtDate(c.notAfter) ?? '—'}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* subdomains */}
      {report.subdomains.length > 0 && (
        <Section icon={<Boxes size={13} />} title={`Subdomains (${report.subdomains.length})`}>
          <div className="max-h-40 space-y-0.5 overflow-y-auto pr-1">
            {report.subdomains.slice(0, 60).map((s) => (
              <div key={s} className="truncate font-mono text-[10px] text-we-text">
                {s}
              </div>
            ))}
          </div>
          {report.subdomains.length > 60 && (
            <div className="mt-1 text-[10px] text-we-muted">+{report.subdomains.length - 60} more</div>
          )}
        </Section>
      )}

      {/* CT history */}
      {report.history.length > 0 && (
        <Section icon={<History size={13} />} title="Historical DNS / CT activity">
          <div className="mb-1 text-[10px] text-we-muted">
            Recent certificate-transparency records{report.ctSource ? ` · ${report.ctSource}` : ''}
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
            {report.history.slice(0, 12).map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate font-mono text-we-text">{h.name}</span>
                <span className="shrink-0 text-we-muted">{fmtDate(h.firstSeen) ?? '—'}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.errors.length > 0 && (
        <div className="text-[10px] text-we-warn">{report.errors.join(' · ')}</div>
      )}

      <button onClick={() => (dispatch(clearReport()), domainInfraStore.clear())} className="text-[10px] text-we-muted hover:text-we-text">
        clear report
      </button>
    </div>
  )
}

function EmailSection({ email }: { email: EmailSecurity }) {
  const spfTone = email.spf.policy === 'hardfail' ? 'good' : email.spf.policy === 'softfail' ? 'warn' : 'muted'
  const dmarcTone =
    email.dmarc.policy === 'reject' ? 'good' : email.dmarc.policy === 'quarantine' ? 'warn' : email.dmarc.present ? 'danger' : 'muted'
  return (
    <Section icon={<MailCheck size={13} />} title="Email security">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-we-muted">SPF</span>
        {email.spf.present ? <Badge tone={spfTone}>{email.spf.policy}</Badge> : <Badge tone="danger">missing</Badge>}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-we-muted">DMARC</span>
        {email.dmarc.present ? (
          <Badge tone={dmarcTone}>
            p={email.dmarc.policy}
            {email.dmarc.pct != null && email.dmarc.pct !== 100 ? ` (${email.dmarc.pct}%)` : ''}
          </Badge>
        ) : (
          <Badge tone="danger">missing</Badge>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 text-[11px]">
        <span className="text-we-muted">DKIM</span>
        <span className="text-right">
          {email.dkim.length > 0 ? (
            <span className="flex flex-wrap justify-end gap-1">
              {email.dkim.map((k) => (
                <Pill key={k.selector}>{k.selector}</Pill>
              ))}
            </span>
          ) : (
            <span className="text-we-muted">none found</span>
          )}
        </span>
      </div>
      {email.mxProviders.length > 0 && (
        <div className="flex items-start justify-between gap-2 text-[11px]">
          <span className="text-we-muted">Mail provider</span>
          <span className="flex flex-wrap justify-end gap-1">
            {email.mxProviders.map((m) => (
              <Pill key={m}>{m}</Pill>
            ))}
          </span>
        </div>
      )}
    </Section>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-we-muted">
        <span className="text-we-accent">{icon}</span>
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-we-muted">{label}</span>
      <span className="truncate text-right font-mono text-we-text">{value}</span>
    </div>
  )
}
function RecordRow({ label, values, mono = true }: { label: string; values: string[]; mono?: boolean }) {
  if (!values.length) return null
  return (
    <div className="flex items-start justify-between gap-2 text-[11px]">
      <span className="text-we-muted">{label}</span>
      <span
        className={cx('min-w-0 flex-1 truncate text-right text-[10px] text-we-text', mono && 'font-mono')}
        title={values.join(', ')}
      >
        {values.slice(0, 3).join(', ')}
        {values.length > 3 ? ` +${values.length - 3}` : ''}
      </span>
    </div>
  )
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-we-panel px-1.5 py-0.5 text-[9px] font-medium text-we-muted">{children}</span>
}
function Badge({ tone, children }: { tone: 'good' | 'warn' | 'danger' | 'muted'; children: React.ReactNode }) {
  const cls =
    tone === 'good'
      ? 'bg-we-good/15 text-we-good'
      : tone === 'warn'
        ? 'bg-we-warn/15 text-we-warn'
        : tone === 'danger'
          ? 'bg-we-danger/20 text-we-danger'
          : 'bg-we-panel text-we-muted'
  return <span className={cx('rounded px-1.5 py-0.5 text-[10px] font-semibold', cls)}>{children}</span>
}
