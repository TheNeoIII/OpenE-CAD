import {
  CornerDownRight,
  PenLine,
  ArrowDownToLine,
  BookOpen,
  Boxes,
  Cable,
  ChevronsLeftRight,
  CircleHelp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Cpu,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FileUp,
  FolderKanban,
  FolderOpen,
  Grid3x3,
  Hand,
  Keyboard,
  LayoutGrid,
  Link2,
  Magnet,
  Maximize,
  Mouse,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Plus,
  Printer,
  Redo2,
  RotateCw,
  Save,
  Scan,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Spline,
  Table2,
  Trash2,
  Type,
  Undo2,
  Zap,
  ZoomIn,
  ZoomOut,
  Square as SquareIcon,
  Circle as CircleIcon,
  Image as ImageIcon,
} from 'lucide-react'
import {
  copyPages,
  copySelection,
  pastePages,
  selectedPageIds,
  deleteObjects,
  deletePage,
  duplicatePage,
  goToCrossReference,
  pasteClipboard,
  rotateObjects,
  useClipboardStore,
} from '@/features/schematic/actions'
import { pageObjects } from '@/features/schematic/models/geometry'
import { symbolDef } from '@/features/schematic/models/symbolLibrary'
import { isToolAllowed } from '@/features/editorProfiles'
import { fitPage, fitSelection, fitWidth, setZoom, zoomAt } from '@/features/schematic/viewport'
import { stepResult } from '@/features/validation/navigate'
import { getActivePage, useDocumentStore } from '@/stores/documentStore'
import { canWriteView } from '@/stores/dataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore } from '@/stores/toolStore'
import { toast, useUiStore, type Workspace } from '@/stores/uiStore'
import { useValidationStore } from '@/stores/validationStore'
import { useViewportStore } from '@/stores/viewportStore'
import type { SymbolKind } from '@/types/cad'
import { registerCommands, type Command } from './registry'

const hasProject = () => !!useProjectStore.getState().current
const hasSelection = () => useSelectionStore.getState().ids.length > 0
const inSchematic = () => hasProject() && useUiStore.getState().workspace === 'schematic'
const ui = () => useUiStore.getState()
const SCH: Workspace[] = ['schematic']
const allowed = (tool: Parameters<typeof isToolAllowed>[1]) => hasProject() && isToolAllowed(getActivePage()?.kind, tool)
const onSchematicPage = () => hasProject() && getActivePage()?.kind !== 'wiring'

function tableAvailable() {
  const s = ui()
  return hasProject() || (s.workspace === 'data' && s.dataPane === 'table' && s.dataView === 'articles')
}

function tableWritable() {
  return tableAvailable() && (ui().dataPane !== 'table' || canWriteView(ui().dataView))
}

function goWorkspace(w: Workspace) {
  if (w !== 'project' && w !== 'data' && !hasProject()) {
    toast('Zuerst ein Projekt öffnen')
    return
  }
  ui().setWorkspace(w)
}

function placeAtCenter(kind: SymbolKind, poles: 1 | 3) {
  useToolStore.getState().startPlace(kind, poles)
  ui().setWorkspace('schematic')
  toast(`${symbolDef(kind).label}: Klick in den Plan setzt das Symbol`)
}

function stepPage(dir: 1 | -1) {
  const { document, activePageId, setActivePage } = useDocumentStore.getState()
  if (!document) return
  const i = document.pages.findIndex((p) => p.id === activePageId)
  const next = document.pages[i + dir]
  if (next) {
    setActivePage(next.id)
    useSelectionStore.getState().clear()
  }
}

