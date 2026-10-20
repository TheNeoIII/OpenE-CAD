import { Circle, Hand, Image as ImageIcon, MousePointer2, PanelLeft, PanelRight, PenLine, Square, Trash2, Type, type LucideIcon } from 'lucide-react'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton } from '@/components/ui/primitives'
import { useSelectionStore } from '@/stores/selectionStore'
import { useToolStore, type CadTool } from '@/stores/toolStore'
import { useUiStore } from '@/stores/uiStore'
import { ViewControls } from '@/features/drawing/components/ViewControls'

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
  const panels = useUiStore((s) => s.panels)

  return (
    <div role="toolbar" aria-label="Verkabelungsschema-Werkzeuge" className="flex h-9 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-2">
      <IconButton icon={PanelLeft} label={tooltip('view.navigator')} active={panels.navigator} onClick={() => runCommand('view.navigator')} />
      <Sep />
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        {TOOLS.map((t) => (
          <IconButton key={t.tool} icon={t.icon} label={tooltip(t.cmd)} active={tool === t.tool} onClick={() => runCommand(t.cmd)} />
        ))}
        <IconButton icon={ImageIcon} label="Bild einfügen – Asset-Upload folgt über Rust API / STORAGE_PATH" disabled onClick={() => {}} />
        <Sep />
        <IconButton icon={Trash2} label={tooltip('edit.delete')} disabled={!hasSel} onClick={() => runCommand('edit.delete')} />
        <div className="flex-1" />
        <ViewControls />
      </div>
      <Sep />
      <IconButton icon={PanelRight} label={tooltip('view.inspector')} active={panels.inspector} onClick={() => runCommand('view.inspector')} />
    </div>
  )
}
