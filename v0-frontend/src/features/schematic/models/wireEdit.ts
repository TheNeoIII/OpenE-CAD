import type { CadObject, CadPage, CadWire, Point } from '@/types/cad'
import { uid } from '@/utils/format'
import { armsAt, inheritedPotential, needsJunction, splitWireAt } from './connectivity'
import { routeOrthogonal, samePoint, simplifyPolyline, symbolPins, translateObject } from './geometry'
import type { RouteMode } from './geometry'
import type { SnapResult } from './snap'

type End = 'start' | 'end'
type Axis = 'h' | 'v'

const MID_GRID = 25
const mid = (a: number, b: number) => Math.round((a + b) / 2 / MID_GRID) * MID_GRID

const strictlyBetween = (v: number, a: number, b: number) => v > Math.min(a, b) && v < Math.max(a, b)

/**
 * Whether a wire end is held in place when the wire (or one of its segments) is moved.
 * Pins, rails, other wires and branch points all pin the end; clamp points are only
 * moved explicitly via `moveJunctionPage`.
 */
type Anchor = { kind: 'none' } | { kind: 'fixed' }

function anchorAt(page: CadPage, p: Point, moving: Set<string>, selfId: string): Anchor {
  if (page.texts.some((t) => t.style === 'xref' && !moving.has(t.id) && samePoint(t.position, p))) return { kind: 'fixed' }
  for (const s of page.symbols) {
    if (moving.has(s.id)) continue
    if (symbolPins(s).some((pin) => samePoint(pin, p))) return { kind: 'fixed' }
  }
  for (const w of page.wires) {
    if (w.id === selfId || moving.has(w.id)) continue
    const pts = w.points
    for (let i = 0; i < pts.length; i++) {
      if (samePoint(pts[i], p)) return { kind: 'fixed' }
      const b = pts[i + 1]
      if (!b) continue
      const a = pts[i]
      if ((a.y === b.y && a.y === p.y && strictlyBetween(p.x, a.x, b.x)) || (a.x === b.x && a.x === p.x && strictlyBetween(p.y, a.y, b.y))) return { kind: 'fixed' }
    }
  }
  for (const r of page.potentials) {
    if (moving.has(r.id) || r.y !== p.y) continue
    if (p.x >= Math.min(r.x1, r.x2) && p.x <= Math.max(r.x1, r.x2)) return { kind: 'fixed' }
  }
  return { kind: 'none' }
}

/** The straight line a clamp point sits on and may slide along. */
export interface JunctionHost {
  axis: Axis
  min: number
  max: number
  /** Wire ends that form the host line itself (split wire) and move with the clamp point. */
  hosts: { wireId: string; end: End }[]
}

export function junctionHost(page: CadPage, p: Point): JunctionHost | null {
  for (const r of page.potentials) {
    if (r.y === p.y && strictlyBetween(p.x, r.x1, r.x2)) return { axis: 'h', min: Math.min(r.x1, r.x2), max: Math.max(r.x1, r.x2), hosts: [] }
  }
  const touching: { wire: CadWire; end: End }[] = []
  for (const w of page.wires) {
    const pts = w.points
    if (samePoint(pts[0], p)) touching.push({ wire: w, end: 'start' })
    else if (samePoint(pts[pts.length - 1], p)) touching.push({ wire: w, end: 'end' })
    else {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        if (a.y === b.y && a.y === p.y && strictlyBetween(p.x, a.x, b.x)) return { axis: 'h', min: Math.min(a.x, b.x), max: Math.max(a.x, b.x), hosts: [] }
        if (a.x === b.x && a.x === p.x && strictlyBetween(p.y, a.y, b.y)) return { axis: 'v', min: Math.min(a.y, b.y), max: Math.max(a.y, b.y), hosts: [] }
      }
    }
  }
  for (let i = 0; i < touching.length; i++) {
    for (let j = i + 1; j < touching.length; j++) {
      const pair = [touching[i], touching[j]]
      const nb = pair.map(({ wire, end }) => neighbour(wire.points, end))
      const hosts = pair.map((t) => ({ wireId: t.wire.id, end: t.end }))
      if (nb.every((n) => n.y === p.y) && strictlyBetween(p.x, nb[0].x, nb[1].x)) return { axis: 'h', min: Math.min(nb[0].x, nb[1].x), max: Math.max(nb[0].x, nb[1].x), hosts }
      if (nb.every((n) => n.x === p.x) && strictlyBetween(p.y, nb[0].y, nb[1].y)) return { axis: 'v', min: Math.min(nb[0].y, nb[1].y), max: Math.max(nb[0].y, nb[1].y), hosts }
    }
  }
  return null
}

