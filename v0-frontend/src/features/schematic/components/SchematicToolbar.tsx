import { Circle, Square, Image as ImageIcon, Grid3x3, Hand, Magnet, Maximize, MousePointer2, MoveVertical as MouseScroll, ScanSearch as MouseZoom, PanelLeft, PanelRight, PenLine, Plus, RotateCw, Spline, Trash2, Type, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton } from '@/components/ui/primitives'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore, type CadTool } from '@/stores/toolStore'
import { toast, useUiStore } from '@/stores/uiStore'
import { variantByKey, type SymbolVariant } from '../models/symbolLibrary'
import { useActivePage } from '@/stores/documentStore'
import { useViewportStore } from '@/stores/viewportStore'
import { SymbolGlyph } from './SymbolGlyph'

const SHAPE_TOOLS: { tool: CadTool; cmd: string; icon: LucideIcon }[] = [
  { tool: 'rect', cmd: 'tool.rect', icon: Square },
  { tool: 'ellipse', cmd: 'tool.ellipse', icon: Circle },
]

const TOOLS: { tool: CadTool; cmd: string; icon: LucideIcon }[] = [
  { tool: 'select', cmd: 'tool.select', icon: MousePointer2 },
  { tool: 'pan', cmd: 'tool.pan', icon: Hand },
  { tool: 'wire', cmd: 'tool.wire', icon: Spline },
  { tool: 'line', cmd: 'tool.line', icon: PenLine },
  { tool: 'text', cmd: 'tool.text', icon: Type },
]


function Sep() {
  return <div className="mx-1 h-4 w-px bg-line" aria-hidden />
}

export function SchematicToolbar() {
  const tool = useToolStore((s) => s.tool)
  const placeKind = useToolStore((s) => s.placeKind)
  const placePoles = useToolStore((s) => s.placePoles)
  const favoriteKeys = useSettingsStore((s) => s.favoriteSymbols)
  const favorites = favoriteKeys
    .map((k) => variantByKey(k))
    .filter((v): v is SymbolVariant => !!v)
    .slice(0, 6)
  const hasSel = useSelectionStore((s) => s.ids.length > 0)
  const showGrid = useSettingsStore((s) => s.showGrid)
  const snap = useSettingsStore((s) => s.snap)
  const wheelZoom = useSettingsStore((s) => s.wheelMode === 'zoom')
  const panels = useUiStore((s) => s.panels)
  const page = useActivePage()
  const zoom = useViewportStore((s) => (page ? s.byPage[page.id]?.zoom : undefined))

  return (
    <div role="toolbar" aria-label="Stromlaufplan-Werkzeuge" className="flex h-9 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-2">
      <IconButton icon={PanelLeft} label={tooltip('view.navigator')} active={panels.navigator} onClick={() => runCommand('view.navigator')} />
      <Sep />
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
      {TOOLS.map((t) => (
        <IconButton key={t.tool} icon={t.icon} label={tooltip(t.cmd)} active={tool === t.tool} onClick={() => runCommand(t.cmd)} />
      ))}
      {page?.kind === 'wiring' &&
        SHAPE_TOOLS.map((t) => <IconButton key={t.tool} icon={t.icon} label={tooltip(t.cmd)} active={tool === t.tool} onClick={() => runCommand(t.cmd)} />)}
      {page?.kind === 'wiring' && <IconButton icon={ImageIcon} label={tooltip('insert.image')} onClick={() => runCommand('insert.image')} />}
      <Sep />
      {favorites.map((v) => (
        <button
          key={v.key}
          type="button"
          title={`${v.label} platzieren`}
          aria-label={`${v.label} platzieren`}
          aria-pressed={tool === 'place' && placeKind === v.kind && placePoles === v.poles}
          onClick={() => {
            useToolStore.getState().startPlace(v.kind, v.poles)
            toast(`${v.label}: in den Plan klicken. Esc bricht ab.`)
          }}
          className="flex size-7 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-fg aria-pressed:bg-accent-soft aria-pressed:text-accent"
        >
          <SymbolGlyph kind={v.kind} poles={v.poles} className="size-5" />
        </button>
      ))}
      <IconButton icon={Plus} label={`${tooltip('insert.symbol')} – weitere Favoriten und alle Symbole`} onClick={() => runCommand('insert.symbol')} />
      <Sep />
      <IconButton icon={RotateCw} label={tooltip('edit.rotate')} disabled={!hasSel} onClick={() => runCommand('edit.rotate')} />
      <IconButton icon={Trash2} label={tooltip('edit.delete')} disabled={!hasSel} onClick={() => runCommand('edit.delete')} />
      <div className="flex-1" />
      <IconButton icon={Grid3x3} label={tooltip('view.grid')} active={showGrid} onClick={() => runCommand('view.grid')} />
      <IconButton icon={Magnet} label={tooltip('view.snap')} active={snap} onClick={() => runCommand('view.snap')} />
      <IconButton
        icon={wheelZoom ? MouseZoom : MouseScroll}
        label={`${wheelZoom ? 'Mausrad: Zoomen' : 'Mausrad: Scrollen'} – klicken zum Umschalten`}
        active={wheelZoom}
        onClick={() => runCommand('view.wheelMode')}
      />
      <Sep />
      <IconButton icon={ZoomOut} label={tooltip('view.zoomOut')} onClick={() => runCommand('view.zoomOut')} />
      <button type="button" title={tooltip('view.fitPage')} onClick={() => runCommand('view.fitPage')} className="h-6 w-12 rounded-md font-mono text-[11px] text-fg-2 tabular-nums hover:bg-hover hover:text-fg">
        {zoom ? `${Math.round(zoom * 100)}%` : '—'}
      </button>
      <IconButton icon={ZoomIn} label={tooltip('view.zoomIn')} onClick={() => runCommand('view.zoomIn')} />
      <IconButton icon={Maximize} label={tooltip('view.fitPage')} onClick={() => runCommand('view.fitPage')} />
      </div>
      <Sep />
      <IconButton icon={PanelRight} label={tooltip('view.inspector')} active={panels.inspector} onClick={() => runCommand('view.inspector')} />
    </div>
  )
}
