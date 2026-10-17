import { Moon, MoonStar, Redo2, Save, Search, ShieldCheck, Sun, Undo2 } from 'lucide-react'
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore'
import { useEffect, useRef, useState } from 'react'
import { MENUS } from '@/commands/menus'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton, Kbd } from '@/components/ui/primitives'
import { MenuList } from '@/components/ui/MenuList'
import { useHistoryStore } from '@/stores/historyStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore, type Workspace } from '@/stores/uiStore'
import { cn } from '@/utils/cn'

function Logo() {
  return (
    <div className="flex items-center gap-2 pr-2 pl-3">
      <svg viewBox="0 0 20 20" className="size-4 text-accent" aria-hidden>
        <path d="M3 4h6v4H3zM11 12h6v4h-6zM6 8v6h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <span className="text-[12.5px] font-semibold tracking-tight text-fg">OpenE-CAD</span>
    </div>
  )
}

export function MenuBar() {
  const [open, setOpen] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (open === null) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(null)
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const close = (refocus = false) => {
    const i = open
    setOpen(null)
    if (refocus && i !== null) buttons.current[i]?.focus()
  }

  return (
    <div ref={ref} role="menubar" aria-label="Hauptmenü" className="flex items-center">
      {MENUS.map((m, i) => (
        <div key={m.id} className="relative">
          <button
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === i}
            onMouseDown={(e) => {
              e.preventDefault()
              setOpen(open === i ? null : i)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setOpen(i)
              } else if (e.key === 'ArrowRight') buttons.current[(i + 1) % MENUS.length]?.focus()
              else if (e.key === 'ArrowLeft') buttons.current[(i - 1 + MENUS.length) % MENUS.length]?.focus()
            }}
            onMouseEnter={() => open !== null && open !== i && setOpen(i)}
            className={cn('h-6 rounded-sm px-2 text-[12px] text-fg-2 hover:bg-hover hover:text-fg', open === i && 'bg-hover text-fg')}
          >
            {m.label}
          </button>
          {open === i && (
            <div className="absolute top-full left-0 z-40 pt-1">
              <MenuList
                items={m.items}
                label={m.label}
                onClose={() => close(true)}
                onNavigate={(d) => {
                  const n = (i + d + MENUS.length) % MENUS.length
                  setOpen(n)
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const WORKSPACES: { id: Workspace; label: string; cmd: string; key: string }[] = [
  { id: 'project', label: 'Projekt', cmd: 'ws.project', key: '1' },
  { id: 'schematic', label: 'Stromlaufplan', cmd: 'ws.schematic', key: '2' },
  { id: 'cabinet', label: 'Aufbau', cmd: 'ws.cabinet', key: '3' },
  { id: 'data', label: 'Daten', cmd: 'ws.data', key: '4' },
  { id: 'documentation', label: 'Dokumentation', cmd: 'ws.documentation', key: '5' },
]

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Hell', icon: Sun },
  { id: 'dark', label: 'Dunkel', icon: Moon },
  { id: 'dark-canvas', label: 'Dunkel mit dunklem Zeichenblatt', icon: MoonStar },
]

function ThemeSwitch() {
  const theme = useSettingsStore((s) => s.theme)
  return (
    <div role="radiogroup" aria-label="Darstellung" className="ml-2 flex items-center gap-0.5 rounded-md border border-line bg-app p-0.5">
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          aria-label={label}
          title={label}
          onClick={() => useSettingsStore.getState().set('theme', id)}
          className={cn('grid size-6 place-items-center rounded text-muted hover:text-fg', theme === id && 'bg-panel text-fg shadow-sm ring-1 ring-line')}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  )
}

export function TitleBar() {
  const current = useProjectStore((s) => s.current)
  const saving = useProjectStore((s) => s.saving)
  const canUndo = useHistoryStore((s) => s.past.length > 0)
  const canRedo = useHistoryStore((s) => s.future.length > 0)
  return (
    <header className="flex h-9 shrink-0 items-center gap-1 border-b border-line bg-panel">
      <Logo />
      <MenuBar />
      <div className="flex min-w-0 flex-1 items-center justify-center px-3">
        {current && (
          <div className="flex min-w-0 items-center gap-2 text-[12px]">
            <span className="truncate font-medium text-fg">{current.name}</span>
            <span className="hidden font-mono text-[11px] text-muted lg:inline">{current.number}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5 pr-2">
        <IconButton icon={Undo2} label={tooltip('edit.undo')} disabled={!canUndo} onClick={() => runCommand('edit.undo')} />
        <IconButton icon={Redo2} label={tooltip('edit.redo')} disabled={!canRedo} onClick={() => runCommand('edit.redo')} />
        <IconButton icon={Save} label={tooltip('file.save')} disabled={!current || saving} onClick={() => runCommand('file.save')} />
        <IconButton icon={ShieldCheck} label={tooltip('check.run')} disabled={!current} onClick={() => runCommand('check.run')} />
        <button
          type="button"
          onClick={() => runCommand('help.palette')}
          className="ml-1 flex h-6 items-center gap-2 rounded-md border border-line bg-app px-2 text-[11.5px] text-muted hover:border-line-strong hover:text-fg"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Befehl, Gerät, Seite</span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <ThemeSwitch />
      </div>
    </header>
  )
}

export function WorkspaceTabs() {
  const ws = useUiStore((s) => s.workspace)
  const hasProject = useProjectStore((s) => !!s.current)
  return (
    <nav aria-label="Arbeitsbereiche" className="flex h-9 shrink-0 items-stretch gap-0.5 border-b border-line bg-panel px-2">
      {WORKSPACES.map((w) => {
        const disabled = w.id !== 'project' && !hasProject
        return (
          <button
            key={w.id}
            type="button"
            aria-current={ws === w.id ? 'page' : undefined}
            disabled={disabled}
            title={`${w.label} (Alt+${w.key})`}
            onClick={() => runCommand(w.cmd)}
            className={cn(
              'relative flex items-center gap-2 px-3 text-[12.5px] font-medium transition-colors disabled:opacity-40',
              ws === w.id ? 'text-fg after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent' : 'text-muted hover:text-fg',
            )}
          >
            {w.label}
            <span className="font-mono text-[10px] text-muted">{w.key}</span>
          </button>
        )
      })}
    </nav>
  )
}
