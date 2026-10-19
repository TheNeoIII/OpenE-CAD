import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

export const fieldCls = 'h-7 w-full rounded-md border border-line bg-app px-2 text-[12px] text-fg outline-none focus:border-accent'

export function TextField({ label, value, mono, onCommit }: { label: string; value: string; mono?: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted">
      {label}
      <input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); onCommit(e.target.value) }}
        onBlur={() => draft.trim() !== value && onCommit(draft.trim())}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setDraft(value)
        }}
        className={cn(fieldCls, mono && 'font-mono')}
      />
    </label>
  )
}

export function NumField({ label, value, step, onCommit }: { label: string; value: number; step?: number; onCommit: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(v)) onCommit(v)
        }}
        className={cn(fieldCls, 'tabular-nums')}
      />
    </label>
  )
}
