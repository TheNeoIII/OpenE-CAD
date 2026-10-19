import type { CadDocument, CadObject, CadPage } from '@/types/cad'
import type { DataTable, DataViewId } from '@/types/data'
import type { Article } from '@/types/device'
import type { NewProjectInput, Project, ProjectTemplate, ValidationResult } from '@/types/project'
import type { AccountBackend, AccountSecurity, AuthSession, LoginResult } from './auth'
import type { ExportOptions, OpenEcadBackend, OpenedProject } from './OpenEcadBackend'

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly retryAfterSeconds?: number) {
    super(message)
  }
}

const id = encodeURIComponent

export class HttpOpenEcadBackend implements OpenEcadBackend {
  readonly kind = 'http' as const
  readonly label = 'HTTP / Rust'
  readonly capabilities = { nativeFilesystem: false, serverPersistence: true, offlinePersistence: false, authentication: true, collaboration: false }
  private csrfToken: string | null = null
  private sessionRequest?: Promise<AuthSession>
  private base: string
  readonly account: AccountBackend

  constructor(base = '/api') {
    // A same-origin path keeps cookies and CSRF tokens off third-party origins.
    if (!base.startsWith('/') || base.startsWith('//') || /[\\?#]/.test(base)) throw new Error('API-Basis muss ein Same-Origin-Pfad sein, z. B. /api.')
    this.base = base.replace(/\/+$/, '')
    this.account = {
      session: () => this.session(),
      login: async (identifier, password) => this.acceptLogin(await this.request<LoginResult>('/auth/login', 'POST', { identifier, password }, false)),
      verifySecondFactor: async (method, code) => this.acceptLogin(await this.request<LoginResult>(`/auth/${method}/verify`, 'POST', { code }, false)),
      logout: async () => { await this.request<void>('/auth/logout', 'POST'); this.csrfToken = null },
      security: () => this.request<AccountSecurity>('/account/security'),
    }
  }

  private acceptLogin(result: LoginResult) {
    if (result.status === 'authenticated') this.csrfToken = result.session.csrfToken
    return result
  }

  private session(): Promise<AuthSession> {
    if (!this.sessionRequest) {
      this.sessionRequest = this.request<AuthSession>('/auth/session', 'GET', undefined, false)
        .then((session) => { this.csrfToken = session.csrfToken; return session })
        .finally(() => { this.sessionRequest = undefined })
    }
    return this.sessionRequest
  }

  private async request<T>(path: string, method = 'GET', body?: unknown, notifyExpired = true): Promise<T> {
    if (method !== 'GET' && !this.csrfToken) await this.session()
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (method !== 'GET') {
      if (!this.csrfToken) throw new Error('CSRF-Schutz konnte nicht initialisiert werden.')
      headers['X-CSRF-Token'] = this.csrfToken
    }
    let response: Response
    try {
      response = await fetch(`${this.base}${path}`, {
        method, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new Error('Rust-API nicht erreichbar. Verbindung und Serverkonfiguration prüfen.')
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      if (response.status === 401 && notifyExpired) {
        this.csrfToken = null
        window.dispatchEvent(new Event('openecad:session-expired'))
      }
      const retry = Number(response.headers.get('Retry-After'))
      throw new ApiError(response.status, payload?.error?.code ?? 'HTTP_ERROR', payload?.error?.message ?? `Anfrage fehlgeschlagen (${response.status}).`, Number.isFinite(retry) && retry > 0 ? retry : undefined)
    }
    if (response.status === 204) return undefined as T
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Ungültige API-Antwort. /api darf nicht auf den SPA-Fallback zeigen.')
    return response.json() as Promise<T>
  }

  listProjects() { return this.request<Project[]>('/projects') }
  listTemplates() { return this.request<ProjectTemplate[]>('/project-templates') }
  openProject(projectId: string) { return this.request<OpenedProject>(`/projects/${id(projectId)}`) }
  createProject(input: NewProjectInput) { return this.request<Project>('/projects', 'POST', input) }
  updateProject(project: Project) { return this.request<Project>(`/projects/${id(project.id)}`, 'PUT', { project }) }
  duplicateProject(projectId: string, name: string) { return this.request<Project>(`/projects/${id(projectId)}/duplicate`, 'POST', { name }) }
  archiveProject(projectId: string, archived: boolean) { return this.request<Project>(`/projects/${id(projectId)}/archive`, 'POST', { archived }) }
  deleteProject(projectId: string) { return this.request<void>(`/projects/${id(projectId)}`, 'DELETE') }
  saveProject(project: Project, document: CadDocument) { return this.request<{ savedAt: string }>(`/projects/${id(project.id)}/document`, 'PUT', { project, document }) }
  getPage(documentId: string, pageId: string) { return this.request<CadPage>(`/documents/${id(documentId)}/pages/${id(pageId)}`) }
  updateObjects(documentId: string, pageId: string, objects: CadObject[]) { return this.request<void>(`/documents/${id(documentId)}/pages/${id(pageId)}/objects`, 'PUT', { objects }) }
  listArticles(query?: string) { return this.request<Article[]>(`/articles${query ? `?query=${encodeURIComponent(query)}` : ''}`) }
  validateProject(document: CadDocument) { return this.request<ValidationResult[]>(`/documents/${id(document.id)}/validate`, 'POST', { document }) }
  getDataTable(view: DataViewId, document: CadDocument | null) { return this.request<DataTable>('/data-tables', 'POST', { view, document }) }
  exportDocuments(document: CadDocument, options: ExportOptions) { return this.request<{ fileName: string }>('/export', 'POST', { document, options }) }
}
