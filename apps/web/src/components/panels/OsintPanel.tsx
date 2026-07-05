import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import {
  ScanSearch,
  Mail,
  AtSign,
  Phone,
  Building2,
  Search,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Check,
  X,
  Users,
} from 'lucide-react'
import { PanelShell, SectionTitle } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import {
  clearReport,
  lookupError,
  lookupOk,
  lookupStart,
  setCountry,
  setKind,
  setQuery,
} from '../../store/osintSlice'
import { useMapContext } from '../../map/MapContext'
import { fetchOsint } from '../../api/osintApi'
import type {
  CompanyReport,
  EmailReport,
  OsintKind,
  OsintResponse,
  PhoneReport,
  UsernameReport,
} from '../../types'
import { cx } from '../../lib/cx'

let osintMarker: maplibregl.Marker | null = null
let lookupSeq = 0
function dropMarker(map: maplibregl.Map, lng: number, lat: number) {
  osintMarker?.remove()
  const el = document.createElement('div')
  el.className = 'we-search-marker'
  el.style.background = '#2dd4bf'
  osintMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
}

const TABS: { id: OsintKind; label: string; icon: typeof Mail; placeholder: string }[] = [
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'name@example.com' },
  { id: 'username', label: 'Username', icon: AtSign, placeholder: 'username' },
  { id: 'phone', label: 'Phone', icon: Phone, placeholder: '+1 415 555 2671' },
  { id: 'company', label: 'Company', icon: Building2, placeholder: 'company name' },
]
const EXAMPLES: Record<OsintKind, string[]> = {
  email: ['test@gmail.com', 'info@github.com'],
  username: ['torvalds', 'gaearon'],
  phone: ['+14155552671', '+442071838750'],
  company: ['Anthropic', 'GitHub'],
}

