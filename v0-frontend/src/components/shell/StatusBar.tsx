import { CircleAlert, AlertTriangle, Check, CheckCircle2 } from 'lucide-react'
import { backend } from '@/backend'
import buildVersion from '@/build-version.json'
import { runCommand } from '@/commands/registry'
import { findObject } from '@/features/schematic/models/geometry'
import { useActivePage, useDocumentStore } from '@/stores/documentStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TOOL_LABELS, useToolStore } from '@/stores/toolStore'
import { useUiStore } from '@/stores/uiStore'
import { useValidationStore } from '@/stores/validationStore'
import { useCursorStore, useViewportStore } from '@/stores/viewportStore'
import { UNITS_PER_MM } from '@/types/cad'
import { cn } from '@/utils/cn'
import { fmtTime } from '@/utils/format'

const mm = (v: number) => (v / UNITS_PER_MM).toFixed(1).replace('.', ',')

function Cursor() {
  const world = useCursorStore((s) => s.snapped ?? s.world)
  const snap = useCursorStore((s) => s.snap)
  const tool = useToolStore((s) => s.tool)
  const routeMode = useToolStore((s) => s.routeMode)
  const drawing = tool === 'wire' || tool === 'line'
  const electrical = snap && snap.kind !== 'grid' && snap.kind !== 'free'
  return (
    <span className="flex min-w-60 items-center gap-1.5 font-mono whitespace-nowrap tabular-nums" aria-live="off">
      <span>{world ? `X ${mm(world.x)}  Y ${mm(world.y)} mm` : 'X —  Y —'}</span>
      {drawing && snap && (
        <span className={cn('max-w-56 truncate font-sans', electrical ? 'text-ok' : snap.kind === 'free' ? 'text-warn' : 'text-fg-3')} title={snap.label}>
          {snap.label}
        </span>
      )}
      {tool === 'wire' && (
        <button type="button" onClick={() => runCommand('tool.routeMode')} title="Leitungsführung umschalten (Tab)" className="rounded-sm px-1 font-sans text-fg-2 hover:bg-hover">
          {routeMode === 'hv' ? 'H→V' : 'V→H'}
        </button>
      )}
    </span>
  )
}

function Item({ children, className, onClick, title }: { children: React.ReactNode; className?: string; onClick?: () => void; title?: string }) {
  const C = onClick ? 'button' : 'span'
  return (
    <C type={onClick ? 'button' : undefined} title={title} onClick={onClick} className={cn('flex h-full items-center gap-1.5 px-2', onClick && 'hover:bg-hover hover:text-fg', className)}>
      {children}
    </C>
  )
}

const OBJECT_LABELS: Record<string, string> = { wire: 'Leitung', text: 'Text', junction: 'Verbindungspunkt', potential: 'Potential', line: 'Linie' }

/** Name of the single selected object (BMK for devices), or null for multi-selection. */
function useSelectionLabel(): string | null {
  const page = useActivePage()
  const ids = useSelectionStore((s) => s.ids)
  const devices = useDocumentStore((s) => s.document?.devices)
  if (ids.length !== 1 || !page) return null
  const obj = findObject(page, ids[0])
  if (!obj) return null
  if (obj.type === 'symbol') {
    const dev = obj.deviceId ? devices?.find((d) => d.id === obj.deviceId) : undefined
    const bmk = dev?.bmk ? (dev.bmk.startsWith('-') ? dev.bmk : `-${dev.bmk}`) : 'Symbol'
    return obj.terminalNo ? `${bmk}:${obj.terminalNo}` : bmk
  }
  if (obj.type === 'text' && obj.style === 'xref') return `Querverweis ${obj.text}`
  return OBJECT_LABELS[obj.type] ?? null
}

function SchematicStatus() {
  const page = useActivePage()
  const zoom = useViewportStore((s) => (page ? s.byPage[page.id]?.zoom : undefined))
  const tool = useToolStore((s) => s.tool)
  const sel = useSelectionStore((s) => s.ids.length)
  const selLabel = useSelectionLabel()
  const grid = useSettingsStore((s) => s.gridSize)
  const showGrid = useSettingsStore((s) => s.showGrid)
  const snap = useSettingsStore((s) => s.snap)
  return (
    <>
      <Item>
        <Cursor />
      </Item>
      <Item className="font-mono tabular-nums" title="Zoom (100 % = Druckmaßstab)">
        {zoom ? `${Math.round(zoom * 100)} %` : '—'}
      </Item>
      <Item onClick={() => runCommand('view.grid')} title="Raster (G)" className={cn(!showGrid && 'line-through opacity-60')}>
        Raster {grid / UNITS_PER_MM} mm
      </Item>
      <Item onClick={() => runCommand('view.snap')} title="Fangen (Shift+S)" className={cn(snap ? 'text-fg-2' : 'opacity-60')}>
        Fangen {snap ? 'ein' : 'aus'}
      </Item>
      <Item>{TOOL_LABELS[tool]}</Item>
      {sel > 0 && <Item className="text-accent">{selLabel ? `${selLabel} ausgewählt` : `${sel} ausgewählt`}</Item>}
    </>
  )
}

export function StatusBar() {
  const ws = useUiStore((s) => s.workspace)
  const current = useProjectStore((s) => s.current)
  const dirty = useProjectStore((s) => s.dirty)
  const saving = useProjectStore((s) => s.saving)
  const savedAt = useProjectStore((s) => s.lastSavedAt)
  const results = useValidationStore((s) => s.results)
  const errors = results.filter((r) => r.severity === 'error').length
  const warnings = results.filter((r) => r.severity === 'warning').length
  const openChecks = () => {
    const ui = useUiStore.getState()
    ui.set({ inspectorTab: 'validation', panels: { ...ui.panels, inspector: true } })
    if (ui.workspace === 'project') ui.setWorkspace('schematic')
  }
  return (
    <footer className="flex h-6 shrink-0 items-stretch justify-between border-t border-line bg-panel text-[11px] text-muted">
      <div className="flex min-w-0 items-stretch">{ws === 'schematic' && current && <SchematicStatus />}</div>
      <div className="flex items-stretch">
        {current && (
          <Item onClick={openChecks} title="Prüfergebnisse anzeigen">
            {errors + warnings === 0 ? (
              <>
                <CheckCircle2 className="size-3 text-ok" aria-hidden /> Keine Befunde
              </>
            ) : (
              <>
                <CircleAlert className="size-3 text-error" aria-hidden />
                <span className="tabular-nums">{errors}</span>
                <AlertTriangle className="ml-1 size-3 text-warn" aria-hidden />
                <span className="tabular-nums">{warnings}</span>
              </>
            )}
          </Item>
        )}
        {current && (
          <Item className={cn('font-mono', saving ? 'text-muted' : dirty ? 'text-warn' : 'text-ok')} title={dirty ? 'Ungespeicherte Änderungen (Ctrl S)' : 'Alle Änderungen gespeichert'}>
            {saving ? (
              'speichert …'
            ) : dirty ? (
              <>
                <span className="size-1.5 rounded-full bg-warn" aria-hidden /> geändert
              </>
            ) : (
              <>
                <Check className="size-3" aria-hidden /> gespeichert{savedAt ? ` ${fmtTime(savedAt)}` : ''}
              </>
            )}
          </Item>
        )}
        <Item title="Aktive Backend-Implementierung">{backend.label}</Item>
        <Item title="Automatisch erhöhte Quellcode-/Build-Version">v0.1.{buildVersion.revision}</Item>
      </div>
    </footer>
  )
}
