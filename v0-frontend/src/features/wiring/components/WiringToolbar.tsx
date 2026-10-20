import { Circle, Grid3x3, Hand, Image as ImageIcon, Magnet, Maximize, MousePointer2, PanelLeft, PanelRight, PenLine, Square, Trash2, Type, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton } from '@/components/ui/primitives'
import { useActivePage } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore, type CadTool } from '@/stores/toolStore'
import { useUiStore } from '@/stores/uiStore'
import { useViewportStore } from '@/stores/viewportStore'

const TOOLS: { tool: CadTool; cmd: string; icon: LucideIcon }[] = [
  { tool: 'select', cmd: 'tool.select', icon: MousePointer2 },
  { tool: 'pan', cmd: 'tool.pan', icon: Hand },
  { tool: 'line', cmd: 'tool.line', icon: PenLine },
  { tool: 'text', cmd: 'tool.text', icon: Type },
  { tool: 'rect', cmd: 'tool.rect', icon: Square },
  { tool: 'ellipse', cmd: 'tool.ellipse', icon: Circle },
]

function Sep() {
  return <div className="mx-1 h-4 w-px bg-line" aria-hidden />
}

/** Toolbar of the graphic wiring editor – no conductors, rails or symbol placement. */
export function WiringToolbar() {
  const tool = useToolStore((s) => s.tool)
  const hasSel = useSelectionStore((s) => s.ids.length > 0)
  const showGrid = useSettingsStore((s) => s.showGrid)
  const snap = useSettingsStore((s) => s.snap)
  const panels = useUiStore((s) => s.panels)
  const page = useActivePage()
  const zoom = useViewportStore((s) => (page ? s.byPage[page.id]?.zoom : undefined))

  return (
    <div role="toolbar" aria-label="Verkabelungsschema-Werkzeuge" className="flex h-9 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-2">
      <IconButton icon={PanelLeft} label={tooltip('view.navigator')} active={panels.navigator} onClick={() => runCommand('view.navigator')} />
      <Sep />
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        {TOOLS.map((t) => (
          <IconButton key={t.tool} icon={t.icon} label={tooltip(t.cmd)} active={tool === t.tool} onClick={() => runCommand(t.cmd)} />
        ))}
        <IconButton icon={ImageIcon} label="Bild einfügen – folgt mit der Asset-Ablage (Upload über die Server-API)" disabled onClick={() => {}} />
        <Sep />
        <IconButton icon={Trash2} label={tooltip('edit.delete')} disabled={!hasSel} onClick={() => runCommand('edit.delete')} />
        <div className="flex-1" />
        <IconButton icon={Grid3x3} label={tooltip('view.grid')} active={showGrid} onClick={() => runCommand('view.grid')} />
        <IconButton icon={Magnet} label={tooltip('view.snap')} active={snap} onClick={() => runCommand('view.snap')} />
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
