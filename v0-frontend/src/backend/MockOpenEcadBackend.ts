import type { CadDocument, CadObject } from '@/types/cad'
import type { DataViewId } from '@/types/data'
import type { NewProjectInput, Project, ProjectTemplate } from '@/types/project'
import { delay, uid } from '@/utils/format'
import { ARTICLES } from './mock/articles'
import { buildDataTable } from './mock/dataTables'
import { buildEmptyDocument, buildSampleDocument } from './mock/sampleDocument'
import { validateDocument } from './mock/validation'
import type { ExportOptions, OpenEcadBackend } from './OpenEcadBackend'

const LATENCY = 120

const TEMPLATES: ProjectTemplate[] = [
  { id: 'tpl-uv', name: 'Unterverteilung Wohngebäude', description: 'Deckblatt, Einspeisung, 3 Stromkreisseiten, Klemmenplan', pages: 5 },
  { id: 'tpl-machine', name: 'Maschinensteuerung IEC', description: 'Einspeisung, Antriebe, Steuerung 24 V, SPS-Übersicht', pages: 8 },
  { id: 'tpl-empty', name: 'Leeres Projekt', description: 'Nur Deckblatt und eine Schaltplanseite', pages: 2 },
]

function stats(doc: CadDocument) {
  const issues = validateDocument(doc)
  return {
    pages: doc.pages.length,
    devices: doc.devices.length,
    terminals: doc.pages.reduce((n, p) => n + p.symbols.filter((s) => s.kind === 'terminal').length, 0),
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
  }
}

function seedProjects(): { projects: Project[]; docs: Map<string, CadDocument> } {
  const docs = new Map<string, CadDocument>()
  const sample = buildSampleDocument('p-linden')
  docs.set('p-linden', sample)
  const base = (id: string, name: string, number: string, customer: string, location: string, updatedAt: string, status: Project['status'] = 'active'): Project => {
    const doc = docs.get(id) ?? buildEmptyDocument(id, 4)
    docs.set(id, doc)
    return {
      id,
      name,
      number,
      customer,
      location,
      description: '',
      author: 'M. Krüger',
      revision: 'B',
      standard: 'IEC 81346 / DIN EN 61082',
      template: 'tpl-uv',
      status,
      createdAt: '2026-03-02T08:10:00.000Z',
      updatedAt,
      stats: stats(doc),
      recentEdits: [],
      revisions: [{ id: uid('rev'), index: 'A', date: '2026-04-11T09:00:00.000Z', author: 'M. Krüger', description: 'Erstausgabe' }],
    }
  }
  const linden = base('p-linden', 'Lindenstraße 12', 'P-2026-014', 'WBG Lindenhof eG', 'Kassel', '2026-10-14T15:42:00.000Z')
  linden.description = 'Unterverteilung Technikraum mit Lüftungssteuerung und Beleuchtung'
  linden.recentEdits = [
    { at: '2026-10-14T15:42:00.000Z', user: 'M. Krüger', text: '-K1 Artikel auf 3RT2016-1AP01 geändert' },
    { at: '2026-10-14T14:05:00.000Z', user: 'M. Krüger', text: 'Seite 2.1 Steuerstromkreis ergänzt' },
    { at: '2026-10-13T16:20:00.000Z', user: 'S. Yilmaz', text: 'Aufbau +UV2 Reihe 2 belegt' },
    { at: '2026-10-12T10:12:00.000Z', user: 'S. Yilmaz', text: 'Klemmleiste -X1 angelegt' },
  ]
  linden.creator = { name: 'Muster Elektrotechnik GmbH', street: 'Industriestraße 3', city: '34117 Kassel', phone: '+49 561 000000', email: 'info@muster-elektro.example', contact: 'M. Krüger' }
  linden.client = { name: 'WBG Lindenhof eG', street: 'Lindenstraße 12', city: '34119 Kassel', phone: '', email: '', contact: 'Hausverwaltung' }
  linden.spec = {
    network: 'TN-S',
    voltage: '3/N/PE AC 400/230 V',
    frequency: '50 Hz',
    ratedCurrent: '63 A',
    shortCircuit: '10 kA',
    controlVoltage: '230 V AC',
    wireMain: 'H07V-K, schwarz',
    wireN: 'H07V-K, hellblau',
    wirePE: 'H07V-K, grün-gelb',
    wireControlAC: 'H05V-K, rot',
    wireControlDC: 'H05V-K, dunkelblau',
    cabManufacturer: 'Hager',
    cabType: 'Wandverteiler univers',
    cabDimensions: '775 × 1390 × 240 mm',
    cabMaterial: 'Stahlblech',
    cabColor: 'RAL 7035',
    cabIp: 'IP44',
    cabProtectionClass: 'I',
    cabAmbient: '+5 … +35 °C',
    cabEntry: 'oben, Flansch FLA4',
    cabStandard: 'DIN EN 61439-1/-3',
  }
  linden.docPages = [
    { id: 'cover', enabled: true },
    { id: 'generated', enabled: true },
    { id: 'spec', enabled: true },
    { id: 'cabinetSpec', enabled: true },
    { id: 'layout', enabled: true },
    { id: 'parts', enabled: true },
    { id: 'order', enabled: true },
    { id: 'terminals', enabled: true },
    { id: 'cables', enabled: true },
  ]
  linden.revisions.push({ id: uid('rev'), index: 'B', date: '2026-09-28T11:30:00.000Z', author: 'M. Krüger', description: 'Lüftung ergänzt, FI getauscht' })
  return {
    docs,
    projects: [
      linden,
      base('p-hafen', 'Hafenkran K3 Retrofit', 'P-2026-009', 'Hafen Logistik GmbH', 'Bremerhaven', '2026-10-09T09:12:00.000Z'),
      base('p-schule', 'Grundschule Am Park', 'P-2026-021', 'Stadt Göttingen', 'Göttingen', '2026-10-02T13:30:00.000Z'),
      base('p-press', 'Pressenlinie PL-4', 'P-2025-118', 'Metallbau Rhein AG', 'Koblenz', '2026-08-21T07:45:00.000Z'),
      base('p-pv', 'PV-Anlage Halle 2', 'P-2025-096', 'Agrar Nord eG', 'Husum', '2026-05-30T15:00:00.000Z', 'archived'),
    ],
  }
}

