import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AdminUser, ApiKey, AuditEntry, Organization, Role } from '../types'

const USERS_KEY = 'we-admin-users'
const KEYS_KEY = 'we-admin-apikeys'
const ORGS_KEY = 'we-admin-orgs'
const AUDIT_MAX = 200

export function newAdminId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** Generate a demo API token; returns the full token (shown once) + display parts. */
export function generateToken(): { token: string; prefix: string; last4: string } {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const token = `we_${hex}`
  return { token, prefix: token.slice(0, 11), last4: token.slice(-4) }
}

const now = Date.now()
const DEFAULT_USERS: AdminUser[] = [
  { id: 'u1', name: 'Ava Chen', email: 'ava@worldeye.local', role: 'Administrator', active: true, lastActive: now - 5 * 60_000 },
  { id: 'u2', name: 'Marco Silva', email: 'marco@worldeye.local', role: 'Analyst', active: true, lastActive: now - 40 * 60_000 },
  { id: 'u3', name: 'Priya Nair', email: 'priya@worldeye.local', role: 'Operator', active: true, lastActive: now - 3 * 3600_000 },
  { id: 'u4', name: 'Sam Lee', email: 'sam@worldeye.local', role: 'Viewer', active: false, lastActive: now - 5 * 86400_000 },
]
const DEFAULT_KEYS: ApiKey[] = [
  { id: 'k1', name: 'Production ingest', prefix: 'we_9f2a41c8', last4: 'e7b0', scopes: ['api_access'], createdAt: now - 30 * 86400_000, lastUsed: now - 2 * 3600_000, revoked: false },
]
const DEFAULT_ORGS: Organization[] = [
  { id: 'o1', name: 'WorldEye HQ', plan: 'Enterprise', members: 4, createdAt: now - 200 * 86400_000 },
  { id: 'o2', name: 'Coastal Logistics', plan: 'Team', members: 2, createdAt: now - 60 * 86400_000 },
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    /* ignore */
  }
  return fallback
}
export function persistAdmin(users: AdminUser[], keys: ApiKey[], orgs: Organization[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys))
    localStorage.setItem(ORGS_KEY, JSON.stringify(orgs))
  } catch {
    /* ignore */
  }
}

interface AdminState {
  currentUser: string
  users: AdminUser[]
  apiKeys: ApiKey[]
  orgs: Organization[]
  audit: AuditEntry[]
}

const initialState: AdminState = {
  currentUser: 'ava@worldeye.local',
  users: load(USERS_KEY, DEFAULT_USERS),
  apiKeys: load(KEYS_KEY, DEFAULT_KEYS),
  orgs: load(ORGS_KEY, DEFAULT_ORGS),
  audit: [
    { id: 'a0', time: now - 6 * 60_000, actor: 'ava@worldeye.local', action: 'Signed in', target: null, severity: 'info' },
  ],
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    addUser(state, action: PayloadAction<AdminUser>) {
      state.users.unshift(action.payload)
    },
    removeUser(state, action: PayloadAction<string>) {
      state.users = state.users.filter((u) => u.id !== action.payload)
    },
    setUserRole(state, action: PayloadAction<{ id: string; role: Role }>) {
      const u = state.users.find((x) => x.id === action.payload.id)
      if (u) u.role = action.payload.role
    },
    toggleUserActive(state, action: PayloadAction<string>) {
      const u = state.users.find((x) => x.id === action.payload)
      if (u) u.active = !u.active
    },
    addApiKey(state, action: PayloadAction<ApiKey>) {
      state.apiKeys.unshift(action.payload)
    },
    revokeApiKey(state, action: PayloadAction<string>) {
      const k = state.apiKeys.find((x) => x.id === action.payload)
      if (k) k.revoked = true
    },
    removeApiKey(state, action: PayloadAction<string>) {
      state.apiKeys = state.apiKeys.filter((k) => k.id !== action.payload)
    },
    addOrg(state, action: PayloadAction<Organization>) {
      state.orgs.unshift(action.payload)
    },
    removeOrg(state, action: PayloadAction<string>) {
      state.orgs = state.orgs.filter((o) => o.id !== action.payload)
    },
    logAudit(state, action: PayloadAction<AuditEntry>) {
      state.audit.unshift(action.payload)
      if (state.audit.length > AUDIT_MAX) state.audit.length = AUDIT_MAX
    },
    clearAudit(state) {
      state.audit = []
    },
  },
})

export const {
  addUser,
  removeUser,
  setUserRole,
  toggleUserActive,
  addApiKey,
  revokeApiKey,
  removeApiKey,
  addOrg,
  removeOrg,
  logAudit,
  clearAudit,
} = adminSlice.actions
export default adminSlice.reducer
