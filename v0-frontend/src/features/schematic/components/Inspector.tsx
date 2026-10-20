import { Link2, MousePointerClick, RefreshCw, ShieldCheck, Waypoints } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { runCommand } from '@/commands/registry'
import { Badge, Button, Empty, Field, Input, Segmented, Select, SeverityIcon, Spinner, Tabs } from '@/components/ui/primitives'
import { goToResult } from '@/features/validation/navigate'
import { useDocumentStore, useActivePage } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore, type InspectorTab } from '@/stores/uiStore'
import { issuesForTarget, useValidationStore } from '@/stores/validationStore'
import type { CadObject, CadPage, CadPotential, CadWire, LineStyle, Rotation, SymbolKind, WireColor, WireWeight } from '@/types/cad'
import { detachRailReferences } from '../actions'
import { findObject as findPageObject } from '../models/geometry'
import { LineProperties, WiringProperties } from '@/features/wiring/components/WiringProperties'
import { CHARACTERISTICS, executionKind, executionType, FUSE_CLASSES, terminalCrossSection } from '../models/execution'
import { outletPinNames } from '../models/symbolLibrary'
import { LINE_STYLE_LABELS, potentialDefsOf, presetPatch, presetsOf, styleResolver, WIRE_COLOR_LABELS, WIRE_WEIGHT_LABELS } from '../models/wireStyles'
import { connectedConductors } from '../models/netTrace'
import { WireSwatch } from './WireSwatch'
import { MultiProperties } from './MultiProperties'
import { symbolLabelPosition } from '../models/labels'
import { CONDUCTOR_LABEL_POSITIONS, conductorLabelPosPatch } from '../models/conductorLabels'
import type { ConductorLabelPos } from '@/types/cad'
import { xrefTip } from './SheetFrame'
import { xrefDisplay } from '../models/xref'
import type { Device } from '@/types/device'

function railTips(obj: CadWire | CadPotential, page: CadPage) {
  if (obj.type !== 'potential') return undefined
  return { left: obj.xrefLeft ? xrefTip('left', obj.x1, page) : obj.x1, right: obj.xrefRight ? xrefTip('right', obj.x2, page) : obj.x2 }
}
import { cn } from '@/utils/cn'
import { fmtTime } from '@/utils/format'
import { applyStyleToConnected, updateDevice, updateObject } from '../actions'

const CUSTOM = '__custom__'

/** Potential picker backed by the project's potential definitions; free entry stays possible for one-off potentials. */
function PotentialSelect({ obj }: { obj: CadWire | CadPotential }) {
  const doc = useDocumentStore((s) => s.document)
  const defs = potentialDefsOf(doc)
  const current = obj.type === 'wire' ? obj.potential ?? '' : obj.name
  const known = current === '' || defs.some((d) => d.name === current)
  const [custom, setCustom] = useState(!known)
  useEffect(() => setCustom(!known), [obj.id, known])
  const commit = (v: string) => updateObject(obj.id, obj.type === 'wire' ? { potential: v || null } : { name: v || obj.name }, 'Potential geändert')
  return (
    <Field label="Potential" htmlFor="i-pot">
      {custom ? (
        <div className="flex gap-1">
          <CommitInput id="i-pot" mono value={current} onCommit={commit} />
          <button type="button" className="shrink-0 rounded px-1.5 text-[11px] text-accent hover:bg-hover" onClick={() => setCustom(false)} aria-label="Potential aus Liste wählen">
            Liste
          </button>
        </div>
      ) : (
        <Select
          id="i-pot"
          className="font-mono"
          value={current}
          onChange={(e) => {
            if (e.target.value === CUSTOM) return setCustom(true)
            commit(e.target.value)
          }}
        >
          {obj.type === 'wire' && <option value="">— kein —</option>}
          {defs.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
              {d.description ? ` · ${d.description}` : ''}
            </option>
          ))}
          <option value={CUSTOM}>Eigenes Potential…</option>
        </Select>
      )}
    </Field>
  )
}

