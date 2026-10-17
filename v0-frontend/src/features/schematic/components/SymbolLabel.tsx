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
  spec?: string
  fn?: string
  color: string
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Device label at its per-instance anchor. Rotating it never rotates the symbol graphic. */
export function SymbolLabel({ rotated, numberOnly, x, y, top, bmk, terminalNo, spec, fn, color, anchor = 'end' }: SymbolLabelProps) {
  const head = terminalNo ? `${bmk}:${terminalNo}` : bmk

  if (numberOnly) {
    return (
      <text x={x + (anchor === 'end' ? 8 : -8)} y={y + 8} textAnchor={anchor} fontSize={22} fontWeight={700} fill={color} fontFamily="var(--font-mono)" pointerEvents="none">
        {terminalNo ?? bmk}
      </text>
    )
  }

  if (rotated) {
    return (
      <g transform={`translate(${x + (anchor === 'end' ? -40 : 0)} ${top - 10}) rotate(-90)`} pointerEvents="none">
        <text x={0} y={0} fontSize={26} fontWeight={700} fill={color}>
          {head}
        </text>
        {spec && (
          <text x={0} y={22} fontSize={18} fontWeight={600} fill={color} fontFamily="var(--font-mono)">
            {spec}
          </text>
        )}
        {fn && (
          <text x={0} y={spec ? 44 : 24} fontSize={18} fill="var(--sheet-ink-2)">
            {truncate(fn, 28)}
          </text>
        )}
      </g>
    )
  }

  return (
    <g pointerEvents="none" textAnchor={anchor}>
      <text x={x} y={y - 4} fontSize={30} fontWeight={700} fill={color}>
        {head}
      </text>
      {spec && (
        <text x={x} y={y + 24} fontSize={20} fontWeight={600} fill={color} fontFamily="var(--font-mono)">
          {spec}
        </text>
      )}
      {fn && (
        <text x={x} y={y + (spec ? 50 : 28)} fontSize={20} fill="var(--sheet-ink-2)">
          {truncate(fn, 22)}
        </text>
      )}
    </g>
  )
}
