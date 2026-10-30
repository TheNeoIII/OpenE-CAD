import { useRef, useState, type ReactNode } from 'react'
import { Inspector } from '@/features/schematic/components/Inspector'
import { Navigator } from '@/features/schematic/components/Navigator'
import { SchematicCanvas } from '@/features/schematic/components/SchematicCanvas'
import { SchematicToolbar } from '@/features/schematic/components/SchematicToolbar'
import { WiringCanvas } from '@/features/wiring/components/WiringCanvas'
import { WiringToolbar } from '@/features/wiring/components/WiringToolbar'
import { PortManager } from '@/features/wiring/components/PortManager'
import { useActivePage } from '@/stores/documentStore'
import { useUiStore } from '@/stores/uiStore'

/** Pinned: panel takes layout space. Collapsed: a thin edge strip reveals the panel as an overlay while hovered. */
function EdgePanel({ side, pinned, children }: { side: 'left' | 'right'; pinned: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  if (pinned) return <>{children}</>
  const show = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 250)
  }
  return (
    <div className={`absolute inset-y-0 z-30 flex ${side === 'left' ? 'left-0' : 'right-0'}`} onMouseEnter={show} onMouseLeave={hide}>
      {open ? (
        <div className="flex h-full shadow-2xl shadow-black/50">{children}</div>
      ) : (
        <div aria-hidden className={`h-full w-2 bg-transparent transition-colors hover:bg-accent/30 ${side === 'left' ? 'border-l-2' : 'border-r-2'} border-line`} />
      )}
    </div>
  )
}

export function SchematicWorkspace() {
  const panels = useUiStore((s) => s.panels)
  const page = useActivePage()
  const wiring = page?.kind === 'wiring'
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      <EdgePanel side="left" pinned={panels.navigator}>
        <Navigator />
      </EdgePanel>
      <main className="flex min-w-0 flex-1 flex-col" aria-label={wiring ? 'Verkabelungsschema' : 'Stromlaufplan'}>
        {wiring ? <WiringToolbar /> : <SchematicToolbar />}
        <div className="relative flex min-h-0 flex-1">
          {!page ? <div className="p-6 text-[12px] text-muted">Keine Seite gewählt.</div> : wiring ? <WiringCanvas key={page.id} /> : <SchematicCanvas key={page.id} />}
        </div>
        {wiring && <PortManager key={page.id} />}
      </main>
      <EdgePanel side="right" pinned={panels.inspector}>
        <Inspector />
      </EdgePanel>
    </div>
  )
}
