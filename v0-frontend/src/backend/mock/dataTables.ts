import type { CadDocument } from '@/types/cad'
import type { DataColumn, DataRow, DataTable, DataViewId } from '@/types/data'
import { seeded } from '@/utils/format'
import { ARTICLES } from './articles'
import { validateDocument } from './validation'

const GENERATED_ROWS = 10_000

const LOCATIONS = ['+UV1', '+UV2', '+UV3', '+HV', '+FELD']
const CATEGORIES = ['Schutzgerät', 'Schütz', 'Relais', 'Befehlsgerät', 'Meldegerät', 'Klemme', 'Motor', 'Leuchte']
const PREFIX: Record<string, string> = { Schutzgerät: 'F', Schütz: 'K', Relais: 'K', Befehlsgerät: 'S', Meldegerät: 'H', Klemme: 'X', Motor: 'M', Leuchte: 'E' }
const CABLE_TYPES = ['NYM-J', 'NYY-J', 'ÖLFLEX 110', 'H07RN-F', 'J-Y(ST)Y']
const CORES = ['3×1,5 mm²', '5×1,5 mm²', '5×2,5 mm²', '7G1 mm²', '2×2×0,8 mm']

const columns: Record<DataViewId, DataColumn[]> = {
  devices: [
    { key: 'bmk', label: 'BMK', width: 90, type: 'text', editable: true, mono: true },
    { key: 'function', label: 'Funktion', width: 220, type: 'text', editable: true },
    { key: 'category', label: 'Kategorie', width: 120, type: 'select', editable: true, options: CATEGORIES },
    { key: 'location', label: 'Einbauort', width: 90, type: 'select', editable: true, options: LOCATIONS, mono: true },
    { key: 'manufacturer', label: 'Hersteller', width: 120, type: 'text', editable: true },
    { key: 'articleNo', label: 'Artikelnummer', width: 170, type: 'text', editable: true, mono: true },
    { key: 'ratedCurrent', label: 'In [A]', width: 70, type: 'number', editable: true, mono: true },
    { key: 'widthTE', label: 'TE', width: 60, type: 'number', editable: true, mono: true },
    { key: 'page', label: 'Seite', width: 70, type: 'text', mono: true },
  ],
  articles: [
    { key: 'manufacturer', label: 'Hersteller', width: 130, type: 'text', editable: true },
    { key: 'articleNo', label: 'Artikelnummer', width: 190, type: 'text', editable: true, mono: true },
    { key: 'type', label: 'Typ', width: 110, type: 'text', editable: true, mono: true },
    { key: 'description', label: 'Bezeichnung', width: 280, type: 'text', editable: true },
    { key: 'category', label: 'Kategorie', width: 120, type: 'select', editable: true, options: CATEGORIES },
    { key: 'widthTE', label: 'TE', width: 60, type: 'number', editable: true, mono: true },
    { key: 'price', label: 'Preis [€]', width: 90, type: 'number', editable: true, mono: true },
  ],
  terminals: [
    { key: 'strip', label: 'Leiste', width: 80, type: 'text', mono: true },
    { key: 'terminal', label: 'Klemme', width: 70, type: 'text', editable: true, mono: true },
    { key: 'type', label: 'Typ', width: 120, type: 'text', editable: true },
    { key: 'internal', label: 'Ziel innen', width: 130, type: 'text', editable: true, mono: true },
    { key: 'external', label: 'Ziel außen', width: 130, type: 'text', editable: true, mono: true },
    { key: 'potential', label: 'Potential', width: 80, type: 'select', editable: true, options: ['L1', 'L2', 'L3', 'N', 'PE', '24V', '0V'], mono: true },
    { key: 'cable', label: 'Kabel', width: 80, type: 'text', editable: true, mono: true },
  ],
  cables: [
    { key: 'bmk', label: 'BMK', width: 80, type: 'text', editable: true, mono: true },
    { key: 'type', label: 'Typ', width: 120, type: 'select', editable: true, options: CABLE_TYPES },
    { key: 'cores', label: 'Adern', width: 120, type: 'select', editable: true, options: CORES },
    { key: 'from', label: 'Von', width: 100, type: 'text', editable: true, mono: true },
    { key: 'to', label: 'Nach', width: 100, type: 'text', editable: true, mono: true },
    { key: 'length', label: 'Länge [m]', width: 90, type: 'number', editable: true, mono: true },
  ],
  plc: [
    { key: 'address', label: 'Adresse', width: 90, type: 'text', editable: true, mono: true },
    { key: 'direction', label: 'E/A', width: 50, type: 'select', editable: true, options: ['E', 'A'], mono: true },
    { key: 'symbol', label: 'Symbol', width: 180, type: 'text', editable: true, mono: true },
    { key: 'deviceBmk', label: 'Betriebsmittel', width: 110, type: 'text', editable: true, mono: true },
    { key: 'comment', label: 'Kommentar', width: 260, type: 'text', editable: true },
  ],
  connections: [
    { key: 'from', label: 'Quelle', width: 120, type: 'text', mono: true },
    { key: 'to', label: 'Ziel', width: 120, type: 'text', mono: true },
    { key: 'potential', label: 'Potential', width: 80, type: 'text', mono: true },
    { key: 'color', label: 'Farbe', width: 80, type: 'select', editable: true, options: ['SW', 'BU', 'RD', 'GNYE', 'GY'] },
    { key: 'crossSection', label: 'Querschnitt', width: 100, type: 'select', editable: true, options: ['0,75 mm²', '1,5 mm²', '2,5 mm²', '4 mm²', '6 mm²'] },
    { key: 'page', label: 'Seite', width: 70, type: 'text', mono: true },
  ],
}

