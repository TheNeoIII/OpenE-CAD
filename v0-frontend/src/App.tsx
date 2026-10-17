import { useEffect } from 'react'
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

export function App() {
  const workspace = useUiStore((s) => s.workspace)
  const hasProject = useProjectStore((s) => !!s.current)
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => applyTheme(theme), [theme])

  useEffect(() => {
    void useProjectStore.getState().loadProjects()
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

  const ws = hasProject ? workspace : 'project'

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app text-fg">
      <TitleBar />
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