/**
 * Slides a clamp point along the line it sits on. Branch wires follow: their first
 * leg is shifted sideways (or gets a jog when it is a single straight run to a pin).
 */
export function moveJunctionPage(page: CadPage, at: Point, delta: number): CadPage {
  const host = junctionHost(page, at)
  if (!host || delta === 0) return page
  const np = host.axis === 'h' ? { x: at.x + delta, y: at.y } : { x: at.x, y: at.y + delta }
  const v = host.axis === 'h' ? np.x : np.y
  if (v <= host.min || v >= host.max) return page
  const isHost = (id: string, end: End) => host.hosts.some((h) => h.wireId === id && h.end === end)
  const wires = page.wires.map((w) => {
    let pts = w.points
    for (const end of ['start', 'end'] as End[]) {
      if (!samePoint(endPoint(pts, end), at)) continue
      if (isHost(w.id, end)) {
        pts = setEnd(pts, end, np)
        continue
      }
      const n = neighbour(pts, end)
      const perpendicular = host.axis === 'h' ? n.x === at.x : n.y === at.y
      if (!perpendicular) pts = setEnd(pts, end, np)
      else if (pts.length > 2) {
        const out = pts.map((q) => ({ ...q }))
        const [ei, ni] = end === 'start' ? [0, 1] : [out.length - 1, out.length - 2]
        out[ei] = { ...np }
        out[ni] = host.axis === 'h' ? { x: out[ni].x + delta, y: out[ni].y } : { x: out[ni].x, y: out[ni].y + delta }
        pts = out
      } else pts = reconnect(pts, end, np)
    }
    return pts === w.points ? w : { ...w, points: simplifyPolyline(pts) }
  })
  const junctions = page.junctions.map((j) => (samePoint(j.position, at) ? { ...j, position: { ...np } } : j))
  return refreshJunctions({ ...page, wires, junctions })
}

export interface DetachedJunction {
  /** Page without the branch wires; a split host line is merged back into one wire. */
  page: CadPage
  branches: { wire: CadWire; end: End }[]
  host: JunctionHost | null
}

/**
 * Lifts the branch wires off a clamp point. Branches are all wires ending at the point
 * except the two halves of the line it sits on. Without such a line, every wire ending
 * there is a branch (the whole node moves).
 */
export function detachJunction(page: CadPage, at: Point): DetachedJunction {
  const host = junctionHost(page, at)
  const keeper = host ? null : pinKeeper(page, at)
  const isHost = (id: string, end: End) => !!host?.hosts.some((h) => h.wireId === id && h.end === end) || (keeper?.wireId === id && keeper.end === end)
  const branches: DetachedJunction['branches'] = []
  const rest: CadWire[] = []
  for (const w of page.wires) {
    const pts = w.points
    const end: End | null = samePoint(pts[0], at) ? 'start' : samePoint(pts[pts.length - 1], at) ? 'end' : null
    if (end && !isHost(w.id, end)) branches.push({ wire: w, end })
    else rest.push(w)
  }
  let next: CadPage = { ...page, wires: rest }
  if (host?.hosts.length === 2 && armsAt(next, at) === 2) next = mergeHalves(next, host.hosts, at)
  return { page: refreshJunctions(next), branches, host }
}

/**
 * A clamp point sitting on a device pin: the pin keeps the wire that leaves it in its
 * natural direction (e.g. straight up from terminal 13), so moving the clamp point only
 * takes the branch wires with it instead of tearing the device off its supply.
 */