const commands: Command[] = [
  /* -------- Datei -------- */
  { id: 'file.new', label: 'Neues Projekt …', category: 'Datei', icon: FilePlus2, shortcut: 'Ctrl+N', run: () => ui().openDialog({ type: 'newProject' }) },
  { id: 'file.open', label: 'Projekt öffnen …', category: 'Datei', icon: FolderOpen, shortcut: 'Ctrl+O', run: () => ui().openDialog({ type: 'openProject' }) },
  { id: 'file.save', label: 'Speichern', category: 'Datei', icon: Save, shortcut: 'Ctrl+S', allowInInput: true, isEnabled: hasProject, run: () => useProjectStore.getState().save() },
  {
    id: 'file.duplicate',
    label: 'Projekt duplizieren …',
    category: 'Datei',
    icon: CopyPlus,
    isEnabled: (id?: string) => !!(id ?? useProjectStore.getState().current?.id ?? ui().projectFocusId),
    run: (id?: string) => {
      const pid = id ?? useProjectStore.getState().current?.id ?? ui().projectFocusId
      if (pid) ui().openDialog({ type: 'duplicateProject', projectId: pid })
    },
  },
  { id: 'file.projectSettings', label: 'Projekteigenschaften …', category: 'Datei', icon: FolderKanban, isEnabled: hasProject, run: () => ui().openDialog({ type: 'projectSettings' }) },
  { id: 'file.exportPdf', label: 'PDF exportieren …', category: 'Datei', icon: FileDown, shortcut: 'Ctrl+Shift+E', isEnabled: hasProject, run: () => ui().openDialog({ type: 'pdfExport', mode: 'pdf' }) },
  { id: 'file.print', label: 'Drucken …', category: 'Datei', icon: Printer, shortcut: 'Ctrl+P', isEnabled: hasProject, run: () => ui().openDialog({ type: 'pdfExport', mode: 'print' }) },
  {
    id: 'file.close',
    label: 'Projekt schließen',
    category: 'Datei',
    isEnabled: hasProject,
    run: (id?: string) => useProjectStore.getState().requestClose(id),
  },
  { id: 'file.settings', label: 'Einstellungen …', category: 'Datei', icon: Settings, shortcut: 'Ctrl+,', run: () => ui().openDialog({ type: 'settings' }) },

  /* -------- Bearbeiten -------- */
  {
    id: 'edit.undo',
    label: 'Rückgängig',
    category: 'Bearbeiten',
    icon: Undo2,
    shortcut: 'Ctrl+Z',
    isEnabled: () => useHistoryStore.getState().past.length > 0,
    run: () => {
      const l = useHistoryStore.getState().undo()
      if (l) toast(`Rückgängig: ${l}`)
    },
  },
  {
    id: 'edit.redo',
    label: 'Wiederholen',
    category: 'Bearbeiten',
    icon: Redo2,
    shortcut: ['Ctrl+Y', 'Ctrl+Shift+Z'],
    isEnabled: () => useHistoryStore.getState().future.length > 0,
    run: () => {
      const l = useHistoryStore.getState().redo()
      if (l) toast(`Wiederholt: ${l}`)
    },
  },
  {
    id: 'edit.cut',
    label: 'Ausschneiden',
    category: 'Bearbeiten',
    icon: Scissors,
    shortcut: 'Ctrl+X',
    scope: SCH,
    isEnabled: () => inSchematic() && hasSelection(),
    run: () => {
      copySelection()
      deleteObjects(useSelectionStore.getState().ids)
    },
  },
  {
    id: 'edit.copy',
    label: 'Kopieren',
    category: 'Bearbeiten',
    icon: Copy,
    shortcut: 'Ctrl+C',
    scope: SCH,
    isEnabled: () => inSchematic() && (hasSelection() || ui().pageSelection.length > 0),
    run: () => {
      if (!hasSelection()) {
        const n = copyPages(selectedPageIds())
        return toast(`${n} Seite(n) kopiert`)
      }
      const n = copySelection()
      toast(`${n} Objekt(e) kopiert`)
    },
  },
  {
    id: 'edit.paste',
    label: 'Einfügen',
    category: 'Bearbeiten',
    icon: ClipboardPaste,
    shortcut: 'Ctrl+V',
    scope: SCH,
    isEnabled: () => inSchematic() && (useClipboardStore.getState().objects.length > 0 || useClipboardStore.getState().pages.length > 0),
    run: () => {
      if (useClipboardStore.getState().pages.length) {
        const n = pastePages()
        return toast(`${n} Seite(n) eingefügt`, 'success')
      }
      pasteClipboard()
    },
  },
  {
    id: 'page.copy',
    label: 'Seite(n) kopieren',
    category: 'Seite',
    icon: Copy,
    isEnabled: hasProject,
    run: (id?: string) => {
      const sel = selectedPageIds()
      const ids = id && !sel.includes(id) ? [id] : sel
      const n = copyPages(ids)
      toast(`${n} Seite(n) kopiert – in jedem offenen Projekt mit Strg+V einfügbar`)
    },
  },
  {
    id: 'page.paste',
    label: 'Seite(n) einfügen',
    category: 'Seite',
    icon: ClipboardPaste,
    isEnabled: () => hasProject() && useClipboardStore.getState().pages.length > 0,
    run: () => {
      goWorkspace('schematic')
      const n = pastePages()
      toast(`${n} Seite(n) eingefügt`, 'success')
    },
  },
  {
    id: 'edit.duplicate',
    label: 'Duplizieren',
    category: 'Bearbeiten',
    icon: CopyPlus,
    shortcut: 'Ctrl+D',
    scope: SCH,
    isEnabled: () => inSchematic() && hasSelection(),
    run: () => {
      copySelection()
      pasteClipboard()
    },
  },
  {
    id: 'edit.delete',
    label: 'Löschen',
    category: 'Bearbeiten',
    icon: Trash2,
    shortcut: ['Delete', 'Backspace'],
    scope: SCH,
    isEnabled: () => inSchematic() && hasSelection(),
    run: () => {
      const ids = useSelectionStore.getState().ids
      if (!useSettingsStore.getState().confirmDelete || ids.length < 2) return deleteObjects(ids)
      ui().openDialog({ type: 'confirm', title: 'Objekte löschen', message: `${ids.length} Objekte löschen?`, confirmLabel: 'Löschen', danger: true, onConfirm: () => deleteObjects(ids) })
    },
  },
  {
    id: 'edit.selectAll',
    label: 'Alles auswählen',
    category: 'Bearbeiten',
    shortcut: 'Ctrl+A',
    scope: SCH,
    isEnabled: inSchematic,
    run: () => {
      const p = getActivePage()
      if (p) useSelectionStore.getState().set(pageObjects(p).filter((o) => o.type !== 'potential').map((o) => o.id))
    },
  },
  {
    id: 'edit.escape',
    label: 'Abbrechen / Auswahl aufheben',
    category: 'Bearbeiten',
    shortcut: 'Escape',
    scope: SCH,
    run: () => {
      const t = useToolStore.getState()
      if (t.wireDraft.length) return t.setDraft([])
      if (t.tool !== 'select') return t.setTool('select')
      useSelectionStore.getState().clear()
    },
  },
  { id: 'edit.rotate', label: 'Drehen 90°', category: 'Bearbeiten', icon: RotateCw, shortcut: 'R', scope: SCH, isEnabled: () => inSchematic() && hasSelection(), run: () => rotateObjects(useSelectionStore.getState().ids) },
  { id: 'edit.find', label: 'Suchen …', category: 'Bearbeiten', icon: Search, shortcut: 'Ctrl+F', allowInInput: true, run: () => ui().set({ paletteOpen: true }) },

  /* -------- Ansicht -------- */
  { id: 'view.zoomIn', label: 'Vergrößern', category: 'Ansicht', icon: ZoomIn, shortcut: ['+', 'Ctrl++'], scope: SCH, isEnabled: inSchematic, run: () => zoomAt(1.25) },
  { id: 'view.zoomOut', label: 'Verkleinern', category: 'Ansicht', icon: ZoomOut, shortcut: ['-', 'Ctrl+-'], scope: SCH, isEnabled: inSchematic, run: () => zoomAt(0.8) },
  { id: 'view.zoom100', label: 'Zoom 100 %', category: 'Ansicht', shortcut: 'Ctrl+0', scope: SCH, isEnabled: inSchematic, run: () => setZoom(1) },
  { id: 'view.fitPage', label: 'Ganze Seite', category: 'Ansicht', icon: Maximize, shortcut: 'F', scope: SCH, isEnabled: inSchematic, run: fitPage },
  { id: 'view.fitWidth', label: 'Seitenbreite', category: 'Ansicht', icon: ChevronsLeftRight, shortcut: 'Shift+W', scope: SCH, isEnabled: inSchematic, run: fitWidth },
  { id: 'view.fitSelection', label: 'Auswahl einpassen', category: 'Ansicht', icon: Scan, shortcut: 'Shift+F', scope: SCH, isEnabled: () => inSchematic() && hasSelection(), run: fitSelection },
  { id: 'view.grid', label: 'Raster anzeigen', category: 'Ansicht', icon: Grid3x3, shortcut: 'G', scope: SCH, isChecked: () => useSettingsStore.getState().showGrid, run: () => useSettingsStore.getState().toggle('showGrid') },
  {
    id: 'view.wheelMode',
    label: 'Mausrad zoomt (statt scrollen)',
    category: 'Ansicht',
    icon: Mouse,
    isChecked: () => useSettingsStore.getState().wheelMode === 'zoom',
    run: () => {
      const s = useSettingsStore.getState()
      const next = s.wheelMode === 'zoom' ? 'scroll' : 'zoom'
      s.set('wheelMode', next)
      toast(next === 'zoom' ? 'Mausrad: Zoomen (Strg+Rad scrollt)' : 'Mausrad: Scrollen (Strg+Rad zoomt)')
    },
  },
  { id: 'view.snap', label: 'Am Raster fangen', category: 'Ansicht', icon: Magnet, shortcut: 'Shift+S', scope: SCH, isChecked: () => useSettingsStore.getState().snap, run: () => useSettingsStore.getState().toggle('snap') },
  { id: 'view.guides', label: 'Hilfslinien (Strompfade)', category: 'Ansicht', isChecked: () => useSettingsStore.getState().guides, run: () => useSettingsStore.getState().toggle('guides') },
  { id: 'view.mono', label: 'Monochrom-Vorschau', category: 'Ansicht', isChecked: () => useSettingsStore.getState().mono, run: () => useSettingsStore.getState().toggle('mono') },
  { id: 'view.navigator', label: 'Navigator', category: 'Ansicht', icon: PanelLeft, shortcut: 'Ctrl+B', isChecked: () => ui().panels.navigator, run: () => ui().togglePanel('navigator') },
  { id: 'view.inspector', label: 'Eigenschaften', category: 'Ansicht', icon: PanelRight, shortcut: 'Ctrl+I', isChecked: () => ui().panels.inspector, run: () => ui().togglePanel('inspector') },
  { id: 'view.themeLight', label: 'Design: Hell', category: 'Ansicht', isChecked: () => useSettingsStore.getState().theme === 'light', run: () => useSettingsStore.getState().set('theme', 'light') },
  { id: 'view.themeDark', label: 'Design: Dunkel, heller Plan', category: 'Ansicht', isChecked: () => useSettingsStore.getState().theme === 'dark', run: () => useSettingsStore.getState().set('theme', 'dark') },
  { id: 'view.themeDarkCanvas', label: 'Design: Dunkel, dunkler Plan', category: 'Ansicht', isChecked: () => useSettingsStore.getState().theme === 'dark-canvas', run: () => useSettingsStore.getState().set('theme', 'dark-canvas') },

  /* -------- Arbeitsbereiche -------- */
  { id: 'ws.project', label: 'Projekt', category: 'Arbeitsbereich', icon: FolderKanban, shortcut: 'Alt+1', allowInInput: true, isChecked: () => ui().workspace === 'project', run: () => goWorkspace('project') },
  { id: 'ws.schematic', label: 'Stromlaufplan', category: 'Arbeitsbereich', icon: Zap, shortcut: 'Alt+2', allowInInput: true, isChecked: () => ui().workspace === 'schematic', run: () => goWorkspace('schematic') },
  { id: 'ws.cabinet', label: 'Aufbau', category: 'Arbeitsbereich', icon: LayoutGrid, shortcut: 'Alt+3', allowInInput: true, isChecked: () => ui().workspace === 'cabinet', run: () => goWorkspace('cabinet') },
  { id: 'ws.data', label: 'Daten', category: 'Arbeitsbereich', icon: Table2, shortcut: 'Alt+4', allowInInput: true, isChecked: () => ui().workspace === 'data', run: () => goWorkspace('data') },
  { id: 'ws.documentation', label: 'Dokumentation', category: 'Arbeitsbereich', icon: BookOpen, shortcut: 'Alt+5', allowInInput: true, isChecked: () => ui().workspace === 'documentation', run: () => goWorkspace('documentation') },

  /* -------- Werkzeuge / Einfügen -------- */
  { id: 'tool.select', label: 'Auswahl', category: 'Werkzeug', icon: MousePointer2, shortcut: 'V', scope: SCH, isChecked: () => useToolStore.getState().tool === 'select', run: () => useToolStore.getState().setTool('select') },
  { id: 'tool.wire', label: 'Leitung zeichnen', category: 'Werkzeug', icon: Spline, shortcut: 'W', scope: SCH, isEnabled: () => allowed('wire'), isChecked: () => useToolStore.getState().tool === 'wire', run: () => { goWorkspace('schematic'); useToolStore.getState().setTool('wire') } },
  { id: 'tool.line', label: 'Grafische Linie', category: 'Werkzeug', icon: PenLine, shortcut: 'L', scope: SCH, isEnabled: () => allowed('line'), isChecked: () => useToolStore.getState().tool === 'line', run: () => { goWorkspace('schematic'); useToolStore.getState().setTool('line') } },
  { id: 'tool.rect', label: 'Rechteck', category: 'Werkzeug', icon: SquareIcon, scope: SCH, isEnabled: () => allowed('rect'), isChecked: () => useToolStore.getState().tool === 'rect', run: () => { goWorkspace('schematic'); useToolStore.getState().setTool('rect') } },
  { id: 'tool.ellipse', label: 'Ellipse', category: 'Werkzeug', icon: CircleIcon, scope: SCH, isEnabled: () => allowed('ellipse'), isChecked: () => useToolStore.getState().tool === 'ellipse', run: () => { goWorkspace('schematic'); useToolStore.getState().setTool('ellipse') } },
  { id: 'insert.image', label: 'Bild einfügen …', category: 'Einfügen', icon: ImageIcon, keywords: 'bild image logo foto', scope: SCH, future: true, run: () => {} },
  { id: 'tool.routeMode', label: 'Leitungsführung umschalten (H→V / V→H)', category: 'Werkzeug', icon: CornerDownRight, shortcut: 'Tab', scope: SCH, isEnabled: hasProject, run: () => useToolStore.getState().toggleRouteMode() },
  { id: 'tool.text', label: 'Text', category: 'Werkzeug', icon: Type, shortcut: 'T', scope: SCH, isEnabled: () => allowed('text'), isChecked: () => useToolStore.getState().tool === 'text', run: () => { goWorkspace('schematic'); useToolStore.getState().setTool('text') } },
  { id: 'tool.pan', label: 'Ansicht verschieben', category: 'Werkzeug', icon: Hand, shortcut: 'H', scope: SCH, isChecked: () => useToolStore.getState().tool === 'pan', run: () => useToolStore.getState().setTool('pan') },
  { id: 'insert.symbol', label: 'Symbol einfügen …', category: 'Einfügen', icon: Plus, shortcut: 'I', scope: SCH, isEnabled: onSchematicPage, run: () => ui().openDialog({ type: 'symbolPicker' }) },
  { id: 'insert.contactor', label: 'Schütz 3-polig', category: 'Einfügen', keywords: 'K schütz', isEnabled: onSchematicPage, run: () => placeAtCenter('contactor', 3) },
  { id: 'insert.breaker', label: 'Schutzschalter 3-polig', category: 'Einfügen', keywords: 'F LS', isEnabled: onSchematicPage, run: () => placeAtCenter('breaker', 3) },
  { id: 'insert.coil', label: 'Spule', category: 'Einfügen', isEnabled: onSchematicPage, run: () => placeAtCenter('coil', 1) },
  { id: 'insert.contactNO', label: 'Schließer', category: 'Einfügen', isEnabled: onSchematicPage, run: () => placeAtCenter('contactNO', 1) },
  { id: 'insert.terminal', label: 'Klemme', category: 'Einfügen', keywords: 'X', isEnabled: onSchematicPage, run: () => placeAtCenter('terminal', 1) },
  { id: 'insert.motor', label: 'Motor', category: 'Einfügen', keywords: 'M', isEnabled: onSchematicPage, run: () => placeAtCenter('motor', 3) },
  { id: 'insert.potential', label: 'Potential …', category: 'Einfügen', icon: ArrowDownToLine, isEnabled: () => inSchematic() && onSchematicPage(), run: () => ui().openDialog({ type: 'potential' }) },
  { id: 'insert.xref', label: 'Querverweis …', category: 'Einfügen', icon: Link2, isEnabled: () => inSchematic() && onSchematicPage(), run: () => ui().openDialog({ type: 'xref' }) },
  { id: 'xref.goto', label: 'Gehe zu Verweisziel', category: 'Seite', icon: CornerDownRight, isEnabled: inSchematic, run: (id?: string) => goToCrossReference(id ?? useSelectionStore.getState().ids[0]) },
  { id: 'insert.macro', label: 'Makro einfügen', category: 'Einfügen', future: true, run: () => {} },

  /* -------- Seite -------- */
  { id: 'page.new', label: 'Neue Seite', category: 'Seite', icon: FilePlus2, shortcut: 'Ctrl+Shift+N', isEnabled: hasProject, run: () => { goWorkspace('schematic'); ui().openDialog({ type: 'pageNew' }) } },
  { id: 'page.duplicate', label: 'Seite duplizieren', category: 'Seite', isEnabled: hasProject, run: (id?: string) => duplicatePage(id ?? useDocumentStore.getState().activePageId!) },
  { id: 'page.properties', label: 'Seiteneigenschaften …', category: 'Seite', isEnabled: hasProject, run: (id?: string) => ui().openDialog({ type: 'pageProperties', pageId: id ?? useDocumentStore.getState().activePageId! }) },
  {
    id: 'page.delete',
    label: 'Seite löschen',
    category: 'Seite',
    icon: Trash2,
    isEnabled: () => (useDocumentStore.getState().document?.pages.length ?? 0) > 1,
    run: (id?: string) => {
      const pid = id ?? useDocumentStore.getState().activePageId!
      const page = useDocumentStore.getState().document?.pages.find((p) => p.id === pid)
      if (page) ui().openDialog({ type: 'confirm', title: 'Seite löschen', message: `Seite ${page.number} „${page.title}“ wird gelöscht. Rückgängig ist möglich.`, confirmLabel: 'Löschen', danger: true, onConfirm: () => deletePage(pid) })
    },
  },
  { id: 'page.next', label: 'Nächste Seite', category: 'Seite', shortcut: 'PageDown', scope: SCH, isEnabled: hasProject, run: () => stepPage(1) },
  { id: 'page.prev', label: 'Vorherige Seite', category: 'Seite', shortcut: 'PageUp', scope: SCH, isEnabled: hasProject, run: () => stepPage(-1) },

  /* -------- Prüfen -------- */
  {
    id: 'check.run',
    label: 'Projekt prüfen',
    category: 'Prüfen',
    icon: ShieldCheck,
    shortcut: 'F8',
    isEnabled: hasProject,
    run: async () => {
      const r = await useValidationStore.getState().run()
      const e = r.filter((x) => x.severity === 'error').length
      const w = r.filter((x) => x.severity === 'warning').length
      ui().set({ inspectorTab: 'validation', panels: { ...ui().panels, inspector: true } })
      toast(e + w === 0 ? 'Keine Befunde' : `${e} Fehler, ${w} Warnungen`, e ? 'error' : 'success')
    },
  },
  { id: 'check.next', label: 'Nächster Befund', category: 'Prüfen', shortcut: 'F4', isEnabled: () => hasProject() && useValidationStore.getState().results.length > 0, run: () => { stepResult(1) } },
  { id: 'check.prev', label: 'Vorheriger Befund', category: 'Prüfen', shortcut: 'Shift+F4', isEnabled: () => hasProject() && useValidationStore.getState().results.length > 0, run: () => { stepResult(-1) } },

  /* -------- Daten -------- */
  { id: 'data.export', label: 'Tabelle exportieren …', category: 'Daten', icon: FileSpreadsheet, isEnabled: tableAvailable, run: () => ui().openDialog({ type: 'dataExport' }) },
  { id: 'data.import', label: 'Tabelle importieren …', category: 'Daten', icon: FileUp, isEnabled: tableWritable, run: () => ui().openDialog({ type: 'dataImport' }) },
  { id: 'data.bulkEdit', label: 'Mehrfachbearbeitung …', category: 'Daten', isEnabled: tableWritable, run: () => ui().openDialog({ type: 'bulkEdit' }) },
  { id: 'data.plcImport', label: 'SPS-Hardware importieren', category: 'Daten', icon: Cpu, future: true, run: () => {} },
  { id: 'data.cableAuto', label: 'Kabel automatisch bilden', category: 'Daten', icon: Cable, future: true, run: () => {} },
  { id: 'data.parts', label: 'Artikelverwaltung', category: 'Daten', icon: Boxes, run: () => { ui().set({ dataView: 'articles', dataPane: 'table' }); goWorkspace('data') } },

  /* -------- Hilfe -------- */
  { id: 'help.palette', label: 'Befehlspalette', category: 'Hilfe', icon: Search, shortcut: 'Ctrl+K', allowInInput: true, run: () => ui().set({ paletteOpen: !ui().paletteOpen }) },
  { id: 'help.shortcuts', label: 'Tastenkürzel', category: 'Hilfe', icon: Keyboard, shortcut: ['F1', 'Shift+?'], run: () => ui().openDialog({ type: 'shortcuts' }) },
  { id: 'help.about', label: 'Über OpenE-CAD', category: 'Hilfe', icon: CircleHelp, run: () => ui().openDialog({ type: 'about' }) },
]

registerCommands(commands)

/** Keep zoom shortcuts working when the viewport is the visible element only. */
export const viewportReady = () => useViewportStore.getState().size.w > 0
