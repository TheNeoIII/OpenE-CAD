import { Hand, MousePointer2, PanelLeft, PanelRight, PenLine, Plus, RotateCw, Spline, Trash2, Type, type LucideIcon } from 'lucide-react'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton } from '@/components/ui/primitives'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore, type CadTool } from '@/stores/toolStore'
import { toast, useUiStore } from '@/stores/uiStore'
import { variantByKey, type SymbolVariant } from '../models/symbolLibrary'
import { useActivePage } from '@/stores/documentStore'
import { ViewControls } from '@/features/drawing/components/ViewControls'
import { SymbolGlyph } from './SymbolGlyph'

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
  const panels = useUiStore((s) => s.panels)
  const page = useActivePage()

  return (
    <div role="toolbar" aria-label="Stromlaufplan-Werkzeuge" className="flex h-9 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-2">
      <IconButton icon={PanelLeft} label={tooltip('view.navigator')} active={panels.navigator} onClick={() => runCommand('view.navigator')} />
      <Sep />
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
      {TOOLS.map((t) => (
        <IconButton key={t.tool} icon={t.icon} label={tooltip(t.cmd)} disabled={page?.kind !== 'schematic' && t.tool !== 'select' && t.tool !== 'pan'} active={tool === t.tool} onClick={() => runCommand(t.cmd)} />
      ))}
      <Sep />
      {favorites.map((v) => (
        <button
          key={v.key}
          type="button"
          title={`${v.label} platzieren`}
          aria-label={`${v.label} platzieren`}
          aria-pressed={tool === 'place' && placeKind === v.kind && placePoles === v.poles}
          disabled={page?.kind !== 'schematic'}
          onClick={() => {
            if (page?.kind !== 'schematic') return
            useToolStore.getState().startPlace(v.kind, v.poles)
            toast(`${v.label}: in den Plan klicken. Esc bricht ab.`)
          }}
          className="flex size-7 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-fg aria-pressed:bg-accent-soft aria-pressed:text-accent"
        >
          <SymbolGlyph kind={v.kind} poles={v.poles} className="size-5" />
        </button>
      ))}
      <IconButton icon={Plus} disabled={page?.kind !== 'schematic'} label={`${tooltip('insert.symbol')} – weitere Favoriten und alle Symbole`} onClick={() => runCommand('insert.symbol')} />
      <Sep />
      <IconButton icon={RotateCw} label={tooltip('edit.rotate')} disabled={!hasSel} onClick={() => runCommand('edit.rotate')} />
      <IconButton icon={Trash2} label={tooltip('edit.delete')} disabled={!hasSel} onClick={() => runCommand('edit.delete')} />
      <div className="flex-1" />
      <ViewControls />
      </div>
      <Sep />
      <IconButton icon={PanelRight} label={tooltip('view.inspector')} active={panels.inspector} onClick={() => runCommand('view.inspector')} />
    </div>
  )
}
