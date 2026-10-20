import { useId } from 'react'
import type { CadDiagramBlock } from '@/types/cad'
import { LINE_DASH } from '@/features/drawing/styles'
import { shapeFill } from '../models/shapes'
import { BLOCK_FIELD_SIZE, BLOCK_PADDING, BLOCK_TITLE_SIZE, blockFieldBaseline, blockTitleBaseline } from '../models/inlineEdit'

/** `data-edit` / `data-field-id` tell the canvas exactly which text a double click hit. */
export function DiagramBlock({ block, selected, editing = false }: { block: CadDiagramBlock; selected: boolean; editing?: boolean }) {
  const clipId = useId()
  const x = block.x + BLOCK_PADDING
  return <g data-id={block.id}>
    <rect x={block.x} y={block.y} width={block.width} height={block.height} {...shapeFill(block)} stroke={selected ? 'var(--sheet-select)' : block.stroke} strokeWidth={block.strokeWidth} strokeDasharray={LINE_DASH[block.lineStyle]} />
    <defs><clipPath id={clipId}><rect x={block.x + 8} y={block.y + 8} width={Math.max(0, block.width - 16)} height={Math.max(0, block.height - 16)} /></clipPath></defs>
    <g clipPath={`url(#${clipId})`} fill="var(--sheet-ink)" opacity={editing ? 0.25 : 1}>
      <text data-edit="blockTitle" x={x} y={blockTitleBaseline(block.y)} fontSize={BLOCK_TITLE_SIZE} fontWeight={600}>{block.title}</text>
      {(block.fields ?? []).filter((f) => f.visible !== false).map((field, i) => (
        <text key={field.id} x={x} y={blockFieldBaseline(block.y, i)} fontSize={BLOCK_FIELD_SIZE}>
          {field.label && <tspan data-edit="fieldLabel" data-field-id={field.id}>{`${field.label}: `}</tspan>}
          <tspan data-edit="fieldValue" data-field-id={field.id}>{field.value || (field.label ? '' : ' ')}</tspan>
        </text>
      ))}
    </g>
  </g>
}
