import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Grid3x3, Magnet, Maximize, MoveVertical as MouseScroll, ScanSearch as MouseZoom, ZoomIn, ZoomOut } from 'lucide-react'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton } from '@/components/ui/primitives'
import { useActivePage } from '@/stores/documentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useViewportStore } from '@/stores/viewportStore'
import { cn } from '@/utils/cn'
import { formatMm, worldUnitsToMm } from '@/utils/units'
import { GRID_PRESETS, ZOOM_PRESETS, formatZoomPercent, parseGridMm, parseZoomPercent } from '../gridSettings'
import { fitPage, fitWidth, setZoom } from '../viewportActions'

function Sep() {
  return <div className="mx-1 h-4 w-px bg-line" aria-hidden />
}

const isImeEnter = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229

/**
 * Anchored popover portaled to <body> so toolbar overflow clipping cannot hide it.
 * Closes on outside pointerdown and Escape.
 */
function Popover({ open, onClose, label, children, className }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) return setPos(null)
    const place = () => {
      const anchor = anchorRef.current?.parentElement?.getBoundingClientRect()
      if (!anchor) return
      const width = ref.current?.offsetWidth ?? 0
      setPos({ left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)), top: anchor.bottom + 4 })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !anchorRef.current?.parentElement?.contains(target)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', key, true)
    }
  }, [open, onClose])
  return (
    <span ref={anchorRef} hidden>
      {open &&
        createPortal(
          <div
            ref={ref}
            role="dialog"
            aria-label={label}
            style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
            className={cn('fixed z-50 rounded-md border border-line bg-panel p-2 text-xs text-fg shadow-lg', className)}
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  )
}

function SizeChoice({ value, onPick, label }: { value: number; onPick: (units: number) => void; label: string }) {
  const [custom, setCustom] = useState('')
  const [error, setError] = useState(false)
  const isPreset = GRID_PRESETS.includes(value)
  const commit = () => {
    const units = parseGridMm(custom)
    if (units === null) return setError(true)
    setError(false)
    setCustom('')
    onPick(units)
  }
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={label}>
      <div className="text-[11px] text-fg-3">{label}</div>
      <div className="grid grid-cols-3 gap-1">
        {GRID_PRESETS.map((units) => (
          <button
            key={units}
            type="button"
            aria-pressed={value === units}
            onClick={() => onPick(units)}
            className={cn('h-6 rounded px-1 font-mono text-[11px] tabular-nums hover:bg-hover', value === units ? 'bg-accent/20 text-accent' : 'text-fg-2')}
          >
            {formatMm(units)}
          </button>
        ))}
      </div>
      <label className="mt-1 flex items-center gap-1 text-[11px] text-fg-3">
        <span className="shrink-0">Benutzerdefiniert</span>
        <input
          value={custom}
          inputMode="decimal"
          placeholder={isPreset ? 'mm' : String(worldUnitsToMm(value)).replace('.', ',')}
          aria-invalid={error}
          aria-label={`${label} in mm`}
          onChange={(e) => {
            setCustom(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isImeEnter(e)) {
              e.preventDefault()
              commit()
            }
          }}
          onBlur={() => custom && commit()}
          className={cn('h-6 w-16 rounded border bg-surface px-1 font-mono text-fg', error ? 'border-error' : 'border-line')}
        />
        <span>mm</span>
      </label>
      {error && <div className="text-[11px] text-error">0,1–100 mm in 0,1-mm-Schritten</div>}
    </div>
  )
}

