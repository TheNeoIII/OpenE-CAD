/**
 * Central role/permission vocabulary. The UI uses these only for presentation
 * (hiding/disabling controls). Every mutation is authorized by the Rust server;
 * hidden buttons are never a security mechanism.
 */
export const PERMISSIONS = [
  'project.create',
  'project.edit',
  'project.archive',
  'project.delete',
  'symbol.create',
  'symbol.editOwn',
  'symbol.editAny',
  'symbol.editSystem',
  'article.read',
  'article.manage',
  'library.manageSystem',
  'user.manage',
  'audit.read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLES = ['admin', 'user'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = { admin: 'Administrator', user: 'Benutzer' }

/** Default grants. The server owns the effective list and returns it with the session. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  user: ['project.create', 'project.edit', 'project.archive', 'symbol.create', 'symbol.editOwn', 'article.read'],
}

export function permissionsForRoles(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))]
}

interface PermissionSubject {
  roles: readonly string[]
  permissions: readonly string[]
  status?: string
}

/** Presentation check only — never authorization. Inactive accounts can do nothing. */
export function can(user: PermissionSubject | null | undefined, permission: Permission): boolean {
  if (!user || (user.status && user.status !== 'active')) return false
  return user.permissions.includes(permission)
}

export function hasRole(user: PermissionSubject | null | undefined, role: Role): boolean {
  return !!user && user.roles.includes(role)
}

export function canAdminister(user: PermissionSubject | null | undefined): boolean {
  return can(user, 'user.manage') || can(user, 'audit.read') || can(user, 'library.manageSystem')
}
