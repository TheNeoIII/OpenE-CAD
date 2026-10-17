import type { CadJunction, CadPage, CadWire, Point } from '@/types/cad'
import { uid } from '@/utils/format'
import { samePoint, symbolPins } from './geometry'
import type { SnapResult } from './snap'

/** True if p lies strictly inside the orthogonal segment a–b (not on its ends). */
function strictlyInside(p: Point, a: Point, b: Point) {
  if (a.y === b.y && p.y === a.y) return p.x > Math.min(a.x, b.x) && p.x < Math.max(a.x, b.x)
  if (a.x === b.x && p.x === a.x) return p.y > Math.min(a.y, b.y) && p.y < Math.max(a.y, b.y)
  return false
}

/**
 * Number of electrical "arms" meeting at p.
 * A wire end contributes 1, a wire passing through (interior vertex or segment) contributes 2,
 * a symbol pin contributes 1. Only explicit topology counts – two wires that merely cross
 * each other in their interiors are NOT connected and produce no junction, because
 * junctions are only evaluated at points where a wire actually terminates.
 */
export function armsAt(page: CadPage, p: Point, extraWires: CadWire[] = []): number {
  let arms = 0
  for (const s of page.symbols) for (const pin of symbolPins(s)) if (samePoint(pin, p)) arms += 1
  for (const w of [...page.wires, ...extraWires]) {
    const pts = w.points
    if (samePoint(pts[0], p) || samePoint(pts[pts.length - 1], p)) {
      arms += 1
      continue
    }
    let through = false
    for (let i = 0; i < pts.length - 1 && !through; i++) {
      if ((i > 0 && samePoint(pts[i], p)) || strictlyInside(p, pts[i], pts[i + 1])) through = true
    }
    if (through) arms += 2
  }
  for (const r of page.potentials) {
    const a = { x: r.x1, y: r.y }
    const b = { x: r.x2, y: r.y }
    if (samePoint(a, p) || samePoint(b, p)) arms += 1
    else if (strictlyInside(p, a, b)) arms += 2
  }
  return arms
}

export const needsJunction = (page: CadPage, p: Point) => armsAt(page, p) >= 3

/** Splits a wire at an interior point so the T-connection becomes explicit topology. */
export function splitWireAt(w: CadWire, p: Point): CadWire[] {
  const pts = w.points
  for (let i = 0; i < pts.length - 1; i++) {
    if (i > 0 && samePoint(pts[i], p)) {
      return [
        { ...w, points: pts.slice(0, i + 1) },
        { ...w, id: uid('w'), points: pts.slice(i) },
      ]
    }
    if (strictlyInside(p, pts[i], pts[i + 1])) {
      return [
        { ...w, points: [...pts.slice(0, i + 1), { ...p }] },
        { ...w, id: uid('w'), points: [{ ...p }, ...pts.slice(i + 1)] },
      ]
    }
  }
  return [w]
}

/** Potential inherited from what the wire terminates on (wire or rail). */
export function inheritedPotential(page: CadPage, snap: SnapResult | null): string | null {
  const ref = snap?.ref
  if (!ref) return null
  if (ref.kind === 'wireSegment' || ref.kind === 'endpoint') return page.wires.find((w) => w.id === ref.wireId)?.potential ?? null
  if (ref.kind === 'potential') return page.potentials.find((r) => r.id === ref.potentialId)?.name ?? null
  return null
}

/**
 * Inserts an electrical wire into a page:
 * splits target wires at T-connections, inherits the potential, and creates junctions
 * exactly where three or more arms meet at one of the new wire's terminals.
 */
export function insertWire(page: CadPage, points: Point[], start: SnapResult | null, end: SnapResult | null): { page: CadPage; wire: CadWire; junctions: CadJunction[] } {
  let wires = page.wires
  for (const snap of [start, end]) {
    const ref = snap?.ref
    if (ref?.kind !== 'wireSegment') continue
    wires = wires.flatMap((w) => (w.id === ref.wireId ? splitWireAt(w, snap!.point) : [w]))
  }

  const potential = inheritedPotential(page, start) ?? inheritedPotential(page, end)
  const wire: CadWire = { id: uid('w'), type: 'wire', points, potential, color: 'auto', crossSection: '1,5 mm²' }
  const next: CadPage = { ...page, wires: [...wires, wire] }

  const created: CadJunction[] = []
  for (const p of [points[0], points[points.length - 1]]) {
    if (next.junctions.some((j) => samePoint(j.position, p)) || created.some((j) => samePoint(j.position, p))) continue
    if (needsJunction(next, p)) created.push({ id: uid('j'), type: 'junction', position: { ...p } })
  }
  return { page: { ...next, junctions: [...next.junctions, ...created] }, wire, junctions: created }
}

/** Removes junctions that no longer join three or more arms (e.g. after deleting a wire). */
export function pruneJunctions(page: CadPage): CadPage {
  const junctions = page.junctions.filter((j) => needsJunction(page, j.position))
  return junctions.length === page.junctions.length ? page : { ...page, junctions }
}
