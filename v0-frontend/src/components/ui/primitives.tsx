import { AlertTriangle, CircleAlert, Info, type LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import type { Severity } from '@/types/project'
import { cn } from '@/utils/cn'

type Variant = 'default' | 'primary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  default: 'bg-panel-2 border border-line text-fg hover:bg-hover hover:border-line-strong',
  primary: 'bg-accent text-accent-fg border border-transparent hover:brightness-110',
  ghost: 'border border-transparent text-fg-2 hover:bg-hover hover:text-fg',
  danger: 'bg-error text-white border border-transparent hover:brightness-110',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: LucideIcon
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'default', size = 'md', icon: Icon, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-2.5 text-[12px]',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  active?: boolean
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ icon: Icon, label, active, size = 'md', className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'size-6' : 'size-7',
        active && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
    </button>
  )
})

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('rounded-sm border border-line bg-panel-2 px-1 py-px font-mono text-[10.5px] text-muted', className)}>{children}</kbd>
}

export const inputClass =
  'h-7 w-full min-w-0 rounded-md border border-line bg-app px-2 text-[12px] text-fg outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }>(function Input({ className, mono, ...rest }, ref) {
  return <input ref={ref} className={cn(inputClass, mono && 'font-mono', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(inputClass, 'pr-6', className)} {...rest}>
      {children}
    </select>
  )
})

export function Field({ label, htmlFor, children, hint, className }: { label: string; htmlFor?: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-[11px] font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </div>
  )
}

export function Checkbox({ checked, onChange, label, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; id?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 text-[12px] text-fg-2', disabled && 'cursor-default opacity-50')}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-3.5 accent-[var(--accent)]" />
      {label}
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-app p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-[3px] px-2 font-medium whitespace-nowrap transition-colors',
            size === 'sm' ? 'h-5 text-[11px]' : 'h-6 text-[12px]',
            value === o.value ? 'bg-panel-2 text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn' | 'error' | 'ok'; className?: string }) {
  const tones = {
    neutral: 'bg-panel-2 text-fg-2 border-line',
    accent: 'bg-accent-soft text-accent border-transparent',
    warn: 'bg-warn-soft text-warn border-transparent',
    error: 'bg-error-soft text-error border-transparent',
    ok: 'bg-[color-mix(in_oklch,var(--ok)_14%,transparent)] text-ok border-transparent',
  }
  return <span className={cn('inline-flex h-[18px] items-center gap-1 rounded-sm border px-1.5 text-[10.5px] font-semibold tabular-nums', tones[tone], className)}>{children}</span>
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  if (severity === 'error') return <CircleAlert className={cn('size-3.5 shrink-0 text-error', className)} aria-label="Fehler" />
  if (severity === 'warning') return <AlertTriangle className={cn('size-3.5 shrink-0 text-warn', className)} aria-label="Warnung" />
  return <Info className={cn('size-3.5 shrink-0 text-accent', className)} aria-label="Hinweis" />
}

export function Tabs<T extends string>({ value, tabs, onChange, label, className }: { value: T; tabs: { value: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex h-8 shrink-0 items-stretch gap-0.5 overflow-x-auto border-b border-line px-1.5 [scrollbar-width:none]', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'relative flex items-center gap-1.5 px-2 text-[12px] font-medium whitespace-nowrap transition-colors',
            value === t.value ? 'text-fg after:absolute after:inset-x-1.5 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent' : 'text-muted hover:text-fg',
          )}
        >
          {t.label}
          {t.count != null && <span className="font-mono text-[10.5px] text-muted tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function PanelHeader({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-8 shrink-0 items-center justify-between gap-2 border-b border-line px-3', className)}>
      <h2 className="truncate text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children && <div className="flex items-center gap-0.5">{children}</div>}
    </div>
  )
}

export function Empty({ icon: Icon, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      {Icon && <Icon className="size-6 text-muted" aria-hidden />}
      <div className="text-[12.5px] font-medium text-fg-2">{title}</div>
      {children && <div className="max-w-xs text-[12px] text-muted">{children}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-accent', className)} aria-hidden />
}
