import { useEffect } from 'react'
import { create } from 'zustand'
import type { DirectoryUser } from '@/backend/admin'
import { backend } from '@/backend'
import type { Project } from '@/types/project'
import { resolveProjectEditor } from '@/utils/projectEditor'

interface UserDirectoryState {
  users: DirectoryUser[]
  loaded: boolean
  loading: boolean
  load: (force?: boolean) => Promise<void>
}

/** Display-only account directory. Never used for authorization decisions. */
export const useUserDirectoryStore = create<UserDirectoryState>((set, get) => ({
  users: [],
  loaded: false,
  loading: false,
  load: async (force = false) => {
    if (get().loading || (get().loaded && !force)) return
    set({ loading: true })
    try {
      set({ users: await backend.listUserDirectory(), loaded: true })
    } catch {
      set({ loaded: true })
    } finally {
      set({ loading: false })
    }
  },
}))

export function useUserDirectory() {
  const users = useUserDirectoryStore((s) => s.users)
  useEffect(() => {
    void useUserDirectoryStore.getState().load()
  }, [])
  return users
}

export function useProjectEditor(project: Project | null | undefined) {
  return resolveProjectEditor(project, useUserDirectory())
}

/** Non-reactive label for title blocks and page metadata. */
export function projectEditorLabel(project: Project | null | undefined): string {
  return resolveProjectEditor(project, useUserDirectoryStore.getState().users).label
}