function pinKeeper(page: CadPage, at: Point): { wireId: string; end: End } | null {
  let outward: Point | null = null
  for (const s of page.symbols) {
    const pin = symbolPins(s).find((q) => samePoint(q, at))
    if (!pin) continue
    const dx = pin.x - s.position.x
    const dy = pin.y - s.position.y
    outward = Math.abs(dy) >= Math.abs(dx) ? { x: 0, y: Math.sign(dy) } : { x: Math.sign(dx), y: 0 }
    break
  }
  if (!outward) return null
  const ending: { wireId: string; end: End; dir: Point }[] = []
  for (const w of page.wires) {
    const pts = w.points
    for (const end of ['start', 'end'] as End[]) {
      if (!samePoint(endPoint(pts, end), at)) continue
      const n = neighbour(pts, end)
      ending.push({ wireId: w.id, end, dir: { x: Math.sign(n.x - at.x), y: Math.sign(n.y - at.y) } })
    }
  }
  const straight = ending.find((e) => e.dir.x === outward!.x && e.dir.y === outward!.y)
  const pick = straight ?? ending[0]
  return pick ? { wireId: pick.wireId, end: pick.end } : null
}

function mergeHalves(page: CadPage, halves: { wireId: string; end: End }[], at: Point): CadPage {
  const [ha, hb] = halves
  const a = page.wires.find((w) => w.id === ha.wireId)
  const b = page.wires.find((w) => w.id === hb.wireId)
  if (!a || !b || a.id === b.id) return page
  const aPts = ha.end === 'end' ? a.points : [...a.points].reverse()
  const bPts = hb.end === 'start' ? b.points : [...b.points].reverse()
  if (!samePoint(aPts[aPts.length - 1], at) || !samePoint(bPts[0], at)) return page
  const merged = { ...a, points: simplifyPolyline([...aPts, ...bPts.slice(1)]) }
  return { ...page, wires: page.wires.filter((w) => w.id !== b.id).map((w) => (w.id === a.id ? merged : w)) }
}

/**
 * Moves a clamp point anywhere: onto another wire, rail, pin, wire end or free space.
 * The branch wires are detached, rerouted orthogonally to the target and reattached
 * (splitting the target wire for a T-connection). Their far ends stay where they are.
 * Staying on the original line keeps the gentler slide behaviour.
 */
export function relocateJunctionPage(page: CadPage, at: Point, target: SnapResult | null): CadPage {
  if (!target || samePoint(target.point, at)) return page
  const t = target.point
  const d = detachJunction(page, at)
  if (!d.branches.length) return page
  const h = d.host
  if (h) {
    const onHost = h.axis === 'h' ? t.y === at.y && t.x > h.min && t.x < h.max : t.x === at.x && t.y > h.min && t.y < h.max
    if (onHost) return moveJunctionPage(page, at, h.axis === 'h' ? t.x - at.x : t.y - at.y)
  }
  const ref = target.ref
  const wires = ref?.kind === 'wireSegment' ? d.page.wires.flatMap((w) => (w.id === ref.wireId ? splitWireAt(w, t) : [w])) : d.page.wires
  const potential = inheritedPotential(d.page, target)
  const moved: CadWire[] = []
  for (const { wire, end } of d.branches) {
    const pts = simplifyPolyline(reconnect(wire.points, end, t))
    if (pts.length < 2 || samePoint(pts[0], pts[pts.length - 1])) return page
    moved.push({ ...wire, points: pts, potential: potential ?? wire.potential })
  }
  return refreshJunctions({ ...d.page, wires: [...wires, ...moved] })
}

