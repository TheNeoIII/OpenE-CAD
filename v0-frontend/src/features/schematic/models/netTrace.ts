import type { CadPage, CadPotential, CadWire, Point } from '@/types/cad'
import { symbolPins } from './geometry'

const TOL = 1

function onSegment(p: Point, a: Point, b: Point) {
  if (Math.abs(a.x - b.x) < TOL) return Math.abs(p.x - a.x) < TOL && p.y >= Math.min(a.y, b.y) - TOL && p.y <= Math.max(a.y, b.y) + TOL
  if (Math.abs(a.y - b.y) < TOL) return Math.abs(p.y - a.y) < TOL && p.x >= Math.min(a.x, b.x) - TOL && p.x <= Math.max(a.x, b.x) + TOL
  return false
}

const onWire = (p: Point, w: CadWire) => w.points.some((a, i) => i < w.points.length - 1 && onSegment(p, a, w.points[i + 1]))
const onRail = (p: Point, r: CadPotential) => onSegment(p, { x: r.x1, y: r.y }, { x: r.x2, y: r.y })
const ends = (w: CadWire) => [w.points[0], w.points[w.points.length - 1]]

/** Symbols that pass a conductor straight through (pin 1 ↔ pin 2). */
const PASS_THROUGH = new Set(['terminal'])

/**
 * Collects every wire and rail on the page that is galvanically connected to `startId`:
 * shared end points, T-junctions, rails and feed-through terminals. Switching devices break the net.
 */
export function connectedConductors(page: CadPage, startId: string): string[] {
  if (page.kind !== 'schematic') return []
  const wires = new Map(page.wires.map((w) => [w.id, w]))
  const rails = new Map(page.potentials.map((r) => [r.id, r]))
  if (!wires.has(startId) && !rails.has(startId)) return []

  const bridges: [Point, Point][] = []
  for (const s of page.symbols) {
    if (!PASS_THROUGH.has(s.kind)) continue
    const pins = symbolPins(s)
    if (pins.length >= 2) bridges.push([pins[0], pins[1]])
  }

  const touching = (p: Point) => {
    const out: string[] = []
    for (const w of page.wires) if (onWire(p, w)) out.push(w.id)
    for (const r of page.potentials) if (onRail(p, r)) out.push(r.id)
    return out
  }

  const seen = new Set<string>([startId])
  const queue = [startId]
  while (queue.length) {
    const id = queue.shift()!
    const w = wires.get(id)
    const r = rails.get(id)
    const probes: Point[] = []
    if (w) probes.push(...ends(w))
    for (const other of page.wires) {
      if (seen.has(other.id)) continue
      const [a, b] = ends(other)
      if ((w && (onWire(a, w) || onWire(b, w))) || (r && (onRail(a, r) || onRail(b, r)))) {
        seen.add(other.id)
        queue.push(other.id)
      }
    }
    for (const p of [...probes]) {
      for (const [a, b] of bridges) {
        if (Math.hypot(p.x - a.x, p.y - a.y) < TOL) probes.push(b)
        else if (Math.hypot(p.x - b.x, p.y - b.y) < TOL) probes.push(a)
      }
    }
    for (const p of probes) {
      for (const hit of touching(p)) {
        if (seen.has(hit)) continue
        seen.add(hit)
        queue.push(hit)
      }
    }
  }
  return [...seen]
}
