import type {
  CadDocument,
  CadJunction,
  CadPage,
  CadPotential,
  CadSymbol,
  CadText,
  CadWire,
  PageKind,
  SymbolKind,
  TextStyle,
  WireColor,
} from '@/types/cad'
import type { Device, DeviceCategory, MountType, Placement } from '@/types/device'
import { articleByNo } from './articles'

const NOW = '2026-10-14T15:42:00.000Z'

/* ---------- builders (all coordinates are world units, 0.1 mm) ---------- */

function makeBuilder(prefix: string) {
  let n = 0
  const id = (t: string) => `${prefix}-${t}${++n}`
  return {
    sym(kind: SymbolKind, deviceId: string | null, x: number, y: number, extra: Partial<CadSymbol> = {}): CadSymbol {
      return { id: id('s'), type: 'symbol', kind, deviceId, position: { x, y }, rotation: 0, poles: 1, ...extra }
    },
    wire(potential: string | null, color: WireColor, ...pts: [number, number][]): CadWire {
      return { id: id('w'), type: 'wire', points: pts.map(([x, y]) => ({ x, y })), potential, color, crossSection: color === 'red' ? '1,5 mm²' : '2,5 mm²' }
    },
    j(x: number, y: number): CadJunction {
      return { id: id('j'), type: 'junction', position: { x, y } }
    },
    text(text: string, x: number, y: number, style: TextStyle = 'note', size = 28, anchor: CadText['anchor'] = 'start'): CadText {
      return { id: id('t'), type: 'text', position: { x, y }, text, size, style, anchor }
    },
    rail(name: string, y: number, x1 = 320, x2 = 3980, xrefLeft?: string, xrefRight?: string): CadPotential {
      return { id: id('p'), type: 'potential', name, y, x1, x2, xrefLeft, xrefRight }
    },
  }
}

function page(id: string, number: string, title: string, functionGroup: string, kind: PageKind = 'schematic'): CadPage {
  return { id, number, title, functionGroup, format: 'A3L', kind, revision: 'B', updatedAt: NOW, symbols: [], wires: [], junctions: [], texts: [], potentials: [], lines: [] }
}

function device(
  id: string,
  bmk: string,
  fn: string,
  category: DeviceCategory,
  mount: MountType,
  articleNo: string | null,
  placement: Placement | null = null,
): Device {
  const a = articleNo ? articleByNo(articleNo) : undefined
  return {
    id,
    bmk,
    function: fn,
    location: mount === 'field' ? '+FELD' : '+UV2',
    distributor: mount === 'rail' ? 'UV2 Technik' : mount === 'door' ? 'UV2 Tür' : '—',
    category,
    articleId: a?.id ?? null,
    manufacturer: a?.manufacturer ?? '',
    articleNo: a?.articleNo ?? '',
    type: a?.type ?? '',
    ratedCurrent: a?.ratedCurrent ?? null,
    ac3Power: a?.ac3Power ?? null,
    coilVoltage: a?.coilVoltage ?? '',
    auxContacts: a?.auxContacts ?? '',
    widthTE: a?.widthTE ?? (mount === 'rail' ? 1 : 0),
    dimensions: a?.dimensions ?? '',
    mount,
    placement,
  }
}

const RAILS_TOP = (b: ReturnType<typeof makeBuilder>, left: string, right: string) => [
  b.rail('L1', 300, 320, 3980, left, right),
  b.rail('L2', 350, 320, 3980, left, right),
  b.rail('L3', 400, 320, 3980, left, right),
  b.rail('N', 450, 320, 3980, left, right),
  b.rail('PE', 500, 320, 3980, left, right),
]

/* ---------- 2.1 Motor Lüftung: the functional reference sheet ---------- */

