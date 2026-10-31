import { useState } from 'react'
import { beginPropertyEdit, endPropertyEdit } from '@/stores/documentStore'
import { Input } from './primitives'

const format = (v: number) => String(Math.round(v * 10) / 10)

/**
 * Number property with live preview: typing and spinner steps update the model immediately,
 * blur/Enter record one undo step, Escape restores the value from before the edit.
 * `mixed` shows an empty "gemischt" field until the user enters a value.
 */
export function LiveNumberInput({ id, value, onChange, min, max, step, mixed = false, label }: { id?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; mixed?: boolean; label?: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const finish = (keep: boolean) => {
    endPropertyEdit(keep)
    setDraft(null)
  }
  return (
    <Input
      id={id}
      aria-label={label}
      type="number"
      mono
      min={min}
      max={max}
      step={step}
      placeholder={mixed ? 'gemischt' : undefined}
      value={draft ?? (mixed ? '' : format(value))}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        const n = Number(text)
        if (text.trim() === '' || !Number.isFinite(n)) return
        beginPropertyEdit()
        onChange(n)
      }}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') finish(true)
        else if (e.key === 'Escape') {
          e.stopPropagation()
          finish(false)
        }
      }}
    />
  )
}