function ApplyConnected({ id }: { id: string }) {
  const page = useActivePage()
  const count = useMemo(() => (page ? connectedConductors(page, id).length - 1 : 0), [page, id])
  const [done, setDone] = useState<number | null>(null)
  useEffect(() => setDone(null), [id])
  return (
    <div className="col-span-2 flex flex-col gap-1 pt-1">
      <Button
        type="button"
        disabled={count <= 0}
        onClick={() => setDone(applyStyleToConnected(id))}
        title="Überträgt Farbe, Linienart, Stärke und Vorlage auf alle Leiter, die über Verbindungspunkte, Schienen oder Klemmen verbunden sind."
      >
        <Waypoints className="size-3.5" aria-hidden />
        Auf alle verbundenen Leiter anwenden
      </Button>
      <p className="text-[11px] text-muted" aria-live="polite">
        {done != null ? `${done} Leiter aktualisiert.` : count > 0 ? `${count} verbundene Leiter gefunden (inkl. über Klemmen).` : 'Keine weiteren verbundenen Leiter.'}
      </p>
    </div>
  )
}

function findObject(page: CadPage, id: string): CadObject | undefined {
  return findPageObject(page, id)
}

/** Text field that commits on blur/Enter so history gets one entry per edit. */
function CommitInput({ id, value, onCommit, mono, type = 'text', placeholder }: { id: string; value: string; onCommit: (v: string) => void; mono?: boolean; type?: string; placeholder?: string }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => draft !== value && onCommit(draft)
  return (
  <Input
  id={id}
  type={type}
  placeholder={placeholder}
      mono={mono}
      value={draft}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        if (type === 'number' && next.trim() !== '' && Number.isFinite(Number(next))) onCommit(next)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(value)
      }}
    />
  )
}

/** Multiline variant: Enter adds a line, Ctrl/Cmd+Enter or blur commits. */
function CommitTextarea({ id, value, onCommit }: { id: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => draft !== value && onCommit(draft.replace(/\s+$/, ''))
  return (
    <textarea
      id={id}
      rows={Math.min(6, Math.max(2, draft.split('\n').length))}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (e.preventDefault(), commit())
        if (e.key === 'Escape') setDraft(value)
      }}
      className="w-full resize-y rounded-md border border-line bg-app px-2 py-1.5 text-[12px] leading-snug text-fg outline-none focus:border-accent"
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  )
}

