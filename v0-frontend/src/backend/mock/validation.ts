import { pointOnSegment, samePoint, symbolPins, wireSegments } from '@/features/schematic/models/geometry'
import type { CadDocument } from '@/types/cad'
import type { ValidationResult } from '@/types/project'

/** Frontend stand-in for the Rust rule engine. Pure and deterministic. */
export function validateDocument(doc: CadDocument): ValidationResult[] {
  const out: ValidationResult[] = []
  const deviceById = new Map(doc.devices.map((d) => [d.id, d]))
  const pageOfDevice = new Map<string, { pageId: string; symbolId: string }>()
  for (const p of doc.pages) for (const s of p.symbols) if (s.deviceId && !pageOfDevice.has(s.deviceId)) pageOfDevice.set(s.deviceId, { pageId: p.id, symbolId: s.id })

  // Duplicate identifiers
  const byBmk = new Map<string, string[]>()
  for (const d of doc.devices) byBmk.set(d.bmk, [...(byBmk.get(d.bmk) ?? []), d.id])
  for (const [bmk, ids] of byBmk) {
    if (ids.length < 2) continue
    for (const id of ids) {
      const loc = pageOfDevice.get(id)
      out.push({
        id: `dup-${id}`,
        severity: 'error',
        code: 'BMK-DUP',
        category: 'Stromlaufplan',
        message: `BMK ${bmk} ist doppelt vergeben`,
        detail: `${deviceById.get(id)?.function ?? ''} – ${ids.length} Betriebsmittel mit gleicher Kennzeichnung`,
        target: loc ? { kind: 'symbol', id: loc.symbolId, pageId: loc.pageId } : { kind: 'device', id },
      })
    }
  }

  // Missing article
  for (const d of doc.devices) {
    if (d.articleNo) continue
    const loc = pageOfDevice.get(d.id)
    out.push({
      id: `art-${d.id}`,
      severity: 'warning',
      code: 'ART-MISSING',
      category: 'Artikel',
      message: `${d.bmk} hat keinen Artikel`,
      detail: `${d.function} – Stückliste und Aufbau unvollständig`,
      target: loc ? { kind: 'symbol', id: loc.symbolId, pageId: loc.pageId } : { kind: 'device', id: d.id },
    })
  }

  for (const page of doc.pages) {
    if (page.kind !== 'schematic') continue
    const segs = page.wires.flatMap(wireSegments)

    // Unconnected pins
    for (const s of page.symbols) {
      for (const pin of symbolPins(s)) {
        const connected = segs.some((seg) => samePoint(seg.a, pin) || samePoint(seg.b, pin) || pointOnSegment(pin, seg.a, seg.b))
        if (connected) continue
        const bmk = s.deviceId ? deviceById.get(s.deviceId)?.bmk : '?'
        out.push({
          id: `pin-${s.id}-${pin.pinId}`,
          severity: 'warning',
          code: 'PIN-OPEN',
          category: 'Stromlaufplan',
          message: `Anschluss ${bmk}:${pin.pinId} nicht verbunden`,
          detail: `Seite ${page.number} · ${page.title}`,
          target: { kind: 'symbol', id: s.id, pageId: page.id },
        })
      }
    }

    // Potential conflicts: a tagged conductor touching a rail of another potential.
    for (const w of page.wires) {
      if (!w.potential) continue
      for (const end of [w.points[0], w.points[w.points.length - 1]]) {
        const rail = page.potentials.find((r) => r.name !== w.potential && pointOnSegment(end, { x: r.x1, y: r.y }, { x: r.x2, y: r.y }))
        if (!rail) continue
        out.push({
          id: `pot-${w.id}`,
          severity: 'error',
          code: 'POT-CONFLICT',
          category: 'Potential',
          message: `Potentialkonflikt ${w.potential} ↔ ${rail.name}`,
          detail: `Leitung auf Seite ${page.number} verbindet zwei Potentiale`,
          target: { kind: 'wire', id: w.id, pageId: page.id },
        })
        break
      }
    }
  }

  // Cabinet: overload and unplaced rail devices
  for (const cab of doc.cabinets) {
    for (let row = 0; row < cab.rows; row++) {
      const used = doc.devices.filter((d) => d.placement?.cabinetId === cab.id && d.placement.row === row).reduce((s, d) => s + d.widthTE, 0)
      if (used <= cab.rowCapacityTE) continue
      out.push({
        id: `row-${cab.id}-${row}`,
        severity: 'error',
        code: 'ROW-OVERLOAD',
        category: 'Aufbau',
        message: `${cab.name} Reihe ${row + 1} überbelegt`,
        detail: `${used.toLocaleString('de-DE')} von ${cab.rowCapacityTE} TE belegt`,
        target: { kind: 'cabinetRow', id: `${cab.id}:${row}`, cabinetId: cab.id },
      })
    }
  }
  for (const d of doc.devices) {
    if (d.mount !== 'rail' || d.placement) continue
    out.push({
      id: `place-${d.id}`,
      severity: 'info',
      code: 'NOT-PLACED',
      category: 'Aufbau',
      message: `${d.bmk} nicht im Aufbau platziert`,
      detail: `${d.function} · ${d.widthTE.toLocaleString('de-DE')} TE`,
      target: { kind: 'device', id: d.id },
    })
  }

  const order = { error: 0, warning: 1, info: 2 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}
