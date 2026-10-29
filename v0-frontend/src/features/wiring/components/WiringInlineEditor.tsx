import { useEffect, useRef, useState } from 'react'
import type { CadPage, CadViewportState } from '@/types/cad'
import { scaleOf, worldToScreen } from '@/features/drawing/viewport'
import { editAnchor, readEditValue, type InlineEditTarget } from '../models/inlineEdit'

/**
 * HTML overlay positioned in screen space above the SVG.
 * Escape/blur preserve the draft; Ctrl/Cmd+Enter finishes multiline edits.
 * History is written only when finishing a changed session.
 */
export function WiringInlineEditor({ page, view, target, onCommit, onCancel }: { page: CadPage; view: CadViewportState; target: InlineEditTarget; onCommit: (value: string) => void; onCancel: () => void }) {
  const initial = readEditValue(page, target) ?? ''
  const [value, setValue] = useState(initial)
  const done = useRef(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const s = scaleOf(view)
  const anchor = editAnchor(page, target, s)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  useEffect(() => {
    if (!anchor && !done.current) {
      done.current = true
      onCancel()
    }
  }, [anchor, onCancel])

  if (!anchor) return null
  const finish = (commit: boolean) => {
    if (done.current) return
    done.current = true
    if (commit) onCommit(value)
    else onCancel()
  }
  const multiline = target.kind === 'text' || target.kind === 'newText' || target.kind === 'label'
  const tl = worldToScreen(view, { x: anchor.box.x, y: anchor.box.y })
  const width = Math.max(80, anchor.box.w * s + 8)
  const extraWidth = width - (anchor.box.w * s + 8)
  const alignmentOffset = anchor.align === 'end' ? extraWidth : anchor.align === 'middle' ? extraWidth / 2 : 0
  const fontPx = anchor.size * s
  const rows = multiline ? Math.max(1, value.split('\n').length) : 1

  return (
    <textarea
      ref={ref}
      aria-label="Beschriftung bearbeiten"
      data-inline-editor
      value={value}
      rows={rows}
      spellCheck={false}
      onChange={(e) => setValue(multiline ? e.target.value : e.target.value.replace(/\n/g, ' '))}
      onBlur={() => finish(true)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Escape') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          finish(true)
        }
      }}
      className="absolute z-20 resize-none overflow-hidden rounded-sm border border-[var(--sheet-select)] bg-[var(--sheet-paper,white)] px-1 leading-tight text-[var(--sheet-ink)] shadow-md outline-none"
      style={{
        left: tl.x - 4 - alignmentOffset,
        top: tl.y - 2,
        width,
        fontSize: Math.max(10, fontPx),
        textAlign: anchor.align === 'middle' ? 'center' : anchor.align === 'end' ? 'right' : 'left',
        fontFamily: 'var(--font-sans)',
      }}
    />
  )
}