/** Forces the given end of an orthogonal polyline onto `target`, inserting a Z-jog if needed. */
export function reconnect(points: Point[], end: End, target: Point): Point[] {
  if (end === 'end') return reconnect([...points].reverse(), 'start', target).reverse()
  if (points.length < 2 || samePoint(points[0], target)) return points
  const [p0, p1] = points
  const rest = points.slice(1)
  const vertical = p0.x === p1.x && p0.y !== p1.y
  if (vertical) {
    if (target.x === p1.x) return [target, ...rest]
    const my = mid(target.y, p1.y)
    return [target, { x: target.x, y: my }, { x: p1.x, y: my }, ...rest]
  }
  if (target.y === p1.y) return [target, ...rest]
  const mx = mid(target.x, p1.x)
  return [target, { x: mx, y: target.y }, { x: mx, y: p1.y }, ...rest]
}

const axisOf = (a: Point, b: Point): Axis | null => (a.x === b.x && a.y !== b.y ? 'v' : a.y === b.y && a.x !== b.x ? 'h' : null)

function polylineCost(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y)
  let crossings = 0
  for (let i = 1; i < pts.length; i++) {
    for (let j = i + 2; j < pts.length; j++) {
      const [a, b, c, d] = [pts[i - 1], pts[i], pts[j - 1], pts[j]]
      const h1 = a.y === b.y
      const h2 = c.y === d.y
      if (h1 === h2) {
        const overlap = h1 ? a.y === c.y && Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) > Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) : a.x === c.x && Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) > Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
        if (overlap) crossings += 3
        continue
      }
      const [hs, vs] = h1 ? [[a, b], [c, d]] : [[c, d], [a, b]]
      const y = hs[0].y
      const x = vs[0].x
      if (x > Math.min(hs[0].x, hs[1].x) && x < Math.max(hs[0].x, hs[1].x) && y > Math.min(vs[0].y, vs[1].y) && y < Math.max(vs[0].y, vs[1].y)) crossings++
    }
  }
  return len + (pts.length - 2) * 30 + crossings * 400
}

/**
 * Moves one end of an orthogonal wire to `target` and picks the cleanest route:
 * interior vertices that would cause detours or loops are dropped, the wire still
 * leaves the pin in its original direction and the far end stays untouched.
 */
export function rerouteEnd(points: Point[], end: End, target: Point): Point[] {
  if (end === 'end') return rerouteEnd([...points].reverse(), 'start', target).reverse()
  if (points.length < 2 || samePoint(points[0], target)) return points
  const n = points.length
  const startAxis = axisOf(points[0], points[1])
  const endAxis = axisOf(points[n - 2], points[n - 1])
  const candidates: Point[][] = [simplifyPolyline(reconnect(points, 'start', target))]
  for (let k = 1; k < n; k++) {
    const rest = points.slice(k)
    for (const mode of ['vh', 'hv'] as RouteMode[]) candidates.push(simplifyPolyline([target, ...routeOrthogonal(target, rest[0], mode), ...rest.slice(1)]))
    if (startAxis && target.x !== rest[0].x && target.y !== rest[0].y) {
      const z =
        startAxis === 'v'
          ? [target, { x: target.x, y: mid(target.y, rest[0].y) }, { x: rest[0].x, y: mid(target.y, rest[0].y) }]
          : [target, { x: mid(target.x, rest[0].x), y: target.y }, { x: mid(target.x, rest[0].x), y: rest[0].y }]
      candidates.push(simplifyPolyline([...z, ...rest]))
    }
  }
  let best = candidates[0]
  let bestCost = Infinity
  for (const c of candidates) {
    if (c.length < 2 || samePoint(c[0], c[c.length - 1])) continue
    let cost = polylineCost(c)
    if (startAxis && axisOf(c[0], c[1]) !== startAxis) cost += 1000
    if (endAxis && axisOf(c[c.length - 2], c[c.length - 1]) !== endAxis) cost += 1000
    if (cost < bestCost) {
      best = c
      bestCost = cost
    }
  }
  return best
}

const endPoint = (pts: Point[], end: End) => (end === 'start' ? pts[0] : pts[pts.length - 1])
const neighbour = (pts: Point[], end: End) => (end === 'start' ? pts[1] : pts[pts.length - 2])

