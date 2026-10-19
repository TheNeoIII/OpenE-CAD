export interface AccountUser {
  id: string
  displayName: string
  roles: string[]
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
