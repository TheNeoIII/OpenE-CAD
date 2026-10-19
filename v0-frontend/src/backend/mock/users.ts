import type { AdminUser } from '../admin'
import { permissionsForRoles, type Role } from '../permissions'

const account = (id: string, username: string, displayName: string, email: string, role: Role, extra: Partial<AdminUser> = {}): AdminUser => ({
  id,
  username,
  displayName,
  email,
  roles: [role],
  permissions: permissionsForRoles([role]),
  status: 'active',
  totpEnabled: false,
  passkeyCount: 0,
  lastLoginAt: null,
  mustChangePassword: false,
  createdAt: '2026-01-12T08:00:00.000Z',
  ...extra,
})

/** Development-only fixtures. No passwords, hashes or secrets exist in the mock. */
export function seedUsers(): AdminUser[] {
  return [
    account('u-admin', 'mkrueger', 'M. Krüger', 'm.krueger@example.invalid', 'admin', { totpEnabled: true, passkeyCount: 1, lastLoginAt: '2026-10-19T07:41:00.000Z' }),
    account('u-user', 'syilmaz', 'S. Yilmaz', 's.yilmaz@example.invalid', 'user', { lastLoginAt: '2026-10-18T16:02:00.000Z' }),
    account('u-weber', 'jweber', 'J. Weber', 'j.weber@example.invalid', 'user', { status: 'disabled', lastLoginAt: '2026-06-02T09:15:00.000Z' }),
    account('u-novak', 'anovak', 'A. Novak', 'a.novak@example.invalid', 'user', { status: 'locked', lastLoginAt: '2026-10-17T11:20:00.000Z' }),
  ]
}

export const MOCK_ADMIN_ID = 'u-admin'
export const MOCK_USER_ID = 'u-user'