function motorPage(): CadPage {
  const b = makeBuilder('p21')
  const p = page('pg-2-1', '2.1', 'Motor Lüftung', '=M1')
  p.potentials = [...RAILS_TOP(b, '/1.1', '/2.2'), b.rail('N', 2500, 1600, 3980, undefined, '/2.2')]

  p.symbols = [
    b.sym('breaker', 'dev-q1', 800, 800, { poles: 3 }),
    b.sym('contactor', 'dev-k1', 800, 1200, { poles: 3 }),
    b.sym('terminal', 'dev-x1', 700, 1500, { terminalNo: '1' }),
    b.sym('terminal', 'dev-x1', 800, 1500, { terminalNo: '2' }),
    b.sym('terminal', 'dev-x1', 900, 1500, { terminalNo: '3' }),
    b.sym('terminal', 'dev-x1', 1000, 1500, { terminalNo: 'PE' }),
    b.sym('motor', 'dev-m1', 800, 1900),
    b.sym('breaker', 'dev-f2', 1800, 800, { pinNames: ['1', '2'] }),
    b.sym('pushbutton', 'dev-s1', 1800, 1150),
    b.sym('contactNO', 'dev-k1', 2100, 1150, { pinNames: ['13', '14'] }),
    b.sym('coil', 'dev-k1', 1800, 1500),
    b.sym('contactNO', 'dev-k1', 2600, 1150, { pinNames: ['23', '24'] }),
    b.sym('lamp', 'dev-h1', 2600, 1500),
    b.sym('contactNC', 'dev-k1', 3100, 1150, { pinNames: ['21', '22'] }),
    b.sym('lamp', 'dev-h2', 3100, 1500),
  ]

  p.wires = [
    // Main circuit L1/L2/L3 -> Q1 -> K1 -> X1 -> M1
    b.wire('L1', 'auto', [700, 300], [700, 700]),
    b.wire('L2', 'auto', [800, 350], [800, 700]),
    b.wire('L3', 'auto', [900, 400], [900, 700]),
    b.wire('L1', 'auto', [700, 900], [700, 1100]),
    b.wire('L2', 'auto', [800, 900], [800, 1100]),
    b.wire('L3', 'auto', [900, 900], [900, 1100]),
    b.wire('L1', 'auto', [700, 1300], [700, 1450]),
    b.wire('L2', 'auto', [800, 1300], [800, 1450]),
    b.wire('L3', 'auto', [900, 1300], [900, 1450]),
    b.wire('L1', 'auto', [700, 1550], [700, 1750]),
    b.wire('L2', 'auto', [800, 1550], [800, 1750]),
    b.wire('L3', 'auto', [900, 1550], [900, 1750]),
    b.wire('PE', 'auto', [1000, 500], [1000, 1450]),
    b.wire('PE', 'auto', [1000, 1550], [1000, 1750]),
    // Control circuit (red section) L1 -> F2 -> S1 // K1:13-14 -> A1
    b.wire('L1', 'auto', [1800, 300], [1800, 700]),
    // Every conductor ends exactly on a pin (contacts at y=1150 have pins at 1050/1250).
    b.wire(null, 'red', [1800, 900], [1800, 1050]),
    b.wire(null, 'red', [1800, 1050], [2100, 1050]),
    b.wire(null, 'red', [2100, 1250], [2100, 1300], [1800, 1300]),
    b.wire(null, 'red', [1800, 1250], [1800, 1400]),
    b.wire(null, 'red', [2100, 1050], [2600, 1050]),
    b.wire(null, 'red', [2600, 1250], [2600, 1400]),
    b.wire(null, 'red', [2600, 1050], [3100, 1050]),
    b.wire(null, 'red', [3100, 1250], [3100, 1400]),
    // Return conductors to N (blue)
    b.wire('N', 'auto', [1800, 1600], [1800, 2500]),
    b.wire('N', 'auto', [2600, 1600], [2600, 2500]),
    b.wire('N', 'auto', [3100, 1600], [3100, 2500]),
  ]

  p.junctions = [
    b.j(700, 300), b.j(800, 350), b.j(900, 400), b.j(1000, 500), b.j(1800, 300),
    b.j(1800, 1050), b.j(2100, 1050), b.j(2600, 1050), b.j(1800, 1300),
    b.j(1800, 2500), b.j(2600, 2500), b.j(3100, 2500),
  ]

  p.texts = [
    b.text('3/N/PE ~ 400/230 V 50 Hz', 220, 270, 'note', 26),
    b.text('Motor Lüftung', 800, 2130, 'note', 30, 'middle'),
    b.text('2,2 kW · 4,9 A', 800, 2170, 'note', 24, 'middle'),
    b.text('Steuerung Lüftung', 1700, 640, 'note', 28),
    b.text('Ein', 1640, 1160, 'note', 24, 'end'),
    b.text('Betrieb', 2660, 1660, 'note', 24),
    b.text('Bereit', 3160, 1660, 'note', 24),
    b.text('1–2  /2.1', 1860, 1700, 'xref', 22),
    b.text('3–4  /2.1', 1860, 1730, 'xref', 22),
    b.text('5–6  /2.1', 1860, 1760, 'xref', 22),
    b.text('13–14  /2.2', 1860, 1790, 'xref', 22),
    b.text('23–24  /2.2', 1860, 1820, 'xref', 22),
    b.text('21–22  /2.2', 1860, 1850, 'xref', 22),
    b.text('→ /2.2.A1', 1830, 1380, 'xref', 22),
  ]
  return p
}