function setEnd(pts: Point[], end: End, p: Point): Point[] {
  const out = pts.map((q) => ({ ...q }))
  out[end === 'start' ? 0 : out.length - 1] = { ...p }
  return out
}

/** Removes stale junctions and adds missing ones at every wire end with three or more arms. */
export function refreshJunctions(page: CadPage): CadPage {
  // Existing clamp points survive as long as a conductor still ends there (e.g. a wire landing on a rail end).
  const wireEndAt = (p: Point) => page.wires.some((w) => samePoint(w.points[0], p) || samePoint(w.points[w.points.length - 1], p))
  const kept = page.junctions.filter((j) => needsJunction(page, j.position) || (wireEndAt(j.position) && armsAt(page, j.position) >= 2))
  const added: CadPage['junctions'] = []
  for (const w of page.wires) {
    for (const p of [w.points[0], w.points[w.points.length - 1]]) {
      if ([...kept, ...added].some((j) => samePoint(j.position, p))) continue
      if (needsJunction(page, p)) added.push({ id: uid('j'), type: 'junction', position: { ...p } })
    }
  }
  return { ...page, junctions: [...kept, ...added] }
}

function mapIds(p: CadPage, ids: Set<string>, fn: (o: CadObject) => CadObject): CadPage {
  const m = <T extends CadObject>(arr: T[]) => arr.map((o) => (ids.has(o.id) ? (fn(o) as T) : o))
  return { ...p, symbols: m(p.symbols), wires: m(p.wires), junctions: m(p.junctions), texts: m(p.texts), potentials: m(p.potentials), lines: m(p.lines) }
}

/**
 * Moves objects by (dx, dy) while keeping electrical connections intact:
 * - ends of moved wires stay on unmoved pins, rails and clamp points,
 * - unmoved wires attached to moved symbol pins are stretched to follow them.
 */
