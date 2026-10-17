import type { MenuEntry } from '@/stores/uiStore'

const c = (command: string, label?: string, args?: unknown): MenuEntry => ({ command, label, args })
const sep: MenuEntry = { separator: true }

export const MENUS: { id: string; label: string; items: MenuEntry[] }[] = [
  {
    id: 'file',
    label: 'Datei',
    items: [c('file.new'), c('file.open'), c('file.save'), c('file.duplicate'), sep, c('file.projectSettings'), sep, c('file.exportPdf'), c('file.print'), { label: 'Exportieren', submenu: [c('data.export', 'Tabellen (CSV/XLSX) …'), c('file.exportPdf', 'PDF …')] }, sep, c('file.settings'), sep, c('file.close')],
  },
  {
    id: 'edit',
    label: 'Bearbeiten',
    items: [c('edit.undo'), c('edit.redo'), sep, c('edit.cut'), c('edit.copy'), c('edit.paste'), c('edit.duplicate'), c('edit.delete'), sep, c('edit.selectAll'), c('edit.rotate'), sep, c('edit.find')],
  },
  {
    id: 'view',
    label: 'Ansicht',
    items: [
      c('view.zoomIn'),
      c('view.zoomOut'),
      c('view.zoom100'),
      c('view.fitPage'),
      c('view.fitWidth'),
      c('view.fitSelection'),
      sep,
      c('view.grid'),
      c('view.snap'),
  c('view.wheelMode'),
      c('view.guides'),
      c('view.mono'),
      sep,
      c('view.navigator'),
      c('view.inspector'),
      sep,
      { label: 'Design', submenu: [c('view.themeLight', 'Hell'), c('view.themeDark', 'Dunkel, heller Plan'), c('view.themeDarkCanvas', 'Dunkel, dunkler Plan')] },
      { label: 'Arbeitsbereich', submenu: [c('ws.project'), c('ws.schematic'), c('ws.cabinet'), c('ws.data'), c('ws.documentation')] },
    ],
  },
  {
    id: 'insert',
    label: 'Einfügen',
    items: [
      c('insert.symbol'),
      { label: 'Schnellzugriff', submenu: [c('insert.contactor'), c('insert.breaker'), c('insert.coil'), c('insert.contactNO'), c('insert.terminal'), c('insert.motor')] },
      sep,
      c('tool.wire'),
      c('tool.routeMode'),
      c('tool.line'),
      c('tool.text'),
      c('insert.potential'),
      c('insert.xref'),
      sep,
      c('insert.macro'),
    ],
  },
  { id: 'page', label: 'Seite', items: [c('page.new'), c('page.duplicate'), c('page.properties'), sep, c('page.prev'), c('page.next'), sep, c('page.delete')] },
  { id: 'check', label: 'Prüfen', items: [c('check.run'), c('check.next'), c('check.prev')] },
  { id: 'data', label: 'Daten', items: [c('data.parts'), c('data.bulkEdit'), sep, c('data.import'), c('data.export'), sep, c('data.plcImport'), c('data.cableAuto')] },
  { id: 'help', label: 'Hilfe', items: [c('help.palette'), c('help.shortcuts'), sep, c('help.about')] },
]

export const SYMBOL_CONTEXT_MENU: MenuEntry[] = [c('edit.cut'), c('edit.copy'), c('edit.paste'), c('edit.duplicate'), sep, c('edit.rotate'), c('view.fitSelection'), sep, c('edit.delete')]
export const CONDUCTOR_CONTEXT_MENU: MenuEntry[] = [c('insert.xref', 'Querverweis anfügen …'), sep, ...SYMBOL_CONTEXT_MENU]
export const xrefContextMenu = (id: string): MenuEntry[] => [c('xref.goto', undefined, id), sep, ...SYMBOL_CONTEXT_MENU]
export const CANVAS_CONTEXT_MENU: MenuEntry[] = [c('edit.paste'), c('edit.selectAll'), sep, c('insert.symbol'), c('tool.wire'), c('tool.text'), c('insert.potential'), sep, c('view.fitPage'), c('view.grid'), c('view.snap')]
export const pageContextMenu = (pageId: string): MenuEntry[] => [c('page.properties', undefined, pageId), c('page.duplicate', undefined, pageId), c('page.new'), sep, c('page.copy', undefined, pageId), c('page.paste'), sep, c('page.delete', undefined, pageId)]
