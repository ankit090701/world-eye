import type { Middleware } from '@reduxjs/toolkit'
import { logAudit, newAdminId } from './adminSlice'
import type { AuditEntry } from '../types'

// Records meaningful user actions into the Admin audit log — a genuine audit trail
// captured from the live Redux action stream (not seeded).
type Entry = { action: string; target?: string | null; severity?: 'info' | 'warning' }
const LOGGERS: Record<string, (a: any) => Entry | null> = {
  'ui/setActivePanel': (a) => (a.payload ? { action: 'Opened panel', target: a.payload } : null),
  'alerts/addRule': (a) => ({ action: 'Created alert rule', target: a.payload?.name }),
  'alerts/deleteRule': () => ({ action: 'Deleted alert rule' }),
  'reports/addSchedule': (a) => ({ action: 'Scheduled report', target: a.payload?.name }),
  'reports/addRecent': (a) => ({ action: 'Generated report', target: a.payload?.title }),
  'cyber/lookupOk': (a) => ({ action: 'Cyber lookup', target: a.payload?.query }),
  'domain/lookupOk': (a) => ({ action: 'Domain lookup', target: a.payload?.domain }),
  'osint/lookupOk': (a) => ({ action: 'OSINT lookup', target: `${a.payload?.kind}: ${a.payload?.query}` }),
  'admin/addUser': (a) => ({ action: 'Created user', target: a.payload?.email, severity: 'warning' }),
  'admin/removeUser': () => ({ action: 'Removed user', severity: 'warning' }),
  'admin/setUserRole': (a) => ({ action: 'Changed user role', target: a.payload?.role, severity: 'warning' }),
  'admin/addApiKey': (a) => ({ action: 'Generated API key', target: a.payload?.name, severity: 'warning' }),
  'admin/revokeApiKey': () => ({ action: 'Revoked API key', severity: 'warning' }),
  'admin/addOrg': (a) => ({ action: 'Created organization', target: a.payload?.name, severity: 'warning' }),
}

export const auditMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action)
  const logger = LOGGERS[action?.type]
  if (logger) {
    const e = logger(action)
    if (e) {
      const entry: AuditEntry = {
        id: newAdminId(),
        time: Date.now(),
        actor: store.getState().admin.currentUser,
        action: e.action,
        target: e.target ?? null,
        severity: e.severity ?? 'info',
      }
      store.dispatch(logAudit(entry))
    }
  }
  return result
}
