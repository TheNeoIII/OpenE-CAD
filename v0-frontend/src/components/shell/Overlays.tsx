import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MenuList } from '@/components/ui/MenuList'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed right-3 bottom-9 z-[60] flex flex-col items-end gap-1.5" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.tone === 'error' ? CircleAlert : t.tone === 'success' ? CheckCircle2 : Info
        return (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-md border border-line bg-panel py-1.5 pr-1.5 pl-2.5 text-[12px] text-fg shadow-lg shadow-black/20">
            <Icon className={cn('size-3.5 shrink-0', t.tone === 'error' ? 'text-error' : t.tone === 'success' ? 'text-ok' : 'text-accent')} aria-hidden />
            <span className="min-w-0 flex-1">{t.message}</span>
            <button type="button" aria-label="Meldung schließen" onClick={() => dismiss(t.id)} className="rounded-sm p-0.5 text-muted hover:bg-hover hover:text-fg">
              <X className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ContextMenuHost() {
  const menu = useUiStore((s) => s.contextMenu)
  const close = useUiStore((s) => s.closeContextMenu)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: Math.min(menu.x, window.innerWidth - r.width - 4), y: Math.min(menu.y, window.innerHeight - r.height - 4) })
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close()
    const onBlur = () => close()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onBlur)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onBlur)
    }
  }, [menu, close])

  if (!menu) return null
  return (
    <div ref={ref} className="fixed z-[55]" style={{ left: pos.x || menu.x, top: pos.y || menu.y }} onContextMenu={(e) => e.preventDefault()}>
      <MenuList items={menu.items} onClose={close} label="Kontextmenü" />
    </div>
  )
}