function feedPage(): CadPage {
  const b = makeBuilder('p11')
  const p = page('pg-1-1', '1.1', 'Einspeisung', '=E1')
  p.potentials = RAILS_TOP(b, '', '/2.1').map((r) => ({ ...r, xrefLeft: undefined }))
  p.symbols = [b.sym('breaker', 'dev-q0', 800, 1100, { poles: 3 }), b.sym('breaker', 'dev-f1', 1600, 1100, { poles: 3 })]
  p.wires = [
    b.wire('L1', 'auto', [700, 1000], [700, 300]),
    b.wire('L2', 'auto', [800, 1000], [800, 350]),
    b.wire('L3', 'auto', [900, 1000], [900, 400]),
    b.wire('L1', 'auto', [1500, 300], [1500, 1000]),
    b.wire('L2', 'auto', [1600, 350], [1600, 1000]),
    b.wire('L3', 'auto', [1700, 400], [1700, 1000]),
  ]
  p.junctions = [b.j(700, 300), b.j(800, 350), b.j(900, 400), b.j(1500, 300), b.j(1600, 350), b.j(1700, 400)]
  p.texts = [b.text('Einspeisung aus HV, NYY-J 5×10 mm²', 600, 1400, 'note', 26), b.text('Hauptschalter', 800, 1300, 'note', 24, 'middle'), b.text('FI 40 A / 30 mA', 1600, 1300, 'note', 24, 'middle')]
  return p
}

function controlPage(): CadPage {
  const b = makeBuilder('p22')
  const p = page('pg-2-2', '2.2', 'Steuerung Lüftung', '=M1')
  p.potentials = [...RAILS_TOP(b, '/2.1', '/3.1'), b.rail('N', 2500, 1000, 3980, '/2.1')]
  p.symbols = [b.sym('coil', 'dev-k2', 1200, 1200)]
  p.wires = [b.wire('L1', 'auto', [1200, 300], [1200, 1100])]
  p.junctions = [b.j(1200, 300)]
  p.texts = [b.text('Hilfsrelais Störmeldung (A2 offen – in Bearbeitung)', 1300, 1500, 'note', 24)]
  return p
}

