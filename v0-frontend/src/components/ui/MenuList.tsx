import { Check, ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getCommand, isCommandEnabled, primaryShortcut } from '@/commands/registry'
import type { MenuEntry } from '@/stores/uiStore'
import { cn } from '@/utils/cn'

interface MenuListProps {
  items: MenuEntry[]
  onClose: () => void
  /** Called with ±1 when the user presses Left/Right on the top level (menubar switching). */
  onNavigate?: (dir: 1 | -1) => void
  className?: string
  label?: string
  autoFocus?: boolean
}

/** Keyboard-navigable menu. Entries reference commands; state (enabled/checked/shortcut) comes from the registry. */
export function MenuList({ items, onClose, onNavigate, className, label, autoFocus = true }: MenuListProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [openSub, setOpenSub] = useState<number | null>(null)

  useEffect(() => {
    if (autoFocus) ref.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')?.focus()
  }, [autoFocus])

  const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>(':scope > [role^="menuitem"]') ?? [])]

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = focusables()
    const i = list.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const d = e.key === 'ArrowDown' ? 1 : -1
      list[(i + d + list.length) % list.length]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'ArrowRight') {
      const idx = Number((document.activeElement as HTMLElement)?.dataset.sub ?? NaN)
      if (!Number.isNaN(idx)) {
        e.preventDefault()
        e.stopPropagation()
        setOpenSub(idx)
      } else if (onNavigate) {
        e.preventDefault()
        onNavigate(1)
      }
    } else if (e.key === 'ArrowLeft' && onNavigate) {
      e.preventDefault()
      onNavigate(-1)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      list[e.key === 'Home' ? 0 : list.length - 1]?.focus()
    }
  }

  return (
    <div ref={ref} role="menu" aria-label={label} onKeyDown={onKeyDown} className={cn('min-w-56 rounded-md border border-line bg-panel py-1 shadow-xl shadow-black/25', className)}>
      {items.map((item, i) => {
        if ('separator' in item) return <div key={`s${i}`} role="separator" className="my-1 h-px bg-line" />
        if ('submenu' in item)
          return (
            <SubmenuItem
              key={item.label}
              index={i}
              label={item.label}
              items={item.submenu}
              open={openSub === i}
              setOpen={(o) => setOpenSub(o ? i : null)}
              onClose={onClose}
            />
          )
        return <CommandItem key={item.command + (item.label ?? '')} entry={item} onClose={onClose} onHover={() => setOpenSub(null)} />
      })}
    </div>
  )
}

function CommandItem({ entry, onClose, onHover }: { entry: Extract<MenuEntry, { command: string }>; onClose: () => void; onHover: () => void }) {
  const cmd = getCommand(entry.command)
  if (!cmd) return null
  const enabled = isCommandEnabled(cmd, entry.args)
  const checked = cmd.isChecked?.()
  const Icon = cmd.icon
  const sc = primaryShortcut(cmd)
  const run = () => {
    if (!enabled) return
    onClose()
    void cmd.run(entry.args)
  }
  return (
    <div
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked}
      aria-disabled={!enabled}
      tabIndex={-1}
      onMouseEnter={(e) => {
        onHover()
        ;(e.currentTarget as HTMLElement).focus()
      }}
      onClick={run}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          run()
        }
      }}
      className={cn(
        'mx-1 flex h-7 cursor-default items-center gap-2 rounded-sm px-2 text-[12px] text-fg outline-none focus:bg-accent-soft',
        !enabled && 'text-muted opacity-60 focus:bg-hover',
      )}
    >
      <span className="flex w-4 justify-center">{checked ? <Check className="size-3.5 text-accent" /> : Icon ? <Icon className="size-3.5 text-fg-2" aria-hidden /> : null}</span>
      <span className="flex-1 truncate">{entry.label ?? cmd.label}</span>
      {cmd.future && <span className="rounded-sm bg-panel-2 px-1 text-[10px] text-muted">geplant</span>}
      {sc && <span className="font-mono text-[10.5px] text-muted">{sc}</span>}
    </div>
  )
}

function SubmenuItem({ index, label, items, open, setOpen, onClose }: { index: number; label: string; items: MenuEntry[]; open: boolean; setOpen: (o: boolean) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<'right' | 'left'>('right')
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setSide(r.right + 240 > window.innerWidth ? 'left' : 'right')
  }, [open])
  return (
    <div
      ref={ref}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      tabIndex={-1}
      data-sub={index}
      onMouseEnter={(e) => {
        setOpen(true)
        ;(e.currentTarget as HTMLElement).focus()
      }}
      onClick={() => setOpen(!open)}
      className="relative mx-1 flex h-7 cursor-default items-center gap-2 rounded-sm px-2 text-[12px] text-fg outline-none focus:bg-accent-soft"
    >
      <span className="w-4" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-3.5 text-muted" />
      {open && (
        <div className={cn('absolute -top-1 z-10', side === 'right' ? 'left-full' : 'right-full')} onKeyDown={(e) => e.key === 'ArrowLeft' && (e.stopPropagation(), setOpen(false), ref.current?.focus())}>
          <MenuList items={items} onClose={onClose} label={label} />
        </div>
      )}
    </div>
  )
}
