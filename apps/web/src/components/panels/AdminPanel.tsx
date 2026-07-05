import { useState } from 'react'
import { Shield, Users, KeyRound, ScrollText, Activity, Building2, Plus, Trash2, Copy, Ban, Check } from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import {
  addApiKey,
  addOrg,
  addUser,
  generateToken,
  newAdminId,
  removeApiKey,
  removeOrg,
  removeUser,
  revokeApiKey,
  setUserRole,
  toggleUserActive,
  clearAudit,
} from '../../store/adminSlice'
import { useUsage } from '../../data/usageStore'
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '../../lib/permissions'
import { HBarChart } from '../charts/Charts'
import type { AdminUser, ApiKey, AuditEntry, Organization, Role } from '../../types'
import { cx } from '../../lib/cx'

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'keys', label: 'Keys', icon: KeyRound },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'usage', label: 'Usage', icon: Activity },
  { id: 'orgs', label: 'Orgs', icon: Building2 },
] as const

const ago = (ms: number) => {
  const s = (Date.now() - ms) / 1000
  if (s < 60) return `${Math.round(s)}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function AdminPanel() {
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('users')
  return (
    <PanelShell title="Admin" subtitle="Module 18 · users · keys · audit · usage" icon={<Shield size={16} />} onClose={() => dispatch(setActivePanel(null))}>
      <div className="mb-3 grid grid-cols-5 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={cx('flex flex-col items-center gap-0.5 rounded-md border py-1.5 text-[9px]', tab === id ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted hover:text-we-text')}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'keys' && <KeysTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'usage' && <UsageTab />}
      {tab === 'orgs' && <OrgsTab />}
    </PanelShell>
  )
}

function UsersTab() {
  const dispatch = useAppDispatch()
  const users = useAppSelector((s) => s.admin.users)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('Viewer')

  const add = () => {
    if (!email.trim()) return
    const u: AdminUser = { id: newAdminId(), name: name.trim() || email.split('@')[0], email: email.trim(), role, active: true, lastActive: Date.now() }
    dispatch(addUser(u))
    setName('')
    setEmail('')
  }

  return (
    <div>
      <div className="mb-3 space-y-1.5 rounded-lg border border-we-border bg-we-panel-2/40 p-2.5">
        <div className="flex gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-1/2 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text placeholder:text-we-muted focus:outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@org" className="w-1/2 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text placeholder:text-we-muted focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="flex-1 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text focus:outline-none">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={add} className="flex items-center gap-1 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-1 text-[11px] text-we-text hover:shadow-glow"><Plus size={12} className="text-we-accent" /> Add</button>
        </div>
      </div>

      <SectionTitle>Users ({users.length})</SectionTitle>
      <div className="space-y-1.5">
        {users.map((u) => (
          <div key={u.id} className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cx('h-1.5 w-1.5 rounded-full', u.active ? 'bg-we-good' : 'bg-we-muted')} />
                  <span className="truncate text-[11px] text-we-text">{u.name}</span>
                </div>
                <div className="truncate text-[10px] text-we-muted">{u.email} · {ago(u.lastActive)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <select value={u.role} onChange={(e) => dispatch(setUserRole({ id: u.id, role: e.target.value as Role }))} className="rounded border border-we-border bg-we-panel px-1 py-0.5 text-[9px] text-we-text focus:outline-none">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Switch checked={u.active} onChange={() => dispatch(toggleUserActive(u.id))} />
                <button onClick={() => dispatch(removeUser(u.id))} className="text-we-muted hover:text-we-danger"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Role permissions</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr>
              <th className="py-1 text-left font-normal text-we-muted">Permission</th>
              {ROLES.map((r) => <th key={r} className="px-0.5 py-1 text-center font-normal text-we-muted" title={r}>{r.slice(0, 3)}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.id} className="border-t border-we-border/40">
                <td className="py-1 pr-1 text-we-text" title={p.label}>{p.label.slice(0, 22)}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-0.5 py-1 text-center">
                    {ROLE_PERMISSIONS[r].includes(p.id) ? <Check size={10} className="mx-auto text-we-good" /> : <span className="text-we-muted">·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KeysTab() {
  const dispatch = useAppDispatch()
  const keys = useAppSelector((s) => s.admin.apiKeys)
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)

  const gen = () => {
    const { token, prefix, last4 } = generateToken()
    const key: ApiKey = { id: newAdminId(), name: name.trim() || 'New key', prefix, last4, scopes: ['api_access'], createdAt: Date.now(), lastUsed: null, revoked: false }
    dispatch(addApiKey(key))
    setFresh(token)
    setName('')
  }

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" className="flex-1 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text placeholder:text-we-muted focus:outline-none" />
        <button onClick={gen} className="flex items-center gap-1 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-1 text-[11px] text-we-text hover:shadow-glow"><Plus size={12} className="text-we-accent" /> Generate</button>
      </div>

      {fresh && (
        <div className="mb-3 rounded-lg border border-we-accent/50 bg-we-accent/10 p-2.5">
          <div className="text-[10px] text-we-warn">Copy this token now — it won't be shown again.</div>
          <div className="mt-1 flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-we-panel px-1.5 py-1 font-mono text-[10px] text-we-text">{fresh}</code>
            <button onClick={() => navigator.clipboard?.writeText(fresh)} className="rounded border border-we-border p-1 text-we-muted hover:text-we-text"><Copy size={12} /></button>
          </div>
        </div>
      )}

      <SectionTitle>API keys ({keys.length})</SectionTitle>
      <div className="space-y-1.5">
        {keys.map((k) => (
          <div key={k.id} className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-we-text">
                  {k.name}
                  {k.revoked && <span className="rounded bg-we-danger/20 px-1 text-[8px] text-we-danger">revoked</span>}
                </div>
                <div className="truncate font-mono text-[10px] text-we-muted">{k.prefix}…{k.last4}</div>
                <div className="text-[9px] text-we-muted">created {ago(k.createdAt)} · {k.lastUsed ? `used ${ago(k.lastUsed)}` : 'never used'}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!k.revoked && <button onClick={() => dispatch(revokeApiKey(k.id))} className="text-we-muted hover:text-we-warn" title="Revoke"><Ban size={12} /></button>}
                <button onClick={() => dispatch(removeApiKey(k.id))} className="text-we-muted hover:text-we-danger" title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-we-muted">Keys are managed here; the demo API runs open (no auth). A production deployment validates these server-side.</p>
    </div>
  )
}

function AuditTab() {
  const dispatch = useAppDispatch()
  const audit = useAppSelector((s) => s.admin.audit)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Audit log ({audit.length})</SectionTitle>
        {audit.length > 0 && <button onClick={() => dispatch(clearAudit())} className="text-[10px] text-we-muted hover:text-we-text">clear</button>}
      </div>
      <div className="space-y-1">
        {audit.map((e: AuditEntry) => (
          <div key={e.id} className="flex items-start gap-2 rounded border border-we-border/60 bg-we-panel-2/20 px-2 py-1">
            <span className={cx('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', e.severity === 'warning' ? 'bg-we-warn' : 'bg-we-accent')} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-we-text">{e.action}{e.target ? <span className="text-we-muted"> · {e.target}</span> : null}</div>
              <div className="text-[9px] text-we-muted">{e.actor} · {ago(e.time)}</div>
            </div>
          </div>
        ))}
        {audit.length === 0 && <div className="text-[11px] text-we-muted">No audit entries yet — actions are logged as you use WorldEye.</div>}
      </div>
    </div>
  )
}

function UsageTab() {
  const usage = useUsage()
  const bars = Object.entries(usage.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }))
  const QUOTA = 1_000_000
  const used = 247_800 + usage.total
  const pct = Math.min(100, (used / QUOTA) * 100)
  return (
    <div>
      <SectionTitle>API usage (this session)</SectionTitle>
      <div className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
        <div className="mb-1 text-2xl font-semibold text-we-text">{usage.total}</div>
        <div className="text-[10px] text-we-muted">requests since load · {bars.length} endpoints</div>
        {bars.length > 0 ? <div className="mt-2"><HBarChart data={bars} /></div> : <div className="py-2 text-[10px] text-we-muted">No API calls tracked yet.</div>}
      </div>

      <SectionTitle>Plan &amp; billing</SectionTitle>
      <div className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-we-text">Enterprise</span>
          <span className="text-we-muted">{used.toLocaleString()} / {QUOTA.toLocaleString()} req</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-we-panel">
          <div className="h-full rounded-full bg-we-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-we-muted">
          <span>{pct.toFixed(1)}% of monthly quota</span>
          <span>est. $1,499 / mo</span>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-we-muted">Session usage is live (real API calls). The plan/quota figures are a demo overview — production wires these to metered billing.</p>
    </div>
  )
}

function OrgsTab() {
  const dispatch = useAppDispatch()
  const orgs = useAppSelector((s) => s.admin.orgs)
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('Team')
  const add = () => {
    if (!name.trim()) return
    const o: Organization = { id: newAdminId(), name: name.trim(), plan, members: 1, createdAt: Date.now() }
    dispatch(addOrg(o))
    setName('')
  }
  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" className="flex-1 rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text placeholder:text-we-muted focus:outline-none" />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded border border-we-border bg-we-panel px-2 py-1 text-[11px] text-we-text focus:outline-none">
          {['Free', 'Team', 'Enterprise'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={add} className="flex items-center gap-1 rounded-lg border border-we-accent/60 bg-we-accent/10 px-2 py-1 text-[11px] text-we-text hover:shadow-glow"><Plus size={12} className="text-we-accent" /></button>
      </div>
      <SectionTitle>Organizations ({orgs.length})</SectionTitle>
      <div className="space-y-1.5">
        {orgs.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
            <div className="min-w-0">
              <div className="truncate text-[11px] text-we-text">{o.name}</div>
              <div className="text-[10px] text-we-muted">{o.plan} · {o.members} member{o.members === 1 ? '' : 's'} · since {new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
            <button onClick={() => dispatch(removeOrg(o.id))} className="text-we-muted hover:text-we-danger"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