function lightingPage(id: string, number: string, title: string, f3Device: string, withConflict: boolean): CadPage {
  const b = makeBuilder(id)
  const p = page(id, number, title, '=B1')
  p.potentials = [...RAILS_TOP(b, '/2.2', ''), b.rail('N', 2500, 600, 3980)]
  p.symbols = [b.sym('breaker', f3Device, 800, 800), b.sym('lamp', withConflict ? 'dev-e1' : 'dev-e3', 800, 1500)]
  p.wires = [b.wire('L1', 'auto', [800, 300], [800, 700]), b.wire('L1', 'auto', [800, 900], [800, 1400]), b.wire('N', 'auto', [800, 1600], [800, 2500])]
  p.junctions = [b.j(800, 300), b.j(800, 2500)]
  if (withConflict) {
    p.symbols.push(b.sym('breaker', 'dev-f4', 1400, 800), b.sym('lamp', 'dev-e2', 1400, 1500))
    p.wires.push(
      b.wire('L2', 'auto', [1400, 350], [1400, 700]),
      b.wire('L2', 'auto', [1400, 900], [1400, 1400]),
      // Deliberate conflict: conductor tagged L2 lands on the N rail.
      b.wire('L2', 'auto', [1400, 1600], [1400, 2500]),
    )
    p.junctions.push(b.j(1400, 350), b.j(1400, 2500))
  }
  p.texts = [b.text(title, 800, 1720, 'note', 26, 'middle')]
  return p
}

interface Outgoing {
  bmk: string
  rating: string
  label: string[]
}

const F_RAIL_Y = [900, 950, 1000]
const F_N_Y = 1050
const FI_OUT_Y = 819.14
const PE_Y = 1750
const OUTLET_Y = 2150