function realRows(view: DataViewId, doc: CadDocument | null): DataRow[] {
  if (view === 'articles') return ARTICLES.map((a) => ({ id: a.id, cells: { manufacturer: a.manufacturer, articleNo: a.articleNo, type: a.type, description: a.description, category: a.category, widthTE: a.widthTE, price: a.price } }))
  if (!doc) return []
  const issues = validateDocument(doc)
  const pageOf = (deviceId: string) => doc.pages.find((p) => p.kind === 'schematic' && p.symbols.some((s) => s.deviceId === deviceId))?.number ?? '—'
  switch (view) {
    case 'devices':
      return doc.devices.map((d) => {
        const own = issues.filter((i) => i.target.id === d.id || doc.pages.some((p) => p.kind === 'schematic' && p.symbols.some((s) => s.id === i.target.id && s.deviceId === d.id)))
        return {
          id: d.id,
          deviceId: d.id,
          issue: own.some((i) => i.severity === 'error') ? 'error' : own.some((i) => i.severity === 'warning') ? 'warning' : undefined,
          cells: { bmk: d.bmk, function: d.function, category: d.category, location: d.location, manufacturer: d.manufacturer, articleNo: d.articleNo, ratedCurrent: d.ratedCurrent, widthTE: d.widthTE, page: pageOf(d.id) },
        }
      })
    case 'terminals':
      return doc.pages.filter((p) => p.kind === 'schematic').flatMap((p) =>
        p.symbols
          .filter((s) => s.kind === 'terminal')
          .map((s) => ({
            id: `t-${s.id}`,
            deviceId: s.deviceId ?? undefined,
            cells: { strip: doc.devices.find((d) => d.id === s.deviceId)?.bmk ?? '-X?', terminal: s.terminalNo ?? '', type: s.terminalNo === 'PE' ? 'UT 2,5-PE' : 'UT 2,5', internal: '-K1', external: '-M1', potential: s.terminalNo === 'PE' ? 'PE' : `L${s.terminalNo}`, cable: '-W1' },
          })),
      )
    case 'cables':
      return doc.cables.map((c) => ({ id: c.id, cells: { bmk: c.bmk, type: c.type, cores: c.cores, from: c.from, to: c.to, length: c.length } }))
    case 'plc':
      return doc.plc.map((io) => ({ id: io.id, cells: { address: io.address, direction: io.direction, symbol: io.symbol, deviceBmk: io.deviceBmk, comment: io.comment } }))
    case 'connections':
      return doc.pages.filter((p) => p.kind === 'schematic').flatMap((p) =>
        p.wires.map((w, i) => ({
          id: `c-${w.id}`,
          cells: { from: `W${i + 1}.a`, to: `W${i + 1}.b`, potential: w.potential ?? '—', color: w.color === 'red' ? 'RD' : w.potential === 'N' ? 'BU' : w.potential === 'PE' ? 'GNYE' : 'SW', crossSection: w.crossSection, page: p.number },
        })),
      )
  }
}

