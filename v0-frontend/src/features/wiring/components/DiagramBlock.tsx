import { useId } from 'react'
import type { CadDiagramBlock } from '@/types/cad'
import { LINE_DASH } from '@/features/drawing/styles'

export function DiagramBlock({ block, selected }: { block: CadDiagramBlock; selected: boolean }) {
  const clipId = useId()
  return <g data-id={block.id}>
    <rect x={block.x} y={block.y} width={block.width} height={block.height} fill={block.fill === 'none' ? 'transparent' : block.fill} stroke={selected ? 'var(--sheet-select)' : block.stroke} strokeWidth={block.strokeWidth} strokeDasharray={LINE_DASH[block.lineStyle]} />
    <defs><clipPath id={clipId}><rect x={block.x + 8} y={block.y + 8} width={Math.max(0, block.width - 16)} height={Math.max(0, block.height - 16)} /></clipPath></defs>
    <g clipPath={`url(#${clipId})`} fill="var(--sheet-ink)" pointerEvents="none">
      <text x={block.x + 16} y={block.y + 42} fontSize={30} fontWeight={600}>{block.title}</text>
      {(block.fields ?? []).filter((f) => f.visible !== false).map((field, i) => <text key={field.id} x={block.x + 16} y={block.y + 78 + i * 32} fontSize={24}>{field.label ? `${field.label}: ${field.value}` : field.value}</text>)}
    </g>
  </g>
}
