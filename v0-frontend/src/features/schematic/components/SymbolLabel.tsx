interface SymbolLabelProps {
  rotated: boolean
  numberOnly: boolean
  /** Right edge of the label; the label sits left of the symbol. */
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

/** Device label left of a symbol. Rotating it never rotates the symbol graphic. */
export function SymbolLabel({ rotated, numberOnly, x, y, top, bmk, terminalNo, spec, fn, color }: SymbolLabelProps) {
  const head = terminalNo ? `${bmk}:${terminalNo}` : bmk

  if (numberOnly) {
    return (
      <text x={x + 8} y={y + 8} textAnchor="end" fontSize={22} fontWeight={700} fill={color} fontFamily="var(--font-mono)" pointerEvents="none">
        {terminalNo ?? bmk}
      </text>
    )
  }

  if (rotated) {
    return (
      <g transform={`translate(${x - 40} ${top - 10}) rotate(-90)`} pointerEvents="none">
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
    <g pointerEvents="none" textAnchor="end">
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
