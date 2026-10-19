import type { CadDocument, CadObject, CadPage } from '@/types/cad'
import type { DataTable, DataViewId } from '@/types/data'
import type { Article } from '@/types/device'
import type { NewProjectInput, Project, ProjectTemplate, ValidationResult } from '@/types/project'

export interface OpenedProject {
  project: Project
  document: CadDocument
}

export interface SaveResult {
  savedAt: string
  /** New server revision; the client sends it as `expectedRevision` on the next save. */
  stateRevision: number
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
  /** Development mock only: switch between mock identities. Never present in production. */
  readonly dev?: import('./auth').DevIdentityControl
  /** App-level administration. The server re-authorizes every call. */
  readonly admin?: import('./admin').AdminBackend
  /** Minimal directory of accounts for owner badges and editor assignment (any authenticated user). */
  listUserDirectory(): Promise<import('./admin').DirectoryUser[]>

  listProjects(): Promise<Project[]>
  listTemplates(): Promise<ProjectTemplate[]>
  openProject(id: string): Promise<OpenedProject>
  createProject(input: NewProjectInput): Promise<Project>
  updateProject(project: Project): Promise<Project>
  duplicateProject(id: string, name: string): Promise<Project>
  /** active ↔ archived. Allowed for regular users. */
  archiveProject(id: string, archived: boolean): Promise<Project>
  /** Soft delete: moves the project to the trash (`status: 'deleted'`). Allowed for regular users. */
  trashProject(id: string): Promise<Project>
  /** Admin only: restores a trashed project to `active`. */
  restoreProject(id: string): Promise<Project>
  /** Admin only: irreversibly removes a project that is already in the trash. */
  purgeProject(id: string): Promise<void>
  /**
   * Saves with optimistic concurrency. `expectedRevision` is the `stateRevision`
   * the client loaded; the server rejects with HTTP 409 (`ProjectConflictError`)
   * if it already holds a newer one. Never overwrites automatically.
   */
  saveProject(project: Project, document: CadDocument, expectedRevision: number): Promise<SaveResult>

  getPage(documentId: string, pageId: string): Promise<CadPage>
  updateObjects(documentId: string, pageId: string, objects: CadObject[]): Promise<void>

  listArticles(query?: string): Promise<Article[]>
  validateProject(document: CadDocument): Promise<ValidationResult[]>
  /** `articles` is system-wide and loads without a document; all other views are project data. */
  getDataTable(view: DataViewId, document: CadDocument | null): Promise<DataTable>
  exportDocuments(document: CadDocument, options: ExportOptions): Promise<{ fileName: string }>
}
