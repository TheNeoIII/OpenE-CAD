export interface Revision {
  id: string
  index: string
  date: string
  author: string
  description: string
}

export interface ProjectEdit {
  at: string
  user: string
  text: string
}

export interface ProjectStats {
  pages: number
  devices: number
  terminals: number
  errors: number
  warnings: number
}

export interface Project {
  id: string
  name: string
  number: string
  customer: string
  location: string
  description: string
  author: string
  revision: string
  standard: string
  template: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  stats: ProjectStats
  recentEdits: ProjectEdit[]
  revisions: Revision[]
  /** Company that creates the documentation. */
  creator?: Party
  /** Client / Auftraggeber. */
  client?: Party
  /** Technical specification values keyed by field key (see utils/docPages). */
  spec?: Record<string, string>
  /** Standard order and enabled state of generated documentation pages. */
  docPages?: DocPageConfig[]
}

export interface Party {
  name: string
  street: string
  city: string
  phone: string
  email: string
  contact: string
  /** Image as data URL. */
  logo?: string
}

export type DocPageId = 'cover' | 'generated' | 'spec' | 'cabinetSpec' | 'layout' | 'parts' | 'order' | 'terminals' | 'cables'

export interface DocPageConfig {
  id: DocPageId
  enabled: boolean
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  pages: number
}

export interface NewProjectInput {
  name: string
  number: string
  customer: string
  location: string
  templateId: string
}

export type Severity = 'error' | 'warning' | 'info'

export type ValidationCategory = 'Stromlaufplan' | 'Artikel' | 'Aufbau' | 'Potential'

export interface ValidationTarget {
  kind: 'symbol' | 'wire' | 'device' | 'page' | 'cabinetRow'
  id: string
  pageId?: string
  cabinetId?: string
}

export interface ValidationResult {
  id: string
  severity: Severity
  code: string
  category: ValidationCategory
  message: string
  detail: string
  target: ValidationTarget
}