/** ELCAD-style group sheet: busbars with xrefs at the line ends, optional group feed, outgoing circuits with terminals. */
function groupPage(id: string, number: string, title: string, prev: string, next: string, firstTerminal: number, outgoing: Outgoing[], withFeed: boolean): { page: CadPage; devices: Device[] } {
  const b = makeBuilder(id)
  const p = page(id, number, title, '=F1')
  const devices: Device[] = []
  const fx1 = withFeed ? 600 : 320
  p.potentials = [
    b.rail('L1', 300, 320, 3980, prev, next),
    b.rail('L2', 350, 320, 3980, prev, next),
    b.rail('L3', 400, 320, 3980, prev, next),
    b.rail('N', 450, 320, 3980, prev, next),
    b.rail('F/L1', F_RAIL_Y[0], fx1, 3980, withFeed ? undefined : prev, next),
    b.rail('F/L2', F_RAIL_Y[1], fx1, 3980, withFeed ? undefined : prev, next),
    b.rail('F/L3', F_RAIL_Y[2], fx1, 3980, withFeed ? undefined : prev, next),
    b.rail('F/N', F_N_Y, withFeed ? 900 : 320, 3980, withFeed ? undefined : prev, next),
    b.rail('PE', PE_Y, 320, 3980, prev, next),
  ]

  if (withFeed) {
    devices.push({ ...device(`${id}-fi`, '-1F0', 'FI-Schutzschalter Gruppe', 'Schutzgerät', 'rail', null), nominalCurrent: 40, residualCurrent: 30 })
    p.symbols.push(b.sym('rcd', `${id}-fi`, 750, 600, { poles: 3 }))
    p.wires.push(
      b.wire('L1', 'auto', [600, 300], [600, 500]),
      b.wire('L2', 'auto', [700, 350], [700, 500]),
      b.wire('L3', 'auto', [800, 400], [800, 500]),
      b.wire('N', 'auto', [900, 450], [900, 500]),
      b.wire('F/L1', 'auto', [600, FI_OUT_Y], [600, F_RAIL_Y[0]]),
      b.wire('F/L2', 'auto', [700, FI_OUT_Y], [700, F_RAIL_Y[1]]),
      b.wire('F/L3', 'auto', [800, FI_OUT_Y], [800, F_RAIL_Y[2]]),
      b.wire('F/N', 'auto', [900, FI_OUT_Y], [900, F_N_Y]),
    )
    p.junctions.push(b.j(600, 300), b.j(700, 350), b.j(800, 400), b.j(900, 450), b.j(600, F_RAIL_Y[0]), b.j(700, F_RAIL_Y[1]), b.j(800, F_RAIL_Y[2]), b.j(900, F_N_Y))
  }

  const terminalId = 'dev-x2'
  devices.push(device(terminalId, '-X2', 'Klemmleiste Gruppe -1F', 'Klemme', 'rail', null))
  const startX = withFeed ? 1300 : 700
  const step = withFeed ? 520 : 560
  let t = firstTerminal
  outgoing.forEach((o, i) => {
    const x = startX + i * step
    const railY = F_RAIL_Y[i % 3]
    const dev = `${id}-f${i}`
    const [characteristic, amps] = [o.rating.charAt(0), Number(o.rating.slice(1).replace(/A$/i, ''))]
    devices.push({ ...device(dev, o.bmk, `LS ${o.label.join(' ')}`, 'Schutzgerät', 'rail', null), characteristic, nominalCurrent: amps })
    p.symbols.push(
      b.sym('breakerN', dev, x + 50, 1300, { pinNames: ['1', '2', 'N', "N'"] }),
      b.sym('terminal', terminalId, x, 1900, { terminalNo: String(t) }),
      b.sym('terminal', terminalId, x + 100, 1900, { terminalNo: String(t + 1) }),
      b.sym('terminal', terminalId, x + 200, 1900, { terminalNo: 'PE' }),
      b.sym('outlet', null, x + 100, OUTLET_Y, { poles: 3, pinNames: ['L', 'N', 'PE'] }),
    )
    p.wires.push(
      b.wire(`F/L${(i % 3) + 1}`, 'auto', [x, railY], [x, 1200]),
      b.wire(null, 'auto', [x, 1400], [x, 1850]),
      b.wire('F/N', 'auto', [x + 100, F_N_Y], [x + 100, 1200]),
      b.wire('F/N', 'auto', [x + 100, 1400], [x + 100, 1850]),
      b.wire('PE', 'auto', [x + 200, PE_Y], [x + 200, 1850]),
      b.wire(null, 'auto', [x, 1950], [x, OUTLET_Y - 100]),
      b.wire('F/N', 'auto', [x + 100, 1950], [x + 100, OUTLET_Y - 100]),
      b.wire('PE', 'auto', [x + 200, 1950], [x + 200, OUTLET_Y - 100]),
    )
    p.junctions.push(b.j(x, railY), b.j(x + 100, F_N_Y), b.j(x + 200, PE_Y))
    p.texts.push(b.text(o.label.join('\n'), x + 100, OUTLET_Y + 110, 'note', 22, 'middle'))
    t += 2
  })
  return { page: p, devices }
}