function generatedRows(view: DataViewId): DataRow[] {
  const rnd = seeded(view.length * 7919)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
  const rows: DataRow[] = []
  for (let i = 0; i < GENERATED_ROWS; i++) {
    const n = i + 100
    const id = `g-${view}-${i}`
    switch (view) {
      case 'devices': {
        const cat = pick(CATEGORIES)
        const art = pick(ARTICLES)
        rows.push({ id, cells: { bmk: `-${PREFIX[cat]}${n}`, function: `${cat} Anlage ${Math.floor(i / 40) + 1}.${(i % 40) + 1}`, category: cat, location: pick(LOCATIONS), manufacturer: art.manufacturer, articleNo: art.articleNo, ratedCurrent: art.ratedCurrent, widthTE: art.widthTE, page: `${Math.floor(i / 12) + 10}.${(i % 12) + 1}` } })
        break
      }
      case 'articles': {
        const base = pick(ARTICLES)
        rows.push({ id, cells: { manufacturer: base.manufacturer, articleNo: `${base.articleNo}-V${n}`, type: base.type, description: `${base.description} (Variante ${n})`, category: base.category, widthTE: base.widthTE, price: Math.round(base.price * (0.8 + rnd() * 0.5) * 100) / 100 } })
        break
      }
      case 'terminals':
        rows.push({ id, cells: { strip: `-X${Math.floor(i / 48) + 10}`, terminal: String((i % 48) + 1), type: pick(['UT 2,5', 'UT 4', 'UT 2,5-PE', 'TOPJOB S']), internal: `-K${Math.floor(rnd() * 400) + 1}`, external: `-M${Math.floor(rnd() * 200) + 1}`, potential: pick(['L1', 'L2', 'L3', 'N', 'PE', '24V', '0V']), cable: `-W${Math.floor(i / 5) + 10}` } })
        break
      case 'cables':
        rows.push({ id, cells: { bmk: `-W${n}`, type: pick(CABLE_TYPES), cores: pick(CORES), from: `-X${Math.floor(rnd() * 200) + 1}`, to: `-M${Math.floor(rnd() * 200) + 1}`, length: Math.round(rnd() * 600) / 10 + 1 } })
        break
      case 'plc':
        rows.push({ id, cells: { address: `%${i % 2 ? 'Q' : 'I'}${Math.floor(i / 16)}.${(i % 16) % 8}`, direction: i % 2 ? 'A' : 'E', symbol: `Signal_${n}`, deviceBmk: `-${i % 2 ? 'K' : 'S'}${Math.floor(rnd() * 400) + 1}`, comment: `Kanal ${n} Anlage ${Math.floor(i / 64) + 1}` } })
        break
      case 'connections':
        rows.push({ id, cells: { from: `-K${Math.floor(rnd() * 400) + 1}:${pick(['13', '14', 'A1', 'A2', '1', '2'])}`, to: `-X${Math.floor(rnd() * 200) + 1}:${Math.floor(rnd() * 48) + 1}`, potential: pick(['L1', 'L2', 'L3', 'N', 'PE', '24V']), color: pick(['SW', 'BU', 'RD', 'GNYE', 'GY']), crossSection: pick(['0,75 mm²', '1,5 mm²', '2,5 mm²']), page: `${Math.floor(i / 30) + 10}.${(i % 30) + 1}` } })
        break
    }
  }
  return rows
}

const generatedCache = new Map<DataViewId, DataRow[]>()

export function buildDataTable(view: DataViewId, doc: CadDocument | null): DataTable {
  if (!generatedCache.has(view)) generatedCache.set(view, generatedRows(view))
  return { view, columns: columns[view], rows: [...realRows(view, doc), ...generatedCache.get(view)!] }
}
