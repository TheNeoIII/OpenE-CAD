import { Inspector } from '@/features/schematic/components/Inspector'
import { Navigator } from '@/features/schematic/components/Navigator'
import { SchematicCanvas } from '@/features/schematic/components/SchematicCanvas'
import { SchematicToolbar } from '@/features/schematic/components/SchematicToolbar'
import { useActivePage } from '@/stores/documentStore'
import { useUiStore } from '@/stores/uiStore'

export function SchematicWorkspace() {
  const panels = useUiStore((s) => s.panels)
  const page = useActivePage()
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {panels.navigator && <Navigator />}
      <main className="flex min-w-0 flex-1 flex-col" aria-label="Stromlaufplan">
        <SchematicToolbar />
        <div className="relative flex min-h-0 flex-1">{page ? <SchematicCanvas key={page.id} /> : <div className="p-6 text-[12px] text-muted">Keine Seite gewählt.</div>}</div>
      </main>
      {panels.inspector && <Inspector />}
    </div>
  )
}
