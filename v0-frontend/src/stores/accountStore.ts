import { create } from 'zustand'
import type { AccountUser } from '@/backend/auth'
import { can, type Permission } from '@/backend/permissions'

interface AccountState {
  /** Server session user, or the development mock identity in the unauthenticated preview. */
  user: AccountUser | null
  setUser: (user: AccountUser | null) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))

export const useCurrentUser = () => useAccountStore((s) => s.user)

/** Presentation-only permission check; the server re-authorizes every mutation. */
export const useCan = (permission: Permission) => useAccountStore((s) => can(s.user, permission))