export function movePage(input: CadPage, ids: string[], dx: number, dy: number): CadPage {
  if (!ids.length || (dx === 0 && dy === 0)) return input
  const moving = new Set(ids)
  const movedPins: Point[] = [...input.symbols.filter((s) => moving.has(s.id)).flatMap((s) => symbolPins(s)), ...input.texts.filter((t) => t.style === 'xref' && moving.has(t.id)).map((t) => t.position)]
  // Wires that run *through* a moved pin are split there first, so their pieces can follow the device.
  const pinSplit = input.wires.flatMap((w) => (moving.has(w.id) ? [w] : movedPins.reduce<CadWire[]>((parts, pin) => parts.flatMap((x) => splitWireAt(x, pin)), [w])))
  // A wire that follows a moved pin is also split at every T-connection on it, so only the
  // piece next to the device is rerouted and branch wires stay attached to their clamp point.
  const touchesMovedPin = (w: CadWire) => movedPins.some((pin) => samePoint(pin, w.points[0]) || samePoint(pin, w.points[w.points.length - 1]))
  const ends = pinSplit.flatMap((w) => [w.points[0], w.points[w.points.length - 1]])
  const page: CadPage = {
    ...input,
    wires: pinSplit.flatMap((w) => (moving.has(w.id) || !touchesMovedPin(w) ? [w] : ends.reduce<CadWire[]>((parts, p) => parts.flatMap((x) => splitWireAt(x, p)), [w]))),
  }
  const movedRails = page.potentials.filter((r) => moving.has(r.id))
  /** Where an unmoved wire end has to go: onto the moved pin, or onto the moved rail at the same x (clamped to its new extent). */
  const followTarget = (p: Point): Point | null => {
    if (movedPins.some((pin) => samePoint(pin, p))) return { x: p.x + dx, y: p.y + dy }
    const rail = movedRails.find((r) => r.y === p.y && p.x >= Math.min(r.x1, r.x2) && p.x <= Math.max(r.x1, r.x2))
    if (!rail) return null
    const lo = Math.min(rail.x1, rail.x2) + dx
    const hi = Math.max(rail.x1, rail.x2) + dx
    return { x: Math.min(hi, Math.max(lo, p.x)), y: p.y + dy }
  }
  const wires = page.wires.map((w) => {
    const orig = w.points
    if (moving.has(w.id)) {
      let pts = orig.map((p) => ({ x: p.x + dx, y: p.y + dy }))
      for (const end of ['start', 'end'] as End[]) {
        const E = endPoint(orig, end)
        if (anchorAt(page, E, moving, w.id).kind === 'fixed') pts = rerouteEnd(pts, end, E)
      }
      return { ...w, points: simplifyPolyline(pts) }
    }
    const first = orig[0]
    const last = orig[orig.length - 1]
    const s = followTarget(first)
    const e = followTarget(last)
    if (!s && !e) return w
    const shiftedBy = (t: Point, p: Point) => t.x - p.x === dx && t.y - p.y === dy
    if (s && e && shiftedBy(s, first) && shiftedBy(e, last)) return translateObject(w, dx, dy)
    // A stub hanging off a moved pin with nothing at its far end simply travels with the device.
    const dangling = (end: End) => anchorAt(page, endPoint(orig, end), moving, w.id).kind === 'none'
    if ((s && !e && shiftedBy(s, first) && dangling('end')) || (e && !s && shiftedBy(e, last) && dangling('start'))) return translateObject(w, dx, dy)
    let pts = orig
    if (s) pts = rerouteEnd(pts, 'start', s)
    if (e) pts = rerouteEnd(pts, 'end', e)
    return { ...w, points: simplifyPolyline(pts) }
  })

  for (const t of input.texts.filter((t) => t.style === 'xref' && moving.has(t.id))) {
    const rail = input.potentials.find((r) => !moving.has(r.id) && r.y === t.position.y && t.position.x >= r.x1 && t.position.x <= r.x2)
    const alreadyWired = input.wires.some((w) => samePoint(w.points[0], t.position) || samePoint(w.points[w.points.length - 1], t.position))
    if (rail && !alreadyWired) {
      const target = { x: t.position.x + dx, y: t.position.y + dy }
      wires.push({ id: `xref-lead-${t.id}`, type: 'wire', points: simplifyPolyline([t.position, { x: target.x, y: t.position.y }, target]), potential: rail.name, color: rail.color ?? 'auto', crossSection: rail.crossSection ?? '' })
    }
  }
  const moved = mapIds({ ...page, wires: page.wires }, moving, (o) => (o.type === 'wire' ? o : translateObject(o, dx, dy)))
  const lines = moved.lines.map((line) => {
    if (moving.has(line.id)) return line
    let points = line.points
    for (const end of ['start', 'end'] as End[]) {
      const p = endPoint(line.points, end)
      if (input.texts.some((t) => t.style === 'xref' && moving.has(t.id) && samePoint(t.position, p))) points = rerouteEnd(points, end, { x: p.x + dx, y: p.y + dy })
    }
    return { ...line, points }
  })
  return refreshJunctions({ ...moved, wires, lines })
}

const MIN_RAIL = 50

/**
 * Range a rail end may be dragged to. The rail always keeps covering every wire end
 * and pin connected to it, so shortening it never tears off a conductor.
 */
export function railEndLimits(page: CadPage, railId: string, end: 'x1' | 'x2', sheetWidth: number): { min: number; max: number } | null {
  const r = page.potentials.find((p) => p.id === railId)
  if (!r) return null
  const lo = Math.min(r.x1, r.x2)
  const hi = Math.max(r.x1, r.x2)
  const onRail = (p: Point) => p.y === r.y && p.x >= lo && p.x <= hi
  const xs = [...page.wires.flatMap((w) => [w.points[0], w.points[w.points.length - 1]]), ...page.symbols.flatMap((s) => symbolPins(s))].filter(onRail).map((p) => p.x)
  const otherEnd = end === 'x1' ? r.x2 : r.x1
  if (end === 'x1') return { min: 0, max: Math.min(otherEnd - MIN_RAIL, ...xs) }
  return { min: Math.max(otherEnd + MIN_RAIL, ...xs), max: sheetWidth }
}

