import { useUiStore } from '@/stores/uiStore'
import { AboutDialog, ConfirmDialog, PromptDialog, SettingsDialog, ShortcutsDialog } from './AppDialogs'
import { BulkEditDialog, DataExportDialog, DataImportDialog, PdfExportDialog, RevisionDialog } from './OutputDialogs'
import { FunctionGroupsDialog } from './FunctionGroupsDialog'
import { DuplicateProjectDialog, NewProjectDialog, OpenProjectDialog } from './ProjectDialogs'
import { ProjectSettingsDialog } from './ProjectSettingsDialog'
import { ArticlePickerDialog, PagePropertiesDialog, PotentialDialog, SymbolPickerDialog, XrefDialog } from './SchematicDialogs'

export function DialogHost() {
  const d = useUiStore((s) => s.dialog)
  if (!d) return null
  switch (d.type) {
    case 'newProject':
      return <NewProjectDialog />
    case 'openProject':
      return <OpenProjectDialog />
    case 'duplicateProject':
      return <DuplicateProjectDialog projectId={d.projectId} />
    case 'projectSettings':
      return <ProjectSettingsDialog projectId={d.projectId} />
    case 'settings':
      return <SettingsDialog />
    case 'pageProperties':
      return <PagePropertiesDialog pageId={d.pageId} />
    case 'functionGroups':
      return <FunctionGroupsDialog />
    case 'symbolPicker':
      return <SymbolPickerDialog />
    case 'articlePicker':
      return <ArticlePickerDialog deviceId={d.deviceId} />
    case 'pdfExport':
      return <PdfExportDialog mode={d.mode} />
    case 'dataExport':
      return <DataExportDialog />
    case 'dataImport':
      return <DataImportDialog />
    case 'bulkEdit':
      return <BulkEditDialog />
    case 'potential':
      return <PotentialDialog />
    case 'xref':
      return <XrefDialog />
    case 'revision':
      return <RevisionDialog />
    case 'shortcuts':
      return <ShortcutsDialog />
    case 'about':
      return <AboutDialog />
    case 'confirm':
      return <ConfirmDialog {...d} />
    case 'prompt':
      return <PromptDialog {...d} />
  }
}