function GridControl() {
  const [open, setOpen] = useState(false)
  const showGrid = useSettingsStore((s) => s.showGrid)
  const gridSize = useSettingsStore((s) => s.gridSize)
  const snapGridSize = useSettingsStore((s) => s.snapGridSize)
  const follows = useSettingsStore((s) => s.snapFollowsGrid)
  const { setGridSize, setSnapGridSize, setSnapFollowsGrid } = useSettingsStore.getState()
  return (
    <div className="relative flex items-center">
      <IconButton icon={Grid3x3} label={tooltip('view.grid')} active={showGrid} onClick={() => runCommand('view.grid')} />
      <button
        type="button"
        aria-label="Rastereinstellungen"
        aria-expanded={open}
        title={`Raster ${formatMm(gridSize)}${follows ? '' : ` · Fang ${formatMm(snapGridSize)}`}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-4 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
      >
        <ChevronDown className="size-3" aria-hidden />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} label="Rastereinstellungen" className="w-56">
        <div className="flex flex-col gap-3">
          <SizeChoice label="Rasterabstand" value={gridSize} onPick={setGridSize} />
          <label className="flex items-center gap-2 text-[11px] text-fg-2">
            <input type="checkbox" checked={follows} onChange={(e) => setSnapFollowsGrid(e.target.checked)} />
            Fangraster wie Anzeigeraster
          </label>
          {!follows && <SizeChoice label="Fangabstand" value={snapGridSize} onPick={setSnapGridSize} />}
        </div>
      </Popover>
    </div>
  )
}

function ZoomControl({ zoom }: { zoom: number | undefined }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const close = () => {
    setOpen(false)
    setError(false)
  }
  const apply = (value: number) => {
    setZoom(value)
    close()
  }
  const commit = () => {
    const value = parseZoomPercent(text)
    if (value === null) return setError(true)
    apply(value)
  }
  useEffect(() => {
    if (open) inputRef.current?.select()
  }, [open])
  return (
    <div className="relative">
      <button
        type="button"
        title="Zoom eingeben"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!zoom}
        onClick={() => {
          setText(zoom ? String(Math.round(zoom * 100)) : '100')
          setOpen((o) => !o)
        }}
        className="h-6 w-12 rounded-md font-mono text-[11px] text-fg-2 tabular-nums hover:bg-hover hover:text-fg"
      >
        {zoom ? `${Math.round(zoom * 100)}%` : '—'}
      </button>
      <Popover open={open} onClose={close} label="Zoom" className="w-44">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1 text-[11px] text-fg-3">
            <span className="sr-only">Zoom in Prozent</span>
            <input
              ref={inputRef}
              value={text}
              inputMode="decimal"
              aria-invalid={error}
              aria-label="Zoom in Prozent"
              onChange={(e) => {
                setText(e.target.value)
                setError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isImeEnter(e)) {
                  e.preventDefault()
                  commit()
                }
              }}
              className={cn('h-6 w-full rounded border bg-surface px-1 font-mono text-fg', error ? 'border-error' : 'border-line')}
            />
            <span>%</span>
          </label>
          {error && <div className="text-[11px] text-error">Zahl zwischen 8 und 800 eingeben</div>}
          <div className="grid grid-cols-3 gap-1">
            {ZOOM_PRESETS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => apply(z)}
                className={cn('h-6 rounded font-mono text-[11px] tabular-nums hover:bg-hover', zoom === z ? 'bg-accent/20 text-accent' : 'text-fg-2')}
              >
                {formatZoomPercent(z)}
              </button>
            ))}
          </div>
          <div className="flex flex-col border-t border-line pt-1">
            <button type="button" onClick={() => { fitPage(); close() }} className="h-6 rounded px-1 text-left text-fg-2 hover:bg-hover">
              Seite einpassen
            </button>
            <button type="button" onClick={() => { fitWidth(); close() }} className="h-6 rounded px-1 text-left text-fg-2 hover:bg-hover">
              Seitenbreite
            </button>
          </div>
        </div>
      </Popover>
    </div>
  )
}

/** Grid/snap/wheel toggles and zoom controls shared by every page editor toolbar. */
export function ViewControls() {
  const snap = useSettingsStore((s) => s.snap)
  const wheelZoom = useSettingsStore((s) => s.wheelMode === 'zoom')
  const page = useActivePage()
  const zoom = useViewportStore((s) => (page ? s.byPage[page.id]?.zoom : undefined))
  return (
    <>
      <GridControl />
      <IconButton icon={Magnet} label={tooltip('view.snap')} active={snap} onClick={() => runCommand('view.snap')} />
      <IconButton
        icon={wheelZoom ? MouseZoom : MouseScroll}
        label={`${wheelZoom ? 'Mausrad: Zoomen' : 'Mausrad: Scrollen'} – klicken zum Umschalten`}
        active={wheelZoom}
        onClick={() => runCommand('view.wheelMode')}
      />
      <Sep />
      <IconButton icon={ZoomOut} label={tooltip('view.zoomOut')} onClick={() => runCommand('view.zoomOut')} />
      <ZoomControl zoom={zoom} />
      <IconButton icon={ZoomIn} label={tooltip('view.zoomIn')} onClick={() => runCommand('view.zoomIn')} />
      <IconButton icon={Maximize} label={tooltip('view.fitPage')} onClick={() => runCommand('view.fitPage')} />
    </>
  )
}