/**
 * Shifts one segment of a wire perpendicular to its direction by `delta`.
 * Neighbouring segments stretch; an anchored wire end gets a short stub
 * (or slides along its rail) so the connection is kept.
 */
export function moveSegmentPage(page: CadPage, wireId: string, index: number, delta: number): { page: CadPage; index: number } {
  const w = page.wires.find((x) => x.id === wireId)
  if (!w || delta === 0 || index < 0 || index >= w.points.length - 1) return { page, index }
  const orig = w.points
  const a0 = orig[index]
  const b0 = orig[index + 1]
  const horizontal = a0.y === b0.y
  const d = horizontal ? { x: 0, y: delta } : { x: delta, y: 0 }
  let pts = orig.map((p, i) => (i === index || i === index + 1 ? { x: p.x + d.x, y: p.y + d.y } : { ...p }))
  const self = new Set([wireId])
  const fixEnd = (end: End) => {
    const E = endPoint(orig, end)
    if (anchorAt(page, E, self, wireId).kind === 'none') return
    pts = end === 'start' ? [{ ...E }, ...pts] : [...pts, { ...E }]
  }
  if (index === 0) fixEnd('start')
  if (index + 1 === orig.length - 1) fixEnd('end')
  const clean = simplifyPolyline(pts)
  const wires = page.wires.map((x) => (x.id === wireId ? { ...x, points: clean } : x))
  const a1 = { x: a0.x + d.x, y: a0.y + d.y }
  const b1 = { x: b0.x + d.x, y: b0.y + d.y }
  const newIndex = Math.max(
    0,
    clean.findIndex((p, i) => {
      const q = clean[i + 1]
      if (!q) return false
      return horizontal ? p.y === a1.y && q.y === a1.y && Math.min(p.x, q.x) <= Math.min(a1.x, b1.x) && Math.max(p.x, q.x) >= Math.max(a1.x, b1.x) : p.x === a1.x && q.x === a1.x && Math.min(p.y, q.y) <= Math.min(a1.y, b1.y) && Math.max(p.y, q.y) >= Math.max(a1.y, b1.y)
    }),
  )
  return { page: refreshJunctions({ ...page, wires }), index: newIndex }
}

/**
 * Preferred first leg when starting a wire: leave a horizontal rail/wire vertically,
 * a vertical wire horizontally, and a pin in its natural direction, so the new wire
 * never runs back along the line it starts on.
 */
export function routeModeForSnap(page: CadPage, snap: SnapResult | null): RouteMode | null {
  const ref = snap?.ref
  if (!ref) return null
  if (ref.kind === 'potential') return 'vh'
  if (ref.kind === 'wireSegment') {
    const w = page.wires.find((x) => x.id === ref.wireId)
    const a = w?.points[ref.index]
    const b = w?.points[ref.index + 1]
    if (!a || !b) return null
    return a.y === b.y ? 'vh' : 'hv'
  }
  if (ref.kind === 'endpoint') {
    const w = page.wires.find((x) => x.id === ref.wireId)
    if (!w || w.points.length < 2) return null
    const pts = w.points
    const [e, n] = ref.end === 'start' ? [pts[0], pts[1]] : [pts[pts.length - 1], pts[pts.length - 2]]
    return e.y === n.y ? 'hv' : 'vh'
  }
  if (ref.kind === 'pin') {
    const s = page.symbols.find((x) => x.id === ref.symbolId)
    const pin = s && symbolPins(s).find((p) => p.pinId === ref.pinId)
    if (!s || !pin) return null
    return Math.abs(pin.y - s.position.y) >= Math.abs(pin.x - s.position.x) ? 'vh' : 'hv'
  }
  return null
}

/** Next leg continues perpendicular to the last drawn segment. */
export function routeModeAfter(points: Point[]): RouteMode | null {
  if (points.length < 2) return null
  const a = points[points.length - 2]
  const b = points[points.length - 1]
  if (a.y === b.y && a.x !== b.x) return 'vh'
  if (a.x === b.x && a.y !== b.y) return 'hv'
  return null
}
