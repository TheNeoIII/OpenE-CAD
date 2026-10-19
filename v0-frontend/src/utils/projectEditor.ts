import type { DirectoryUser } from '@/backend/admin'
import type { Project } from '@/types/project'

export type ProjectEditorSource = { kind: 'none' } | { kind: 'user'; userId: string } | { kind: 'custom'; name: string }

export interface ResolvedProjectEditor {
  kind: ProjectEditorSource['kind']
  label: string
  /** Assigned account is not active (disabled/locked). The assignment is kept. */
  inactive: boolean
  /** Assigned account is not present in the directory (deleted or not visible). */
  unknown: boolean
}

/**
 * Migrates the legacy free-text `author` to the exclusive editor fields.
 * Exactly one of `assignedEditorUserId` / `customEditorName` is set, or neither.
 */
export function normalizeProjectEditor<T extends Project>(project: T): T {
  const { author, ...rest } = project
  const userId = project.assignedEditorUserId?.trim() || null
  const custom = project.customEditorName?.trim() || null
  if (userId) return { ...rest, assignedEditorUserId: userId, customEditorName: null } as T
  if (custom) return { ...rest, assignedEditorUserId: null, customEditorName: custom } as T
  const legacy = author?.trim() || null
  return { ...rest, assignedEditorUserId: null, customEditorName: legacy } as T
}

export function projectEditorSource(project: Pick<Project, 'assignedEditorUserId' | 'customEditorName' | 'author'>): ProjectEditorSource {
  if (project.assignedEditorUserId) return { kind: 'user', userId: project.assignedEditorUserId }
  const custom = project.customEditorName?.trim() || project.author?.trim()
  if (custom) return { kind: 'custom', name: custom }
  return { kind: 'none' }
}

export function editorPatch(source: ProjectEditorSource): Pick<Project, 'assignedEditorUserId' | 'customEditorName'> {
  if (source.kind === 'user') return { assignedEditorUserId: source.userId, customEditorName: null }
  if (source.kind === 'custom' && source.name.trim()) return { assignedEditorUserId: null, customEditorName: source.name.trim() }
  return { assignedEditorUserId: null, customEditorName: null }
}

export function resolveProjectEditor(project: Pick<Project, 'assignedEditorUserId' | 'customEditorName' | 'author'> | null | undefined, directory: readonly DirectoryUser[]): ResolvedProjectEditor {
  if (!project) return { kind: 'none', label: '', inactive: false, unknown: false }
  const source = projectEditorSource(project)
  if (source.kind === 'custom') return { kind: 'custom', label: source.name, inactive: false, unknown: false }
  if (source.kind === 'none') return { kind: 'none', label: '', inactive: false, unknown: false }
  const user = directory.find((u) => u.id === source.userId)
  if (!user) return { kind: 'user', label: 'Unbekannter Benutzer', inactive: false, unknown: true }
  return { kind: 'user', label: user.displayName, inactive: user.status !== 'active', unknown: false }
}
