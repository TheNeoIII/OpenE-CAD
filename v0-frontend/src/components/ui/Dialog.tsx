import { X } from 'lucide-react'
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { IconButton } from './primitives'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  onSubmit?: () => void
  onClose?: () => void
  bodyClassName?: string
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

/** Modal with focus trap, Escape and Enter-to-submit (via form). */
export function Dialog({ title, description, children, footer, width = 'md', onSubmit, onClose, bodyClassName }: DialogProps) {
  const close = onClose ?? useUiStore.getState().closeDialog
  const ref = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('input, select, textarea') ?? el?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    return () => prev?.focus?.()
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[10vh] backdrop-blur-[1px]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onKeyDown={onKeyDown}
        onSubmit={submit}
        className={cn('flex max-h-[80vh] w-full flex-col rounded-lg border border-line bg-panel shadow-2xl shadow-black/30', widths[width])}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[13.5px] font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-[12px] text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton icon={X} label="Schließen" size="sm" onClick={close} />
        </header>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-3.5', bodyClassName)}>{children}</div>
        {footer && <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-2.5">{footer}</footer>}
      </form>
    </div>
  )
}
