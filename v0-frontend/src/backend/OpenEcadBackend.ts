import type { CadDocument, CadObject, CadPage } from '@/types/cad'
import type { DataTable, DataViewId } from '@/types/data'
import type { Article } from '@/types/device'
import type { NewProjectInput, Project, ProjectTemplate, ValidationResult } from '@/types/project'

export interface OpenedProject {
  project: Project
  document: CadDocument
}

export interface ExportOptions {
  kind: 'pdf' | 'csv' | 'xlsx' | 'dxf'
  pageIds: string[]
  colorMode: 'color' | 'mono'
  includeReports: boolean
}

/**
 * The only contract the UI talks to. Implemented by MockOpenEcadBackend for
 * development and TauriOpenEcadBackend (invoke) for the desktop runtime.
 */
export interface OpenEcadBackend {
  readonly kind: 'mock' | 'tauri'

  listProjects(): Promise<Project[]>
  listTemplates(): Promise<ProjectTemplate[]>
  openProject(id: string): Promise<OpenedProject>
  createProject(input: NewProjectInput): Promise<Project>
  updateProject(project: Project): Promise<Project>
  duplicateProject(id: string, name: string): Promise<Project>
  archiveProject(id: string, archived: boolean): Promise<Project>
  deleteProject(id: string): Promise<void>
  saveProject(project: Project, document: CadDocument): Promise<{ savedAt: string }>

  getPage(documentId: string, pageId: string): Promise<CadPage>
  updateObjects(documentId: string, pageId: string, objects: CadObject[]): Promise<void>

  listArticles(query?: string): Promise<Article[]>
  validateProject(document: CadDocument): Promise<ValidationResult[]>
  getDataTable(view: DataViewId, document: CadDocument): Promise<DataTable>
  exportDocuments(document: CadDocument, options: ExportOptions): Promise<{ fileName: string }>
}
