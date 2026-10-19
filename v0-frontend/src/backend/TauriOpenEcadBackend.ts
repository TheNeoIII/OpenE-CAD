import { invoke } from '@tauri-apps/api/core'
import type { CadDocument, CadObject, CadPage } from '@/types/cad'
import type { DataTable, DataViewId } from '@/types/data'
import type { Article } from '@/types/device'
import type { NewProjectInput, Project, ProjectTemplate, ValidationResult } from '@/types/project'
import type { ExportOptions, OpenEcadBackend, OpenedProject } from './OpenEcadBackend'

/**
 * Desktop implementation. Every method maps 1:1 to a Rust `#[tauri::command]`.
 * Command names use snake_case to match Rust conventions.
 */
export class TauriOpenEcadBackend implements OpenEcadBackend {
  readonly kind = 'tauri' as const
  readonly label = 'Tauri / Rust (deferred, future offline desktop)'
  readonly capabilities = { nativeFilesystem: true, serverPersistence: false, offlinePersistence: true, authentication: false, collaboration: false }

  listProjects() {
    return invoke<Project[]>('list_projects')
  }
  async listUserDirectory() {
    return []
  }
  listTemplates() {
    return invoke<ProjectTemplate[]>('list_templates')
  }
  openProject(id: string) {
    return invoke<OpenedProject>('open_project', { id })
  }
  createProject(input: NewProjectInput) {
    return invoke<Project>('create_project', { input })
  }
  updateProject(project: Project) {
    return invoke<Project>('update_project', { project })
  }
  duplicateProject(id: string, name: string) {
    return invoke<Project>('duplicate_project', { id, name })
  }
  archiveProject(id: string, archived: boolean) {
    return invoke<Project>('archive_project', { id, archived })
  }
  deleteProject(id: string) {
    return invoke<void>('delete_project', { id })
  }
  saveProject(project: Project, document: CadDocument) {
    return invoke<{ savedAt: string }>('save_project', { project, document })
  }
  getPage(documentId: string, pageId: string) {
    return invoke<CadPage>('get_page', { documentId, pageId })
  }
  updateObjects(documentId: string, pageId: string, objects: CadObject[]) {
    return invoke<void>('update_objects', { documentId, pageId, objects })
  }
  listArticles(query?: string) {
    return invoke<Article[]>('list_articles', { query: query ?? null })
  }
  validateProject(document: CadDocument) {
    return invoke<ValidationResult[]>('validate_project', { documentId: document.id })
  }
  getDataTable(view: DataViewId, document: CadDocument | null) {
    return invoke<DataTable>('get_data_table', { view, documentId: document?.id ?? null })
  }
  exportDocuments(document: CadDocument, options: ExportOptions) {
    return invoke<{ fileName: string }>('export_documents', { documentId: document.id, options })
  }
}
