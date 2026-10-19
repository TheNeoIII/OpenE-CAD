import { create } from 'zustand'
import { backend } from '@/backend'
import { ProjectConflictError } from '@/backend/errors'
import type { CadDocument, CadViewportState } from '@/types/cad'
import type { DataViewId } from '@/types/data'
import type { NewProjectInput, Project, ProjectTemplate } from '@/types/project'
import { normalizeProjectEditor } from '@/utils/projectEditor'
import { useDocumentStore } from './documentStore'
import { useHistoryStore } from './historyStore'
import { useSelectionStore } from './selectionStore'
import { toast, useUiStore, type DocSection, type NavigatorTab, type Workspace } from './uiStore'
import { useViewportStore } from './viewportStore'

type HistoryEntry = ReturnType<typeof useHistoryStore.getState>['past'][number]

/** Parked state of an open project that is not in the foreground. */
export interface ProjectSession {
  project: Project
  document: CadDocument
  activePageId: string | null
  dirty: boolean
  lastSavedAt: string | null
  past: HistoryEntry[]
  future: HistoryEntry[]
  view?: SessionView
}

/** Per-project view state so each open project keeps its own tab, zoom and panel selection. */
interface SessionView {
  workspace: Workspace
  navigatorTab: NavigatorTab
  dataView: DataViewId
  docSection: DocSection
  cabinetId: string | null
  byPage: Record<string, CadViewportState>
  last: CadViewportState | null
}

interface ProjectState {
  projects: Project[]
  templates: ProjectTemplate[]
  current: Project | null
  /** Ids of all open projects in tab order (includes `current`). */
  openIds: string[]
  /** Parked sessions of open background projects, keyed by project id. */
  sessions: Record<string, ProjectSession>
  listLoading: boolean
  opening: string | null
  dirty: boolean
  saving: boolean
  lastSavedAt: string | null
  loadProjects: () => Promise<void>
  openProject: (id: string) => Promise<void>
  switchTo: (id: string) => void
  closeProject: (id?: string) => void
  requestClose: (id?: string) => void
  save: () => Promise<void>
  create: (input: NewProjectInput) => Promise<void>
  duplicate: (id: string, name: string) => Promise<void>
  archive: (id: string, archived: boolean) => Promise<void>
  /** Soft delete into the trash. */
  trash: (id: string) => Promise<void>
  /** Admin only: trash → active. */
  restore: (id: string) => Promise<void>
  /** Admin only: irreversible removal from the trash. */
  purge: (id: string) => Promise<void>
  /** Discards local changes of the current project and reloads the server state. */
  reloadCurrent: () => Promise<void>
  updateCurrent: (patch: Partial<Project>) => void
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>
  isDirty: (id: string) => boolean
  setDirty: (dirty: boolean) => void
}

