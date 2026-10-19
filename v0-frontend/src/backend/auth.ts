import type { Permission, Role } from './permissions'

export type AccountStatus = 'active' | 'disabled' | 'locked'

/** Safe projection of a server account. Never contains hashes, secrets or tokens. */
export interface AccountUser {
  id: string
  username: string
  displayName: string
  /** Only present when the UI needs it (own account, admin user list). */
  email?: string
  roles: Role[]
  /** Effective permissions as computed by the server. */
  permissions: Permission[]
  status: AccountStatus
}

export interface AuthSession {
  user: AccountUser | null
  csrfToken: string
  expiresAt: string | null
}

export type LoginResult =
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'second_factor_required'; methods: ('totp' | 'recovery')[] }

export interface AccountSecurity {
  totpEnabled: boolean
  passkeys: { id: string; name: string; createdAt: string }[]
  features: { passwordChange: boolean; totp: boolean; passkeys: boolean; recoveryCodes: boolean }
}

/** Cookie sessions and second-factor challenges are exclusively server-owned. */
export interface AccountBackend {
  session(): Promise<AuthSession>
  login(identifier: string, password: string): Promise<LoginResult>
  verifySecondFactor(method: 'totp' | 'recovery', code: string): Promise<LoginResult>
  logout(): Promise<void>
  security(): Promise<AccountSecurity>
}

/**
 * Development-only identity switch of the mock backend. It is not authentication:
 * it only selects which mock account the UI renders as. Absent in HTTP/production.
 */
export interface DevIdentityControl {
  identities(): AccountUser[]
  current(): AccountUser
  switchTo(userId: string): AccountUser
}
