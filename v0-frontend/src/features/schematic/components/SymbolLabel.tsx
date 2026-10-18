interface SymbolLabelProps {
  rotated: boolean
  numberOnly: boolean
  anchor?: 'start' | 'end'
  /** Label anchor in world coordinates. */
  x: number
  y: number
  top: number
  bmk: string
  terminalNo?: string
  /** Execution designation; multiple lines separated by "\n". */
  spec?: string
  fn?: string
  /** Manufacturer / article lines, shown once an article is assigned. */
  maker?: string[]
  color: string
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

type Line = { text: string; size: number; weight?: number; mono?: boolean; muted?: boolean; gap: number }

/** Device label at its per-instance anchor (ELCAD style: BMK, execution lines, function, manufacturer, article). */
export function SymbolLabel({ rotated, numberOnly, x, y, top, bmk, terminalNo, spec, fn, maker = [], color, anchor = 'end' }: SymbolLabelProps) {
  const head = terminalNo ? `${bmk}:${terminalNo}` : bmk

  if (numberOnly) {
    return (
      <text x={x + (anchor === 'end' ? 8 : -8)} y={y + 8} textAnchor={anchor} fontSize={22} fontWeight={700} fill={color} fontFamily="var(--font-mono)" pointerEvents="none">
        {terminalNo ?? bmk}
      </text>
    )
  }

  const scale = rotated ? 0.85 : 1
  const lines: Line[] = [
    ...(spec ? spec.split('\n').filter(Boolean).map((text) => ({ text, size: 22 * scale, weight: 600, mono: true, gap: 26 * scale })) : []),
    ...(fn ? [{ text: truncate(fn, rotated ? 28 : 24), size: 20 * scale, muted: true, gap: 25 * scale }] : []),
    ...maker.map((text) => ({ text: truncate(text, 26), size: 17 * scale, muted: true, gap: 22 * scale })),
  ]
  let dy = 0
  const body = lines.map((l, i) => {
    dy += l.gap
    return (
      <text key={i} x={0} y={dy} fontSize={l.size} fontWeight={l.weight} fill={l.muted ? 'var(--sheet-ink-2)' : color} fontFamily={l.mono ? 'var(--font-mono)' : undefined}>
        {l.text}
      </text>
    )
  })

  if (rotated) {
    return (
      <g transform={`translate(${x + (anchor === 'end' ? -40 : 0)} ${top - 10}) rotate(-90)`} pointerEvents="none">
        <text x={0} y={0} fontSize={26} fontWeight={700} fill={color}>
          {head}
        </text>
        {body}
      </g>
    )
  }

  return (
    <g pointerEvents="none" textAnchor={anchor} transform={`translate(${x} ${y - 4})`}>
      <text x={0} y={0} fontSize={30} fontWeight={700} fill={color}>
        {head}
      </text>
      {body}
    </g>
  )
}