export const useProjectStore = create<ProjectState>((set, get) => {
  /** Captures the foreground project into a parked session. */
  const park = (): Record<string, ProjectSession> => {
    const { current, sessions, dirty, lastSavedAt } = get()
    const { document, activePageId } = useDocumentStore.getState()
    if (!current || !document) return sessions
    const { past, future } = useHistoryStore.getState()
    const ui = useUiStore.getState()
    const vp = useViewportStore.getState()
    const view: SessionView = {
      workspace: ui.workspace,
      navigatorTab: ui.navigatorTab,
      dataView: ui.dataView,
      docSection: ui.docSection,
      cabinetId: ui.cabinetId,
      byPage: vp.byPage,
      last: vp.last,
    }
    return { ...sessions, [current.id]: { project: current, document, activePageId, dirty, lastSavedAt, past, future, view } }
  }

  /** Brings a parked session to the foreground. */
  const restore = (s: ProjectSession, sessions: Record<string, ProjectSession>) => {
    const rest = { ...sessions }
    delete rest[s.project.id]
    useSelectionStore.getState().clear()
    useDocumentStore.getState().load(s.document)
    if (s.activePageId && s.document.pages.some((p) => p.id === s.activePageId)) useDocumentStore.getState().setActivePage(s.activePageId)
    useHistoryStore.setState({ past: s.past, future: s.future })
    useViewportStore.setState({ byPage: s.view?.byPage ?? {}, last: s.view?.last ?? null })
    set({ current: s.project, dirty: s.dirty, lastSavedAt: s.lastSavedAt, sessions: rest })
    const v = s.view
    const cabinetId = v?.cabinetId && s.document.cabinets.some((c) => c.id === v.cabinetId) ? v.cabinetId : (s.document.cabinets[0]?.id ?? null)
    useUiStore.getState().set({
      cabinetId,
      cabinetSelection: null,
      projectFocusId: s.project.id,
      pageSelection: [],
      contextMenu: null,
      workspace: v && v.workspace !== 'project' ? v.workspace : 'schematic',
      ...(v ? { navigatorTab: v.navigatorTab, dataView: v.dataView, docSection: v.docSection } : { navigatorTab: 'pages', docSection: 'overview' }),
    })
  }

  const clearForeground = () => {
    useDocumentStore.getState().load(null)
    useSelectionStore.getState().clear()
    set({ current: null, dirty: false, lastSavedAt: null })
  }

  return {
    projects: [],
    templates: [],
    current: null,
    openIds: [],
    sessions: {},
    listLoading: false,
    opening: null,
    dirty: false,
    saving: false,
    lastSavedAt: null,

    loadProjects: async () => {
      set({ listLoading: true })
      try {
        const [list, templates] = await Promise.all([backend.listProjects(), backend.listTemplates()])
        const projects = list.map(normalizeProjectEditor)
        set({ projects, templates })
        if (!useUiStore.getState().projectFocusId && projects[0]) useUiStore.getState().set({ projectFocusId: projects[0].id })
      } finally {
        set({ listLoading: false })
      }
    },

    openProject: async (id) => {
      if (get().openIds.includes(id)) return get().switchTo(id)
      set({ opening: id })
      try {
        const opened = await backend.openProject(id)
        const project = normalizeProjectEditor(opened.project)
        const document = opened.document
        const sessions = park()
        restore({ project, document, activePageId: null, dirty: false, lastSavedAt: project.updatedAt, past: [], future: [] }, sessions)
        set({ opening: null, openIds: [...get().openIds, id] })
        useUiStore.getState().setWorkspace('schematic')
        toast(`Projekt „${project.name}“ geöffnet`)
      } catch (e) {
        set({ opening: null })
        toast((e as Error).message, 'error')
      }
    },

    switchTo: (id) => {
      const { current, sessions } = get()
      if (current?.id === id) {
        if (useUiStore.getState().workspace === 'project') useUiStore.getState().setWorkspace('schematic')
        return
      }
      const target = sessions[id]
      if (!target) return
      restore(target, park())
      if (useUiStore.getState().workspace === 'project') useUiStore.getState().setWorkspace('schematic')
    },

    closeProject: (id) => {
      const { current, openIds, sessions } = get()
      const closeId = id ?? current?.id
      if (!closeId) return
      const remaining = openIds.filter((x) => x !== closeId)
      if (closeId !== current?.id) {
        const rest = { ...sessions }
        delete rest[closeId]
        set({ openIds: remaining, sessions: rest })
        return
      }
      const idx = openIds.indexOf(closeId)
      const nextId = remaining[Math.min(idx, remaining.length - 1)]
      set({ openIds: remaining })
      if (nextId && sessions[nextId]) {
        restore(sessions[nextId], sessions)
      } else {
        clearForeground()
        useUiStore.getState().setWorkspace('project')
      }
    },

    requestClose: (id) => {
      const closeId = id ?? get().current?.id
      if (!closeId) return
      const close = () => get().closeProject(closeId)
      if (!get().isDirty(closeId)) return close()
      const name = get().current?.id === closeId ? get().current!.name : get().sessions[closeId]?.project.name
      useUiStore.getState().openDialog({
        type: 'confirm',
        title: 'Ungespeicherte Änderungen',
        message: `„${name ?? 'Projekt'}“ enthält ungespeicherte Änderungen. Trotzdem schließen?`,
        confirmLabel: 'Verwerfen und schließen',
        danger: true,
        onConfirm: close,
      })
    },

    save: async () => {
      const { current } = get()
      const doc = useDocumentStore.getState().document
      if (!current || !doc || get().saving) return
      set({ saving: true })
      try {
        const { savedAt, stateRevision } = await backend.saveProject(current, doc, current.stateRevision ?? 0)
        const projects = (await backend.listProjects()).map(normalizeProjectEditor)
        const fresh = projects.find((p) => p.id === current.id)
        set({ dirty: false, lastSavedAt: savedAt, projects, current: fresh ? { ...fresh, stateRevision } : { ...current, stateRevision, updatedAt: savedAt } })
        toast('Projekt gespeichert', 'success')
      } catch (e) {
        if (e instanceof ProjectConflictError) {
          // Never overwrite automatically; local changes stay in the editor until the user decides.
          useUiStore.getState().openDialog({
            type: 'confirm',
            title: 'Speicherkonflikt',
            message: `„${current.name}“ wurde zwischenzeitlich von einem anderen Benutzer gespeichert (Serverstand ${e.currentRevision ?? 'unbekannt'}, geladen ${current.stateRevision ?? 0}). Ihre Änderungen wurden nicht gespeichert. Sie können den Serverstand neu laden – Ihre lokalen Änderungen gehen dabei verloren – oder abbrechen und weiterarbeiten, z. B. um Inhalte zu sichern.`,
            confirmLabel: 'Serverstand laden (lokale Änderungen verwerfen)',
            danger: true,
            onConfirm: () => void get().reloadCurrent(),
          })
        } else {
          toast((e as Error).message, 'error')
        }
      } finally {
        set({ saving: false })
      }
    },

    reloadCurrent: async () => {
      const { current } = get()
      if (!current) return
      const id = current.id
      set({ dirty: false })
      get().closeProject(id)
      await get().openProject(id)
      await get().loadProjects()
    },

    create: async (input) => {
      const project = await backend.createProject(input)
      await get().loadProjects()
      await get().openProject(project.id)
    },

    duplicate: async (id, name) => {
      const copy = await backend.duplicateProject(id, name)
      await get().loadProjects()
      useUiStore.getState().set({ projectFocusId: copy.id })
      toast(`„${name}“ angelegt`, 'success')
    },

    archive: async (id, archived) => {
      try {
        if (archived && get().openIds.includes(id)) get().closeProject(id)
        await backend.archiveProject(id, archived)
        await get().loadProjects()
        toast(archived ? 'Projekt archiviert' : 'Projekt reaktiviert')
      } catch (e) {
        toast((e as Error).message, 'error')
      }
    },

    trash: async (id) => {
      try {
        if (get().openIds.includes(id)) get().closeProject(id)
        await backend.trashProject(id)
        await get().loadProjects()
        toast('Projekt in den Papierkorb verschoben')
      } catch (e) {
        toast((e as Error).message, 'error')
      }
    },

    restore: async (id) => {
      try {
        await backend.restoreProject(id)
        await get().loadProjects()
        toast('Projekt wiederhergestellt', 'success')
      } catch (e) {
        toast((e as Error).message, 'error')
      }
    },

    purge: async (id) => {
      try {
        await backend.purgeProject(id)
        await get().loadProjects()
        useUiStore.getState().set({ projectFocusId: get().projects.find((p) => p.status !== 'deleted')?.id ?? null })
        toast('Projekt endgültig gelöscht')
      } catch (e) {
        toast((e as Error).message, 'error')
      }
    },

    updateCurrent: (patch) => {
      const { current } = get()
      if (!current) return
      set({ current: { ...current, ...patch }, dirty: true })
    },

    updateProject: async (id, patch) => {
      const { current, sessions, projects } = get()
      if (current?.id === id) return get().updateCurrent(patch)
      const s = sessions[id]
      if (s) {
        set({ sessions: { ...sessions, [id]: { ...s, project: { ...s.project, ...patch }, dirty: true } } })
        return
      }
      const base = projects.find((p) => p.id === id)
      if (!base) return
      await backend.updateProject({ ...base, ...patch })
      await get().loadProjects()
    },

    isDirty: (id) => (get().current?.id === id ? get().dirty : !!get().sessions[id]?.dirty),

    setDirty: (dirty) => {
      if (get().dirty !== dirty) set({ dirty })
    },
  }
})

/** Name of an open project (foreground or parked). */
export function openProjectName(id: string): string {
  const s = useProjectStore.getState()
  return s.current?.id === id ? s.current.name : (s.sessions[id]?.project.name ?? s.projects.find((p) => p.id === id)?.name ?? id)
}