export class MockOpenEcadBackend implements OpenEcadBackend {
  readonly kind = 'mock' as const
  readonly label = 'Mock-Backend (Development-only)'
  readonly capabilities = { nativeFilesystem: false, serverPersistence: false, offlinePersistence: false, authentication: false, collaboration: false }
  private projects: Project[]
  private docs: Map<string, CadDocument>

  constructor() {
    const seed = seedProjects()
    this.projects = seed.projects
    this.docs = seed.docs
  }

  private find(id: string) {
    const p = this.projects.find((x) => x.id === id)
    if (!p) throw new Error(`Projekt ${id} nicht gefunden`)
    return p
  }

  async listProjects() {
    await delay(LATENCY)
    return structuredClone(this.projects)
  }

  async listTemplates() {
    await delay(LATENCY / 2)
    return structuredClone(TEMPLATES)
  }

  async openProject(id: string) {
    await delay(LATENCY * 2)
    const project = this.find(id)
    const document = this.docs.get(id) ?? buildEmptyDocument(id, 3)
    return { project: structuredClone(project), document: structuredClone(document) }
  }

  async createProject(input: NewProjectInput) {
    await delay(LATENCY)
    const id = uid('p')
    const tpl = TEMPLATES.find((t) => t.id === input.templateId) ?? TEMPLATES[2]
    const doc = buildEmptyDocument(id, tpl.pages)
    this.docs.set(id, doc)
    const now = new Date().toISOString()
    const project: Project = {
      id,
      name: input.name,
      number: input.number,
      customer: input.customer,
      location: input.location,
      description: '',
      author: 'M. Krüger',
      revision: 'A',
      standard: 'IEC 81346 / DIN EN 61082',
      template: tpl.id,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      stats: stats(doc),
      recentEdits: [{ at: now, user: 'M. Krüger', text: `Projekt aus Vorlage „${tpl.name}“ angelegt` }],
      revisions: [{ id: uid('rev'), index: 'A', date: now, author: 'M. Krüger', description: 'Erstausgabe' }],
    }
    this.projects.unshift(project)
    return structuredClone(project)
  }

  async updateProject(project: Project) {
    await delay(LATENCY / 2)
    this.projects = this.projects.map((p) => (p.id === project.id ? structuredClone(project) : p))
    return structuredClone(project)
  }

  async duplicateProject(id: string, name: string) {
    await delay(LATENCY)
    const src = this.find(id)
    const newId = uid('p')
    const doc = structuredClone(this.docs.get(id) ?? buildEmptyDocument(newId, 3))
    doc.id = `doc-${newId}`
    doc.projectId = newId
    this.docs.set(newId, doc)
    const now = new Date().toISOString()
    const copy: Project = { ...structuredClone(src), id: newId, name, status: 'active', createdAt: now, updatedAt: now, recentEdits: [{ at: now, user: 'M. Krüger', text: `Kopie von „${src.name}“` }] }
    this.projects.unshift(copy)
    return structuredClone(copy)
  }

  async archiveProject(id: string, archived: boolean) {
    await delay(LATENCY / 2)
    const p = this.find(id)
    p.status = archived ? 'archived' : 'active'
    return structuredClone(p)
  }

  async deleteProject(id: string) {
    await delay(LATENCY / 2)
    this.projects = this.projects.filter((p) => p.id !== id)
    this.docs.delete(id)
  }

  async saveProject(project: Project, document: CadDocument) {
    await delay(LATENCY * 2)
    const savedAt = new Date().toISOString()
    this.docs.set(project.id, structuredClone(document))
    const next = { ...structuredClone(project), updatedAt: savedAt, stats: stats(document) }
    this.projects = this.projects.map((p) => (p.id === project.id ? next : p))
    return { savedAt }
  }

  async getPage(documentId: string, pageId: string) {
    await delay(LATENCY / 2)
    const doc = [...this.docs.values()].find((d) => d.id === documentId)
    const page = doc?.pages.find((p) => p.id === pageId)
    if (!page) throw new Error(`Seite ${pageId} nicht gefunden`)
    return structuredClone(page)
  }

  async updateObjects(_documentId: string, _pageId: string, _objects: CadObject[]) {
    // Mock: the frontend store is the source of truth until saveProject().
  }

  async listArticles(query?: string) {
    await delay(40)
    const q = query?.trim().toLowerCase()
    if (!q) return structuredClone(ARTICLES)
    return ARTICLES.filter((a) => `${a.manufacturer} ${a.articleNo} ${a.type} ${a.description}`.toLowerCase().includes(q))
  }

  async validateProject(document: CadDocument) {
    await delay(30)
    return validateDocument(document)
  }

  async getDataTable(view: DataViewId, document: CadDocument | null) {
    await delay(60)
    return buildDataTable(view, document)
  }

  async exportDocuments(document: CadDocument, options: ExportOptions) {
    await delay(900)
    const name = this.projects.find((p) => p.id === document.projectId)?.number ?? 'Projekt'
    return { fileName: `${name}_${options.kind === 'pdf' ? 'Dokumentation' : 'Export'}.${options.kind}` }
  }
}