export function buildSampleDocument(projectId: string): CadDocument {
  const group1 = groupPage('pg-4-1', '4.1', 'Gruppe -1F Licht', '/1.1', '/4.2', 1, [
    { bmk: '-1F1', rating: 'B13A', label: ['Licht', 'Technikraum'] },
    { bmk: '-1F2', rating: 'B13A', label: ['Licht', 'Treppenhaus'] },
    { bmk: '-1F3', rating: 'B13A', label: ['Licht', 'Kellergang'] },
    { bmk: '-1F4', rating: 'B13A', label: ['Außenbeleuchtung', '+ Jalousie'] },
    { bmk: '-1F5', rating: 'B13A', label: ['Reserve'] },
  ], true)
  const group2 = groupPage('pg-4-2', '4.2', 'Gruppe -1F Steckdosen', '/4.1', '', 11, [
    { bmk: '-1F6', rating: 'C16A', label: ['Steckdose', 'Heizung'] },
    { bmk: '-1F7', rating: 'C16A', label: ['Steckdosen', 'Technikraum'] },
    { bmk: '-1F8', rating: 'C16A', label: ['Steckdosen', 'Werkstatt'] },
    { bmk: '-1F9', rating: 'C16A', label: ['EDV Steckdosen', 'Büro'] },
    { bmk: '-1F10', rating: 'C16A', label: ['Steckdosen', 'Waschküche'] },
    { bmk: '-1F11', rating: 'C16A', label: ['Reserve'] },
  ], false)

  const cover = page('pg-0-1', '0.1', 'Deckblatt', '=GA', 'cover')
  const toc = page('pg-0-2', '0.2', 'Inhaltsverzeichnis', '=GA', 'report')
  const terminalReport = page('pg-9-1', '9.1', 'Klemmenplan', '=X', 'report')
  toc.report = 'toc'
  terminalReport.report = 'terminals'

  const uv = (row: number, order: number): Placement => ({ cabinetId: 'cab-uv2', row, order })

  const devices: Device[] = [
    device('dev-q0', '-Q0', 'Hauptschalter UV2', 'Schutzgerät', 'rail', 'SBN340', uv(0, 0)),
    device('dev-f1', '-F1', 'FI-Schutzschalter', 'Schutzgerät', 'rail', 'CDA440D', uv(0, 1)),
    device('dev-q1', '-Q1', 'Motorschutz Lüftung', 'Schutzgerät', 'rail', '3RV2011-1HA10', uv(0, 2)),
    device('dev-f2', '-F2', 'LS Steuerstromkreis', 'Schutzgerät', 'rail', 'MBN106', uv(0, 3)),
    device('dev-f3', '-F3', 'LS Beleuchtung EG', 'Schutzgerät', 'rail', 'MBN110', uv(0, 4)),
    device('dev-f4', '-F4', 'LS Beleuchtung Flur', 'Schutzgerät', 'rail', 'MBN110', uv(0, 5)),
    device('dev-k1', '-K1', 'Schütz Motor Lüftung', 'Schütz', 'rail', '3RT2016-1AP01', uv(1, 0)),
    device('dev-x1', '-X1', 'Klemmleiste Lüftung', 'Klemme', 'rail', '3044076', uv(1, 1)),
    device('dev-k2', '-K2', 'Hilfsrelais Störung', 'Relais', 'rail', '22.32.0.230.4340'),
    device('dev-f3b', '-F3', 'LS Beleuchtung OG', 'Schutzgerät', 'rail', 'MBN110'),
    device('dev-s1', '-S1', 'Taster Lüftung Ein', 'Befehlsgerät', 'door', '3SU1100-0AB40-1BA0'),
    device('dev-h1', '-H1', 'Meldeleuchte Betrieb', 'Meldegerät', 'door', '3SU1106-6AA40-1AA0'),
    device('dev-h2', '-H2', 'Meldeleuchte Bereit', 'Meldegerät', 'door', null),
    device('dev-m1', '-M1', 'Lüfter Dach', 'Motor', 'field', '1LE1001-0DB22-2AA4'),
    device('dev-e1', '-E1', 'Leuchte Technik', 'Leuchte', 'field', '7124751'),
    device('dev-e2', '-E2', 'Leuchte Flur', 'Leuchte', 'field', '42182542'),
    device('dev-e3', '-E3', 'Leuchte OG', 'Leuchte', 'field', '42182542'),
  ]
  // The X1 strip occupies 2 TE of rail including end plate and markers.
  devices.find((d) => d.id === 'dev-x1')!.widthTE = 2

  return {
    id: `doc-${projectId}`,
    projectId,
    functionGroups: [
      { id: '=GA', label: 'Allgemein', no: 0 },
      { id: '=E1', label: 'Einspeisung', no: 1 },
      { id: '=M1', label: 'Lüftung', no: 2 },
      { id: '=B1', label: 'Beleuchtung', no: 3 },
      { id: '=F1', label: 'Gruppe -1F', no: 4 },
      { id: '=X', label: 'Auswertungen', no: 9 },
    ],
    pages: [
      cover,
      toc,
      feedPage(),
      motorPage(),
      controlPage(),
      lightingPage('pg-3-1', '3.1', 'Beleuchtung EG', 'dev-f3', true),
      lightingPage('pg-3-2', '3.2', 'Beleuchtung OG', 'dev-f3b', false),
      group1.page,
      group2.page,
      terminalReport,
    ],
    devices: [...devices, ...group1.devices, ...group2.devices.filter((d) => d.id !== 'dev-x2')],
    cabinets: [
      { id: 'cab-uv2', name: '+UV2', description: 'Unterverteilung Technik', rows: 3, rowCapacityTE: 12 },
      { id: 'cab-hv', name: '+HV', description: 'Hauptverteilung', rows: 4, rowCapacityTE: 24 },
    ],
    cables: [
      { id: 'cab-w1', bmk: '-W1', type: 'NYM-J', cores: '5×1,5 mm²', from: '-X1', to: '-M1', length: 18 },
      { id: 'cab-w2', bmk: '-W2', type: 'NYM-J', cores: '3×1,5 mm²', from: '-F3', to: '-E1', length: 12 },
      { id: 'cab-w3', bmk: '-W3', type: 'NYM-J', cores: '3×1,5 mm²', from: '-F4', to: '-E2', length: 21 },
      { id: 'cab-w4', bmk: '-W4', type: 'NYY-J', cores: '5×10 mm²', from: '+HV', to: '-Q0', length: 35 },
      { id: 'cab-w5', bmk: '-W5', type: 'ÖLFLEX 110', cores: '7G1 mm²', from: '-X1', to: '+TÜR', length: 2 },
    ],
    plc: [
      { id: 'io-1', address: '%I0.0', symbol: 'Lueftung_Ein', direction: 'E', deviceBmk: '-S1', comment: 'Taster Lüftung Ein' },
      { id: 'io-2', address: '%I0.1', symbol: 'Lueftung_Rueckm', direction: 'E', deviceBmk: '-K1', comment: 'Rückmeldung Schütz' },
      { id: 'io-3', address: '%I0.2', symbol: 'MSS_Ausgeloest', direction: 'E', deviceBmk: '-Q1', comment: 'Motorschutz ausgelöst' },
      { id: 'io-4', address: '%Q0.0', symbol: 'Lueftung_Freigabe', direction: 'A', deviceBmk: '-K1', comment: 'Freigabe Schütz' },
      { id: 'io-5', address: '%Q0.1', symbol: 'Meldung_Betrieb', direction: 'A', deviceBmk: '-H1', comment: 'Meldeleuchte Betrieb' },
      { id: 'io-6', address: '%Q0.2', symbol: 'Stoerung', direction: 'A', deviceBmk: '-K2', comment: 'Sammelstörung' },
    ],
  }
}

/** Minimal document for newly created / non-sample projects. */
export function buildEmptyDocument(projectId: string, templatePages: number): CadDocument {
  const pages: CadPage[] = [page(`${projectId}-pg-0-1`, '0.1', 'Deckblatt', '=GA', 'cover')]
  for (let i = 1; i < Math.max(2, templatePages); i++) {
    const b = makeBuilder(`${projectId}-${i}`)
    const p = page(`${projectId}-pg-${i}`, `${i}.1`, i === 1 ? 'Einspeisung' : `Stromkreis ${i}`, i === 1 ? '=E1' : '=A1')
    p.potentials = RAILS_TOP(b, '', '')
    pages.push(p)
  }
  return {
    id: `doc-${projectId}`,
    projectId,
    functionGroups: [
      { id: '=GA', label: 'Allgemein', no: 0 },
      { id: '=E1', label: 'Einspeisung', no: 1 },
      { id: '=A1', label: 'Anlage', no: 2 },
    ],
    pages,
    devices: [],
    cabinets: [{ id: `${projectId}-cab`, name: '+UV1', description: 'Unterverteilung', rows: 3, rowCapacityTE: 12 }],
    cables: [],
    plc: [],
  }
}