function flag(iso: string | null): string {
  if (!iso || iso.length !== 2) return ''
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export default function OsintPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const kind = useAppSelector((s) => s.osint.kind)
  const query = useAppSelector((s) => s.osint.query)
  const country = useAppSelector((s) => s.osint.country)
  const report = useAppSelector((s) => s.osint.report)
  const loading = useAppSelector((s) => s.osint.loading)
  const error = useAppSelector((s) => s.osint.error)

  // Remove the result marker when the panel closes.
  useEffect(() => {
    return () => {
      osintMarker?.remove()
    }
  }, [])

  const doLookup = async (raw: string) => {
    const q = raw.trim()
    if (!q) return
    const seq = ++lookupSeq
    dispatch(setQuery(q))
    dispatch(lookupStart())
    try {
      const r = await fetchOsint(kind, q, kind === 'phone' ? country : undefined)
      if (seq !== lookupSeq) return
      dispatch(lookupOk(r))
      if (map && r.location) {
        dropMarker(map, r.location.lon, r.location.lat)
        map.flyTo({ center: [r.location.lon, r.location.lat], zoom: Math.max(map.getZoom(), 4), speed: 1.2 })
      }
    } catch (err) {
      if (seq !== lookupSeq) return
      const msg = err instanceof Error && err.message && !err.message.startsWith('HTTP') ? err.message : null
      dispatch(lookupError(msg || 'Lookup failed — is the WorldEye API running?'))
    }
  }

  return (
    <PanelShell
      title="OSINT Search"
      subtitle="Module 13 · public / consent-based intelligence"
      icon={<ScanSearch size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* kind tabs */}
      <div className="flex flex-wrap gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => dispatch(setKind(id))}
            className={cx(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors',
              kind === id
                ? 'border-we-accent/60 bg-we-accent/15 text-we-accent'
                : 'border-we-border text-we-muted hover:text-we-text',
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          doLookup(query)
        }}
        className="mt-2 space-y-2"
      >
        <div className="flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-2.5 py-2 focus-within:border-we-accent/60">
          <Search size={14} className="text-we-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => dispatch(setQuery(e.target.value))}
            placeholder={TABS.find((t) => t.id === kind)?.placeholder}
            className="w-full bg-transparent font-mono text-xs text-we-text placeholder:text-we-muted focus:outline-none"
          />
          {kind === 'phone' && (
            <input
              value={country}
              onChange={(e) => dispatch(setCountry(e.target.value.toUpperCase().slice(0, 2)))}
              placeholder="US"
              title="Default country (ISO2) if no + code"
              className="w-10 shrink-0 rounded border border-we-border bg-we-panel px-1 py-0.5 text-center text-[10px] uppercase text-we-muted focus:outline-none"
            />
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text hover:shadow-glow disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} className="text-we-accent" />}
          {loading ? 'Searching…' : 'Investigate'}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES[kind].map((ex) => (
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
      {report && <Report report={report} onClear={() => (dispatch(clearReport()), osintMarker?.remove())} />}

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Public / consent-based OSINT only — deliverability, public profiles, phone
        metadata (no owner lookup) and public breach notifications. No private-data lookups.
      </p>
    </PanelShell>
  )
}

function Report({ report, onClear }: { report: OsintResponse; onClear: () => void }) {
  return (
    <div className="mt-3 space-y-3">
      {report.email && <EmailView r={report.email} />}
      {report.username && <UsernameView r={report.username} />}
      {report.phone && <PhoneView r={report.phone} />}
      {report.company && <CompanyView r={report.company} />}
      {report.errors.length > 0 && <div className="text-[10px] text-we-warn">{report.errors.join(' · ')}</div>}
      <button onClick={onClear} className="text-[10px] text-we-muted hover:text-we-text">
        clear
      </button>
    </div>
  )
}

function EmailView({ r }: { r: EmailReport }) {
  return (
    <>
      <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
        <div className="truncate font-mono text-sm font-semibold text-we-text">{r.address}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Flag ok={r.deliverable} label={r.deliverable ? 'Deliverable' : 'No MX'} />
          {r.disposable && <Flag danger label="Disposable" />}
          {r.freeProvider && <Flag label="Free provider" />}
          {r.breaches.exposed ? <Flag danger label={`${r.breaches.count} breaches`} /> : <Flag ok label="No known breaches" />}
        </div>
      </div>

      {r.gravatar.found && (
        <Section icon={<Users size={13} />} title="Gravatar (public profile)">
          <div className="flex items-center gap-2">
            {r.gravatar.avatarUrl && <img src={r.gravatar.avatarUrl} alt="" className="h-9 w-9 rounded-full" />}
            <div className="min-w-0">
              <div className="truncate text-[11px] text-we-text">{r.gravatar.displayName || r.gravatar.username}</div>
              {r.gravatar.profileUrl && (
                <a href={r.gravatar.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-we-accent hover:underline">
                  {r.gravatar.profileUrl} <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        </Section>
      )}

      {r.breaches.exposed && (
        <Section icon={<ShieldAlert size={13} />} title={`Breach exposure (${r.breaches.count})`}>
          <div className="flex flex-wrap gap-1">
            {r.breaches.names.slice(0, 24).map((b) => (
              <span key={b} className="rounded bg-we-danger/15 px-1.5 py-0.5 text-[9px] text-we-danger">{b}</span>
            ))}
          </div>
          <div className="mt-1 text-[9px] text-we-muted">Public breach notifications (XposedOrNot)</div>
        </Section>
      )}

      <Section icon={<Mail size={13} />} title="Deliverability">
        <Row label="Valid format" value={r.validFormat ? 'Yes' : 'No'} />
        <Row label="Domain" value={r.domain} />
        <RecordRow label="MX" values={r.mx} />
      </Section>

      {r.host && (
        <Section icon={<MapPin size={13} />} title="Domain hosting">
          <Row label="IP" value={r.host.ip} />
          <Row label="Org" value={r.host.org} />
          <Row label="Country" value={r.host.country} />
        </Section>
      )}
    </>
  )
}

function UsernameView({ r }: { r: UsernameReport }) {
  const g = r.github
  return (
    <>
      {g ? (
        <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
          <div className="flex items-center gap-2.5">
            {g.avatarUrl && <img src={g.avatarUrl} alt="" className="h-11 w-11 rounded-full" />}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-we-text">{g.name || g.login}</div>
              <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-we-accent hover:underline">
                @{g.login} <ExternalLink size={9} />
              </a>
            </div>
          </div>
          {g.bio && <div className="mt-2 text-[11px] leading-snug text-we-muted">{g.bio}</div>}
          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
            {g.company && <Row label="Company" value={g.company} />}
            {g.location && <Row label="Location" value={g.location} />}
            <Row label="Followers" value={String(g.followers)} />
            <Row label="Repos" value={String(g.repos)} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5 text-[11px] text-we-muted">
          No GitHub profile for “{r.username}”.
        </div>
      )}

      <Section icon={<Users size={13} />} title="Public profiles">
        {r.platforms.map((p) => (
          <div key={p.platform} className="flex items-center justify-between py-0.5 text-[11px]">
            <span className="flex items-center gap-1.5 text-we-text">
              {p.found ? <Check size={12} className="text-we-good" /> : <X size={12} className="text-we-muted" />}
              {p.platform}
            </span>
            {p.found && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-we-accent hover:underline">
                view
              </a>
            )}
          </div>
        ))}
      </Section>
    </>
  )
}

function PhoneView({ r }: { r: PhoneReport }) {
  return (
    <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm font-semibold text-we-text">{r.international || r.input}</div>
        <Flag ok={r.valid} label={r.valid ? 'Valid' : 'Invalid'} />
      </div>
      <div className="mt-2 space-y-0.5">
        <Row label="Country" value={r.countryName ? `${flag(r.country)} ${r.countryName}` : r.country} />
        <Row label="Calling code" value={r.callingCode} />
        <Row label="Line type" value={r.type} />
        <Row label="National" value={r.national} />
      </div>
      <div className="mt-2 text-[9px] text-we-muted">Metadata from the number itself — no subscriber/owner lookup.</div>
    </div>
  )
}

function CompanyView({ r }: { r: CompanyReport }) {
  return (
    <>
      {r.top && (
        <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
          <div className="flex items-center gap-2.5">
            {r.top.logo && <img src={r.top.logo} alt="" className="h-9 w-9 rounded bg-white/90 p-0.5" />}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-we-text">{r.top.name}</div>
              {r.top.domain && (
                <a href={`https://${r.top.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-we-accent hover:underline">
                  {r.top.domain} <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {r.wikipedia && (
        <Section icon={<Building2 size={13} />} title="Overview (Wikipedia)">
          <div className="flex gap-2">
            {r.wikipedia.thumbnail && <img src={r.wikipedia.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />}
            <div className="min-w-0">
              <div className="text-[11px] leading-snug text-we-muted">{r.wikipedia.extract.slice(0, 260)}</div>
              {r.wikipedia.url && (
                <a href={r.wikipedia.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-we-accent hover:underline">
                  Read more <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        </Section>
      )}

      {r.suggestions.length > 1 && (
        <Section icon={<Search size={13} />} title="Other matches">
          {r.suggestions.slice(0, 6).map((s) => (
            <div key={s.name + s.domain} className="flex items-center justify-between py-0.5 text-[11px]">
              <span className="truncate text-we-text">{s.name}</span>
              {s.domain && <span className="shrink-0 font-mono text-[10px] text-we-muted">{s.domain}</span>}
            </div>
          ))}
        </Section>
      )}
    </>
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
function RecordRow({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null
  return (
    <div className="flex items-start justify-between gap-2 text-[11px]">
      <span className="text-we-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right font-mono text-[10px] text-we-text" title={values.join(', ')}>
        {values.slice(0, 2).join(', ')}
        {values.length > 2 ? ` +${values.length - 2}` : ''}
      </span>
    </div>
  )
}
function Flag({ label, danger, ok }: { label: string; danger?: boolean; ok?: boolean }) {
  return (
    <span
      className={cx(
        'flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold',
        danger ? 'bg-we-danger/20 text-we-danger' : ok ? 'bg-we-good/15 text-we-good' : 'bg-we-panel text-we-muted',
      )}
    >
      {ok && <ShieldCheck size={9} />}
      {danger && <ShieldAlert size={9} />}
      {label}
    </span>
  )
}
