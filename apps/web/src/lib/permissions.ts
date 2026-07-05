import type { Role } from '../types'

// Capability → what it gates. The role matrix below reflects the BRD's user roles
// (Administrator / Analyst / Operator / Viewer / API User) mapped to WorldEye's
// module capabilities.
export const PERMISSIONS: { id: string; label: string }[] = [
  { id: 'view_map', label: 'View map & layers' },
  { id: 'track_assets', label: 'Track assets (air/sea/rail/fleet)' },
  { id: 'run_osint', label: 'Run OSINT / cyber lookups' },
  { id: 'manage_alerts', label: 'Create & manage alerts' },
  { id: 'generate_reports', label: 'Generate & schedule reports' },
  { id: 'view_audit', label: 'View audit logs' },
  { id: 'manage_users', label: 'Manage users & roles' },
  { id: 'manage_api_keys', label: 'Manage API keys' },
  { id: 'manage_billing', label: 'Manage billing & orgs' },
  { id: 'api_access', label: 'Programmatic API access' },
]

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Administrator: PERMISSIONS.map((p) => p.id),
  Analyst: ['view_map', 'track_assets', 'run_osint', 'manage_alerts', 'generate_reports', 'view_audit'],
  Operator: ['view_map', 'track_assets', 'manage_alerts', 'generate_reports'],
  Viewer: ['view_map', 'track_assets'],
  'API User': ['api_access'],
}

export const ROLES: Role[] = ['Administrator', 'Analyst', 'Operator', 'Viewer', 'API User']

export function roleCan(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