function ExecutionFields({ device, kind, poles }: { device: Device; kind: SymbolKind; poles: number }) {
  const ek = executionKind(kind)
  if (!ek) return null
  const up = (patch: Partial<Device>) => updateDevice(device.id, patch, 'Ausführung geändert')
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'))
    return v.trim() === '' || !Number.isFinite(n) ? null : n
  }
  const current = device.nominalCurrent ?? device.ratedCurrent
  const result = executionType(device, kind, poles)
  return (
    <Section title="Ausführung">
      {(ek === 'breaker' || ek === 'rcbo') && (
        <Field label="Charakteristik" htmlFor="i-char">
          <Select id="i-char" value={device.characteristic ?? ''} onChange={(e) => up({ characteristic: e.target.value || undefined })}>
            <option value="">—</option>
            {CHARACTERISTICS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {ek === 'fuse' && (
        <Field label="Betriebsklasse" htmlFor="i-fcl">
          <Select id="i-fcl" value={device.characteristic ?? 'gG'} onChange={(e) => up({ characteristic: e.target.value })}>
            {FUSE_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {(ek === 'breaker' || ek === 'rcd' || ek === 'rcbo' || ek === 'fuse') && (
        <Field label="Nennstrom (A)" htmlFor="i-in">
          <CommitInput id="i-in" mono value={current != null ? String(current) : ''} onCommit={(v) => up({ nominalCurrent: num(v) })} />
        </Field>
      )}
      {(ek === 'rcd' || ek === 'rcbo') && (
        <>
          <Field label="Fehlerstrom (mA)" htmlFor="i-idn">
            <CommitInput id="i-idn" mono value={device.residualCurrent != null ? String(device.residualCurrent) : ''} onCommit={(v) => up({ residualCurrent: num(v) })} />
          </Field>
          <Field label="Typ" htmlFor="i-rtype">
            <CommitInput id="i-rtype" mono placeholder="z. B. A, F, B, XG-A" value={device.rcdType ?? ''} onCommit={(v) => up({ rcdType: v.trim() || undefined })} />
          </Field>
        </>
      )}
      {(ek === 'breaker' || ek === 'rcbo') && (
        <Field label="Kurzschlussstrom (kA)" htmlFor="i-icn">
          <CommitInput id="i-icn" mono value={device.breakingCapacity != null ? String(device.breakingCapacity).replace('.', ',') : ''} onCommit={(v) => up({ breakingCapacity: num(v) })} />
        </Field>
      )}
      {ek === 'terminal' && (
        <Field label="Querschnitt" htmlFor="i-tcs">
          <CommitInput id="i-tcs" mono value={device.crossSection ?? ''} onCommit={(v) => up({ crossSection: v || undefined })} />
          {!device.crossSection && terminalCrossSection(device) && <span className="text-[10.5px] text-muted">aus Artikel: {terminalCrossSection(device)}</span>}
        </Field>
      )}
      {ek === 'coil' && (
        <Field label="Spulenspannung" htmlFor="i-uc">
          <CommitInput id="i-uc" mono value={device.coilVoltage} onCommit={(v) => up({ coilVoltage: v })} />
        </Field>
      )}
      {ek === 'motor' && (
        <Field label="Leistung (kW)" htmlFor="i-pw">
          <CommitInput id="i-pw" mono value={device.ac3Power != null ? String(device.ac3Power) : ''} onCommit={(v) => up({ ac3Power: num(v) })} />
        </Field>
      )}
      <Field label="Ausführungstyp" className="col-span-2">
        <div className="font-mono text-[13px] font-semibold text-fg">{result || '—'}</div>
      </Field>
    </Section>
  )
}

function DeviceFields({ device, kind, poles }: { device: Device; kind: SymbolKind; poles: number }) {
  const up = (patch: Partial<Device>) => updateDevice(device.id, patch)
  return (
    <>
      <ExecutionFields device={device} kind={kind} poles={poles} />
      <Section title="Betriebsmittel">
        <Field label="BMK" htmlFor="i-bmk">
          <CommitInput id="i-bmk" mono value={device.bmk} onCommit={(v) => up({ bmk: v })} />
        </Field>
        <Field label="Ort" htmlFor="i-loc">
          <CommitInput id="i-loc" mono value={device.location} onCommit={(v) => up({ location: v })} />
        </Field>
        <Field label="Funktionstext" htmlFor="i-fn" className="col-span-2">
          <CommitInput id="i-fn" value={device.function} onCommit={(v) => up({ function: v })} />
        </Field>
        <Field label="Verteiler" htmlFor="i-dist">
          <CommitInput id="i-dist" mono value={device.distributor} onCommit={(v) => up({ distributor: v })} />
        </Field>
        <Field label="Montage" htmlFor="i-mount">
          <Select id="i-mount" value={device.mount} onChange={(e) => up({ mount: e.target.value as Device['mount'] })}>
            <option value="rail">Hutschiene</option>
            <option value="door">Tür</option>
            <option value="field">Feld</option>
          </Select>
        </Field>
      </Section>
      <Section title="Artikel">
        <div className="col-span-2 flex items-center gap-2 rounded-md border border-line bg-app p-2">
          <div className="min-w-0 flex-1">
            {device.articleNo ? (
              <>
                <div className="truncate font-mono text-[12px] text-fg">{device.articleNo}</div>
                <div className="truncate text-[11px] text-muted">
                  {device.manufacturer} · {device.type}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-warn">Kein Artikel zugeordnet</div>
            )}
          </div>
          <Button size="sm" icon={Link2} onClick={() => useUiStore.getState().openDialog({ type: 'articlePicker', deviceId: device.id })}>
            {device.articleNo ? 'Ändern' : 'Zuordnen'}
          </Button>
        </div>
        <Field label="Bemessungsstrom">
          <div className="font-mono text-[12px] text-fg-2">{device.ratedCurrent != null ? `${device.ratedCurrent} A` : '—'}</div>
        </Field>
        <Field label="AC-3 Leistung">
          <div className="font-mono text-[12px] text-fg-2">{device.ac3Power != null ? `${device.ac3Power} kW` : '—'}</div>
        </Field>
        <Field label="Spulenspannung">
          <div className="font-mono text-[12px] text-fg-2">{device.coilVoltage || '—'}</div>
        </Field>
        <Field label="Breite">
          <div className="font-mono text-[12px] text-fg-2">{device.widthTE ? `${device.widthTE} TE` : '—'}</div>
        </Field>
      </Section>
    </>
  )
}

function Properties() {
  const ids = useSelectionStore((s) => s.ids)
  const page = useActivePage()
  const devices = useDocumentStore((s) => s.document?.devices)
  const xrefMode = useDocumentStore((s) => s.document?.xrefMode ?? 'group')
  const doc = useDocumentStore((s) => s.document)
  const presets = presetsOf(useDocumentStore((s) => s.document))
  const results = useValidationStore((s) => s.results)

  if (!page) return null
  if (!ids.length) {
    return (
      <div className="flex flex-col">
        <Section title="Seite">
          <Field label="Nummer">
            <div className="font-mono text-[12px]">{page.number}</div>
          </Field>
          <Field label="Revision">
            <div className="font-mono text-[12px]">{page.revision}</div>
          </Field>
          <Field label="Titel" className="col-span-2">
            <div className="text-[12px]">{page.title}</div>
          </Field>
          <div className="col-span-2">
            <Button size="sm" onClick={() => runCommand('page.properties', page.id)}>
              Seiteneigenschaften…
            </Button>
          </div>
        </Section>
        <Section title="Querverweise">
          <Field label="Verweis über" htmlFor="i-xref" className="col-span-2">
            <Select
              id="i-xref"
              value={xrefMode}
              onChange={(e) => {
                const xrefMode = e.target.value as 'group' | 'page'
                useDocumentStore.getState().commit('Verweismodus geändert', (d) => ({ ...d, xrefMode }))
              }}
            >
              <option value="group">Gruppennummer + Koordinate</option>
              <option value="page">Seitennummer + Koordinate</option>
            </Select>
          </Field>
        </Section>
        <Empty icon={MousePointerClick} title="Nichts ausgewählt">
          Objekt im Plan anklicken oder mit gedrückter Maustaste einen Auswahlrahmen ziehen.
        </Empty>
      </div>
    )
  }
  if (ids.length > 1) {
    const selected = ids.map((id) => findObject(page, id)).filter((o): o is CadObject => !!o)
    return <MultiProperties objects={selected} />
  }

  const obj = findObject(page, ids[0])
  if (!obj) return null
  const issues = issuesForTarget(results, [obj.id, ...(obj.type === 'symbol' && obj.deviceId ? [obj.deviceId] : [])])

  return (
    <div className="flex flex-col">
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 border-b border-line p-2">
          {issues.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => goToResult(r)} className={cn('flex w-full items-start gap-2 rounded-md p-2 text-left text-[12px]', r.severity === 'error' ? 'bg-error-soft' : 'bg-warn-soft')}>
                <SeverityIcon severity={r.severity} className="mt-0.5" />
                <span>{r.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(obj.type === 'diagramBlock' || obj.type === 'rectangle' || obj.type === 'ellipse' || obj.type === 'image') && <WiringProperties obj={obj} />}
{obj.type === 'line' && page?.kind === 'wiring' && <LineProperties line={obj} />}

      {obj.type === 'symbol' && (
        <>
          <Section title="Symbol">
            <Field label="Typ">
              <div className="text-[12px]">{obj.kind}</div>
            </Field>
            <Field label="Drehung" htmlFor="i-rot">
              <Select id="i-rot" value={obj.rotation} onChange={(e) => updateObject(obj.id, { rotation: Number(e.target.value) as Rotation })}>
                {[0, 90, 180, 270].map((r) => (
                  <option key={r} value={r}>
                    {r}°
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Position X">
              <div className="font-mono text-[12px] text-fg-2">{(obj.position.x / 10).toFixed(1)} mm</div>
            </Field>
            <Field label="Position Y">
              <div className="font-mono text-[12px] text-fg-2">{(obj.position.y / 10).toFixed(1)} mm</div>
            </Field>
            {obj.kind === 'outlet' && (() => {
              const count = obj.wayCount ?? obj.poles
              const naming = obj.wayNaming ?? 'numbered'
              const names = outletPinNames({ ...obj, wayCount: count, wayNaming: naming })
              const phases = count >= 3 ? count - 2 : count
              return (
                <>
                  <Field label="Leiteranzahl" htmlFor="i-ways">
                    <Select id="i-ways" value={count} onChange={(e) => updateObject(obj.id, { wayCount: Number(e.target.value) }, 'Leiteranzahl geändert')}>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>
                          {n}-polig
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Leiterbezeichnung" htmlFor="i-wname">
                    <Select id="i-wname" value={naming} onChange={(e) => updateObject(obj.id, { wayCount: count, wayNaming: e.target.value as 'numbered' | 'phases' | 'custom', ...(e.target.value === 'custom' ? { pinNames: names } : {}) })}>
                      <option value="numbered">Durchnummeriert</option>
                      <option value="phases">L1, L2, L3</option>
                      <option value="custom">Benutzerdefiniert</option>
                    </Select>
                  </Field>
                  {naming === 'custom' &&
                    Array.from({ length: phases }, (_, i) => (
                      <Field key={i} label={`Leiter ${i + 1}`} htmlFor={`i-wn${i}`}>
                        <CommitInput
                          id={`i-wn${i}`}
                          mono
                          value={names[i]}
                          onCommit={(v) => {
                            const next = [...names]
                            next[i] = v
                            updateObject(obj.id, { pinNames: next }, 'Leiterbezeichnung geändert')
                          }}
                        />
                      </Field>
                    ))}
                  <p className="col-span-2 font-mono text-[11px] text-muted">{names.join(' · ')}</p>
                </>
              )
            })()}
            {obj.kind === 'crossMark' && (
              <>
                <Field label="Leiteranzahl" htmlFor="i-cmw">
                  <Select id="i-cmw" value={obj.wayCount ?? 4} onChange={(e) => updateObject(obj.id, { wayCount: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Text" htmlFor="i-cmt">
                  <CommitInput id="i-cmt" mono value={obj.markText ?? '10mm²'} onCommit={(v) => updateObject(obj.id, { markText: v })} />
                </Field>
              </>
            )}
            {obj.kind === 'terminal' && (
              <Field label="Klemmennummer" htmlFor="i-tno">
          <CommitInput id="i-tno" mono value={obj.terminalNo ?? ''} onCommit={(v) => updateObject(obj.id, { terminalNo: v })} />
            </Field>
          )}
          {obj.kind === 'terminal' && (
            <Field label="Nummernrichtung" htmlFor="i-tnor">
              <Select id="i-tnor" value={obj.terminalNoOrientation ?? 'rotated'} onChange={(e) => updateObject(obj.id, { terminalNoOrientation: e.target.value as 'normal' | 'rotated' }, 'Nummernrichtung geändert')}>
                <option value="normal">Normal (links → rechts)</option>
                <option value="rotated">Gedreht (unten → oben)</option>
              </Select>
            </Field>
          )}
          {obj.kind === 'terminal' && (
            <Field label="Anschlussnummern" htmlFor="i-hpin">
              <Select id="i-hpin" value={obj.hidePinNumbers ? 'hide' : 'show'} disabled={!obj.terminalNo?.trim()} onChange={(e) => updateObject(obj.id, { hidePinNumbers: e.target.value === 'hide' }, 'Anschlussnummern geändert')}>
                <option value="show">Anzeigen</option>
                <option value="hide">Ausblenden</option>
              </Select>
            </Field>
          )}
          <Field label="Beschriftungsposition" htmlFor="i-lside">
            <Select id="i-lside" value={obj.labelSide ?? 'left'} onChange={(e) => {
              const labelSide = e.target.value as 'left' | 'right' | 'custom'
              const at = symbolLabelPosition(obj)
              updateObject(obj.id, { labelSide, ...(labelSide === 'custom' ? { labelOffset: obj.labelOffset ?? { x: at.x - obj.position.x, y: at.y - obj.position.y }, labelAnchor: obj.labelAnchor ?? at.anchor } : {}) }, 'Beschriftungsposition geändert')
            }}>
              <option value="left">Links</option>
              <option value="right">Rechts</option>
              <option value="custom">Benutzerdefiniert</option>
            </Select>
          </Field>
          {obj.labelSide === 'custom' && <p className="col-span-2 text-[11px] text-muted">Ankerpunkt der Beschriftung im Plan mit der Maus ziehen. Esc bricht ab.</p>}
          <Field label="Beschriftung" htmlFor="i-lrot">
            <Select id="i-lrot" value={obj.labelRotation ?? 0} onChange={(e) => updateObject(obj.id, { labelRotation: Number(e.target.value) === 90 ? 90 : 0 })}>
              <option value={0}>Waagerecht</option>
              <option value={90}>Senkrecht (90°)</option>
            </Select>
          </Field>
          </Section>
          {(() => {
            const dev = devices?.find((d) => d.id === obj.deviceId)
            return dev ? <DeviceFields device={dev} kind={obj.kind} poles={obj.poles} /> : <div className="p-3 text-[12px] text-warn">Kein Betriebsmittel verknüpft.</div>
          })()}
        </>
      )}

      {(obj.type === 'wire' || obj.type === 'potential') && (
        <Section title="Verbindung">
          <div className="col-span-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
              <span id="i-preset-label">Leiterstil-Vorlage</span>
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  useUiStore.getState().set({ dataPane: 'wireStyles' })
                  runCommand('ws.data')
                }}
              >
                Bearbeiten…
              </button>
            </div>
            <div role="radiogroup" aria-labelledby="i-preset-label" className="flex flex-col gap-0.5">
              {presets.map((p) => {
                const on = obj.preset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => updateObject(obj.id, presetPatch(p), 'Leiterstil zugewiesen')}
                    className={cn('flex h-7 items-center gap-2 rounded-md border px-2 text-left text-[12px]', on ? 'border-accent bg-accent-soft text-fg' : 'border-transparent text-fg-2 hover:bg-hover')}
                  >
                    <WireSwatch preset={p} />
                    <span className="min-w-0 flex-1 truncate">{p.label}</span>
                    <span className="font-mono text-[10.5px] text-muted">{p.crossSection}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <PotentialSelect obj={obj} />
          <Field label="Beschriftung" htmlFor="i-lbl">
            <CommitInput id="i-lbl" mono value={obj.label ?? (obj.type === 'potential' ? obj.name : '')} onCommit={(v) => updateObject(obj.id, { label: v.trim() }, 'Beschriftung geändert')} />
          </Field>
          <Field label="Beschriftungsposition" htmlFor="i-lpos" className="col-span-2">
            <Select id="i-lpos" value={obj.labelPos ?? 'auto'} onChange={(e) => updateObject(obj.id, conductorLabelPosPatch(obj, e.target.value as ConductorLabelPos, page ? railTips(obj, page) : undefined), 'Beschriftungsposition geändert')}>
              {CONDUCTOR_LABEL_POSITIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value === 'auto' && obj.type === 'potential' ? 'Beidseitig oben' : o.label}
                </option>
              ))}
            </Select>
          </Field>
          {obj.labelPos === 'custom' && <p className="col-span-2 text-[11px] text-muted">Ankerpunkt der Beschriftung im Plan mit der Maus ziehen.</p>}
          <Field label="Querschnitt" htmlFor="i-cs">
            <CommitInput id="i-cs" mono value={obj.crossSection ?? ''} onCommit={(v) => updateObject(obj.id, { crossSection: v })} />
          </Field>
          <Field label="Farbe" htmlFor="i-col" className="col-span-2">
            <Select id="i-col" value={obj.color ?? 'auto'} onChange={(e) => updateObject(obj.id, { color: e.target.value as WireColor, preset: undefined })}>
              {obj.color?.startsWith('#') && <option value={obj.color}>Benutzerdefiniert ({obj.color})</option>}
                  {(Object.keys(WIRE_COLOR_LABELS) as WireColor[]).map((c) => (
                <option key={c} value={c}>
                  {WIRE_COLOR_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Linienart" htmlFor="i-ls">
            <Select id="i-ls" value={obj.lineStyle ?? 'solid'} onChange={(e) => updateObject(obj.id, { lineStyle: e.target.value as LineStyle, preset: undefined })}>
              {(Object.keys(LINE_STYLE_LABELS) as LineStyle[]).map((s) => (
                <option key={s} value={s}>
                  {LINE_STYLE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stärke" htmlFor="i-lw">
            <Select id="i-lw" value={obj.weight ?? ''} onChange={(e) => updateObject(obj.id, { weight: (e.target.value || undefined) as WireWeight | undefined, preset: undefined })}>
              <option value="">
                {`Automatisch (${WIRE_WEIGHT_LABELS[styleResolver(doc)({ ...obj, weight: undefined }, obj.type === 'potential' ? obj.name : obj.potential).weight]})`}
              </option>
              {(Object.keys(WIRE_WEIGHT_LABELS) as WireWeight[]).map((s) => (
                <option key={s} value={s}>
                  {WIRE_WEIGHT_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stützpunkte">
            <div className="font-mono text-[12px] text-fg-2">{obj.type === 'wire' ? obj.points.length : 2}</div>
          </Field>
          <ApplyConnected id={obj.id} />
        </Section>
      )}

      {obj.type === 'text' && obj.style === 'xref' && (
        <Section title="Querverweis">
          <Field label="Verweistext" htmlFor="i-xref" className="col-span-2">
            <CommitInput id="i-xref" mono value={obj.text} onCommit={(v) => updateObject(obj.id, { text: v.trim() || obj.text }, 'Querverweis geändert')} />
          </Field>
          <Field label="Anzeige">
            <div className="font-mono text-[12px]">{doc ? xrefDisplay(doc, page, obj) : obj.text}</div>
          </Field>
          <Field label="Seite">
            <div className="font-mono text-[12px] text-fg-2">{obj.xref?.side === 'left' ? 'Anfang' : 'Ende'}</div>
          </Field>
          <p className="col-span-2 text-[11px] text-muted">Seiten- oder Gruppennummer: ohne Auswahl im Abschnitt „Querverweise“ umschalten.</p>
          <Button className="col-span-2" onClick={() => runCommand('xref.goto', obj.id)}>Gehe zu Verweisziel</Button>
        </Section>
      )}

      {obj.type === 'text' && obj.style !== 'xref' && (
        <Section title="Text">
          <Field label="Inhalt (mehrzeilig)" htmlFor="i-txt" className="col-span-2">
            <CommitTextarea id="i-txt" value={obj.text} onCommit={(v) => updateObject(obj.id, { text: v }, 'Text geändert')} />
          </Field>
          <Field label="Ausrichtung" className="col-span-2">
            <Segmented
              label="Ausrichtung"
              value={obj.anchor}
              onChange={(v) => updateObject(obj.id, { anchor: v }, 'Ausrichtung geändert')}
              options={[
                { value: 'start', label: 'Links' },
                { value: 'middle', label: 'Zentriert' },
                { value: 'end', label: 'Rechts' },
              ]}
            />
          </Field>
          <Field label="Größe" htmlFor="i-ts">
            <CommitInput id="i-ts" mono type="number" value={String(obj.size)} onCommit={(v) => updateObject(obj.id, { size: Math.max(1, Number(v) || obj.size) })} />
          </Field>
        </Section>
      )}

      {obj.type === 'potential' && (
        <Section title="Potentialschiene">
          {(obj.xrefLeft || obj.xrefRight) && <Button className="col-span-2" onClick={() => detachRailReferences(obj.id)}>Querverweise frei verschiebbar machen</Button>}
          <Field label="Anfang (mm)" htmlFor="i-x1">
            <CommitInput
              id="i-x1"
              mono
              type="number"
              value={(obj.x1 / 10).toFixed(1)}
              onCommit={(v) => {
                const x = Math.round(Number(v) * 10)
                if (Number.isFinite(x) && x < obj.x2 - 50) updateObject(obj.id, { x1: Math.max(0, x) }, 'Schienenlänge geändert')
              }}
            />
          </Field>
          <Field label="Ende (mm)" htmlFor="i-x2">
            <CommitInput
              id="i-x2"
              mono
              type="number"
              value={(obj.x2 / 10).toFixed(1)}
              onCommit={(v) => {
                const x = Math.round(Number(v) * 10)
                if (Number.isFinite(x) && x > obj.x1 + 50) updateObject(obj.id, { x2: x }, 'Schienenlänge geändert')
              }}
            />
          </Field>
          <Field label="Höhe">
            <div className="font-mono text-[12px] text-fg-2">{(obj.y / 10).toFixed(1)} mm</div>
          </Field>
          <Field label="Länge">
            <div className="font-mono text-[12px] text-fg-2">{((obj.x2 - obj.x1) / 10).toFixed(1)} mm</div>
          </Field>
          <p className="col-span-2 text-[11px] text-muted">Tipp: Die Enden lassen sich auch direkt im Plan an den Griffpunkten ziehen.</p>
        </Section>
      )}

      {obj.type === 'junction' && <div className="p-3 text-[12px] text-fg-2">Verbindungspunkt</div>}
    </div>
  )
}

function ValidationList() {
  const results = useValidationStore((s) => s.results)
  const running = useValidationStore((s) => s.running)
  const lastRun = useValidationStore((s) => s.lastRun)
  const cursor = useValidationStore((s) => s.cursor)
  const sorted = useMemo(() => {
    const rank = { error: 0, warning: 1, info: 2 }
    return [...results].sort((a, b) => rank[a.severity] - rank[b.severity])
  }, [results])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11.5px] text-muted">
        {running ? <Spinner /> : <ShieldCheck className="size-3.5 text-ok" aria-hidden />}
        <span>{lastRun ? `Live-Prüfung · ${fmtTime(lastRun)}` : 'Noch nicht geprüft'}</span>
        <Button size="sm" variant="ghost" icon={RefreshCw} className="ml-auto" onClick={() => runCommand('check.run')}>
          Prüfen
        </Button>
      </div>
      {sorted.length === 0 ? (
        <Empty icon={ShieldCheck} title="Keine Befunde">
          Das Projekt besteht alle aktiven Prüfregeln.
        </Empty>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {sorted.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  useValidationStore.getState().setCursor(results.indexOf(r))
                  goToResult(r)
                }}
                className={cn('flex w-full items-start gap-2 rounded-md p-2 text-left hover:bg-hover', results[cursor]?.id === r.id && 'bg-accent-soft')}
              >
                <SeverityIcon severity={r.severity} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-fg">{r.message}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{r.detail}</span>
                </span>
                <Badge className="shrink-0 font-mono">{r.code}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Inspector() {
  const tab = useUiStore((s) => s.inspectorTab)
  const counts = useValidationStore((s) => s.results.filter((r) => r.severity !== 'info').length)
  return (
    <aside aria-label="Eigenschaften und Prüfung" className="flex w-72 shrink-0 flex-col border-l border-line bg-panel">
      <Tabs<InspectorTab>
        label="Inspektor"
        value={tab}
        onChange={(v) => useUiStore.getState().set({ inspectorTab: v })}
        className="px-1"
        tabs={[
          { value: 'properties', label: 'Eigenschaften' },
          { value: 'validation', label: 'Prüfung', count: counts },
        ]}
      />
      {tab === 'properties' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Properties />
        </div>
      ) : (
        <ValidationList />
      )}
    </aside>
  )
}
