import { FolderOpen, Plus, X } from 'lucide-react'
import { runCommand } from '@/commands/registry'
import { openProjectName, useProjectStore } from '@/stores/projectStore'
import { cn } from '@/utils/cn'

/** One tab per open project; switching keeps each project's pages, undo history and unsaved changes. */
export function ProjectTabs() {
  const openIds = useProjectStore((s) => s.openIds)
  const currentId = useProjectStore((s) => s.current?.id)
  useProjectStore((s) => s.sessions)
  const currentDirty = useProjectStore((s) => s.dirty)
  const currentName = useProjectStore((s) => s.current?.name)
  if (!openIds.length) return null

  return (
    <div role="tablist" aria-label="Offene Projekte" className="flex h-8 shrink-0 items-stretch gap-px overflow-x-auto border-b border-line bg-app px-1">
      {openIds.map((id) => {
        const active = id === currentId
        const dirty = active ? currentDirty : useProjectStore.getState().isDirty(id)
        const name = active ? (currentName ?? '') : openProjectName(id)
        return (
          <div
            key={id}
            className={cn('group relative flex max-w-56 min-w-0 items-center gap-1 rounded-t-md pr-1 pl-2.5 text-[12px]', active ? 'bg-panel text-fg' : 'text-muted hover:bg-hover hover:text-fg')}
            onAuxClick={(e) => {
              if (e.button === 1) useProjectStore.getState().requestClose(id)
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              title={name}
              onClick={() => useProjectStore.getState().switchTo(id)}
              className="flex min-w-0 items-center gap-1.5 py-1 outline-none focus-visible:underline"
            >
              <FolderOpen className={cn('size-3.5 shrink-0', active ? 'text-accent' : 'text-muted')} aria-hidden />
              <span className="truncate">{name}</span>
              {dirty && <span className="size-1.5 shrink-0 rounded-full bg-warn" aria-label="Ungespeichert" />}
            </button>
            <button
              type="button"
              aria-label={`${name} schließen`}
              onClick={() => useProjectStore.getState().requestClose(id)}
              className="grid size-5 shrink-0 place-items-center rounded text-muted opacity-60 hover:bg-hover hover:text-fg group-hover:opacity-100"
            >
              <X className="size-3" aria-hidden />
            </button>
            {active && <span className="absolute inset-x-0 top-0 h-0.5 rounded-full bg-accent" aria-hidden />}
          </div>
        )
      })}
      <button type="button" aria-label="Weiteres Projekt öffnen" title="Weiteres Projekt öffnen" onClick={() => runCommand('file.open')} className="ml-1 grid w-7 place-items-center rounded text-muted hover:bg-hover hover:text-fg">
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
