import { Grid3x3, Magnet, Maximize, MoveVertical as MouseScroll, ScanSearch as MouseZoom, ZoomIn, ZoomOut } from 'lucide-react'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton } from '@/components/ui/primitives'
import { useActivePage } from '@/stores/documentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useViewportStore } from '@/stores/viewportStore'

function Sep() {
  return <div className="mx-1 h-4 w-px bg-line" aria-hidden />
}

/** Grid/snap/wheel toggles and zoom controls shared by every page editor toolbar. */
export function ViewControls() {
  const showGrid = useSettingsStore((s) => s.showGrid)
  const snap = useSettingsStore((s) => s.snap)
  const wheelZoom = useSettingsStore((s) => s.wheelMode === 'zoom')
  const page = useActivePage()
  const zoom = useViewportStore((s) => (page ? s.byPage[page.id]?.zoom : undefined))
  return (
    <>
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
    </>
  )
}
