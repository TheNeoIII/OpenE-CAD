import { useEffect } from 'react'
import useSWR from 'swr'
import '@/commands/commands'
import { installKeyboard } from '@/commands/keyboard'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { TitleBar, WorkspaceTabs } from '@/components/shell/MenuBar'
import { ContextMenuHost, Toasts } from '@/components/shell/Overlays'
import { ProjectTabs } from '@/components/shell/ProjectTabs'
import { StatusBar } from '@/components/shell/StatusBar'
import { DialogHost } from '@/components/dialogs/DialogHost'
import { useProjectStore } from '@/stores/projectStore'
import { applyTheme, useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { startValidationWatcher } from '@/stores/validationStore'
import { CabinetWorkspace } from '@/workspaces/CabinetWorkspace'
import { DataWorkspace } from '@/workspaces/DataWorkspace'
import { DocumentationWorkspace } from '@/workspaces/DocumentationWorkspace'
import { ProjectWorkspace } from '@/workspaces/ProjectWorkspace'
import { SchematicWorkspace } from '@/workspaces/SchematicWorkspace'

import { AccountBoundary } from '@/components/account/AccountBoundary'

export function App() {
  const theme = useSettingsStore((s) => s.theme)
  useEffect(() => applyTheme(theme), [theme])
  return <AccountBoundary><EditorApp /></AccountBoundary>
}

function EditorApp() {
  const workspace = useUiStore((s) => s.workspace)
  const hasProject = useProjectStore((s) => !!s.current)
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => applyTheme(theme), [theme])

  const { error: projectError, mutate: reloadProjects } = useSWR('project-list', () => useProjectStore.getState().loadProjects(), { shouldRetryOnError: false, revalidateOnFocus: false })

  useEffect(() => {
    const offKeys = installKeyboard()
    const offValidation = startValidationWatcher()
    const onUnload = (e: BeforeUnloadEvent) => {
      if (useProjectStore.getState().dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      offKeys()
      offValidation()
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  const ws = hasProject || workspace === 'data' ? workspace : 'project'

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app text-fg">
      <TitleBar />
      {projectError && <div role="alert" className="flex items-center gap-3 bg-panel px-3 py-2 text-xs text-error">{projectError.message}<button type="button" className="underline" onClick={() => void reloadProjects()}>Erneut laden</button></div>}
      <ProjectTabs />
      <WorkspaceTabs />
      <div className="flex min-h-0 flex-1">
        {ws === 'project' && <ProjectWorkspace />}
        {ws === 'schematic' && <SchematicWorkspace />}
        {ws === 'cabinet' && <CabinetWorkspace />}
        {ws === 'data' && <DataWorkspace />}
        {ws === 'documentation' && <DocumentationWorkspace />}
      </div>
      <StatusBar />
      <DialogHost />
      <CommandPalette />
      <ContextMenuHost />
      <Toasts />
    </div>
  )
}
