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

export interface BackendCapabilities {
  nativeFilesystem: boolean
  serverPersistence: boolean
  offlinePersistence: boolean
  authentication: boolean
  collaboration: boolean
}

/** The only frontend boundary: HTTP/Rust in production, mock CAD data in development. */
export interface OpenEcadBackend {
  readonly kind: 'mock' | 'http' | 'tauri'
  readonly label: string
  readonly capabilities: BackendCapabilities
  readonly account?: import('./auth').AccountBackend

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
  /** `articles` is system-wide and loads without a document; all other views are project data. */
  getDataTable(view: DataViewId, document: CadDocument | null): Promise<DataTable>
  exportDocuments(document: CadDocument, options: ExportOptions): Promise<{ fileName: string }>
}
