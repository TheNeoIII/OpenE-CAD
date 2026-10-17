import type { DocPageConfig, DocPageId, Project } from '@/types/project'

export const DOC_PAGE_LABELS: Record<DocPageId, string> = {
  cover: 'Deckblatt',
  generated: 'Inhaltsverzeichnis',
  spec: 'Netzdaten & Verdrahtung',
  cabinetSpec: 'Schrankspezifikation',
  layout: 'Aufbauplan',
  parts: 'Stückliste',
  order: 'Bestellliste',
  terminals: 'Klemmenplan',
  cables: 'Kabelliste',
}

export const DEFAULT_DOC_PAGES: DocPageConfig[] = [
  { id: 'cover', enabled: true },
  { id: 'generated', enabled: true },
  { id: 'spec', enabled: true },
  { id: 'cabinetSpec', enabled: true },
  { id: 'layout', enabled: true },
  { id: 'parts', enabled: true },
  { id: 'order', enabled: true },
  { id: 'terminals', enabled: false },
  { id: 'cables', enabled: false },
]

/** Merges stored config with defaults so newly added page types always appear. */
export function resolveDocPages(project: Pick<Project, 'docPages'> | null | undefined): DocPageConfig[] {
  const stored = project?.docPages ?? []
  const known = stored.filter((p) => p.id in DOC_PAGE_LABELS)
  const missing = DEFAULT_DOC_PAGES.filter((d) => !known.some((k) => k.id === d.id))
  return [...known, ...missing]
}

export interface SpecField {
  key: string
  label: string
  placeholder: string
}

export const NET_SPEC_FIELDS: SpecField[] = [
  { key: 'network', label: 'Netzform', placeholder: 'TN-S' },
  { key: 'voltage', label: 'Nennspannung', placeholder: '3/N/PE AC 400/230 V' },
  { key: 'frequency', label: 'Frequenz', placeholder: '50 Hz' },
  { key: 'ratedCurrent', label: 'Bemessungsstrom', placeholder: '63 A' },
  { key: 'shortCircuit', label: 'Kurzschlussfestigkeit', placeholder: '10 kA' },
  { key: 'controlVoltage', label: 'Steuerspannung', placeholder: '230 V AC / 24 V DC' },
  { key: 'wireMain', label: 'Hauptstromkreis', placeholder: 'H07V-K, schwarz' },
  { key: 'wireN', label: 'Neutralleiter', placeholder: 'H07V-K, hellblau' },
  { key: 'wirePE', label: 'Schutzleiter', placeholder: 'H07V-K, grün-gelb' },
  { key: 'wireControlAC', label: 'Steuerstromkreis AC', placeholder: 'H05V-K, rot' },
  { key: 'wireControlDC', label: 'Steuerstromkreis DC', placeholder: 'H05V-K, dunkelblau' },
]

export const CABINET_SPEC_FIELDS: SpecField[] = [
  { key: 'cabManufacturer', label: 'Hersteller', placeholder: 'Muster GmbH' },
  { key: 'cabType', label: 'Typ / Serie', placeholder: 'Standschrank' },
  { key: 'cabDimensions', label: 'Abmessungen (B × H × T)', placeholder: '800 × 2000 × 400 mm' },
  { key: 'cabMaterial', label: 'Material', placeholder: 'Stahlblech' },
  { key: 'cabColor', label: 'Farbe', placeholder: 'RAL 7035' },
  { key: 'cabIp', label: 'Schutzart', placeholder: 'IP54' },
  { key: 'cabProtectionClass', label: 'Schutzklasse', placeholder: 'I' },
  { key: 'cabAmbient', label: 'Umgebungstemperatur', placeholder: '+5 … +35 °C' },
  { key: 'cabEntry', label: 'Kabeleinführung', placeholder: 'unten, Flanschplatte' },
  { key: 'cabStandard', label: 'Norm', placeholder: 'DIN EN 61439-1/-2' },
]
