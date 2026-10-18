import { MousePointerClick } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Empty, Field, Input, Segmented, Select } from '@/components/ui/primitives'
import { useDocumentStore } from '@/stores/documentStore'
import type { CadObject, CadPotential, CadSymbol, CadText, CadWire, LineStyle, Rotation, WireColor, WireWeight } from '@/types/cad'
import type { Device } from '@/types/device'
import { cn } from '@/utils/cn'
import { updateDevices, updateObjects, updateObjectsWith } from '../actions'
import { CHARACTERISTICS, executionKind } from '../models/execution'
import { symbolLabelPosition } from '../models/labels'
import { LINE_STYLE_LABELS, potentialDefsOf, presetPatch, presetsOf, WIRE_COLOR_LABELS, WIRE_WEIGHT_LABELS } from '../models/wireStyles'
import { WireSwatch } from './WireSwatch'

const MIXED = Symbol('mixed')
type Mixed<T> = T | typeof MIXED
const MIXED_OPTION = '__mixed__'
const CUSTOM_OPTION = '__custom__'

function common<T>(values: T[]): Mixed<T> {
  return values.every((v) => v === values[0]) ? values[0] : MIXED
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  )
}

/** Select that shows "— verschieden —" for mixed values and only writes when the user picks something. */
function MultiSelect({ id, value, onChange, children, className }: { id: string; value: Mixed<string>; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  const mixed = value === MIXED
  return (
    <Select id={id} className={cn(mixed && 'text-muted italic', className)} value={mixed ? MIXED_OPTION : value} onChange={(e) => e.target.value !== MIXED_OPTION && onChange(e.target.value)}>
      {mixed && (
        <option value={MIXED_OPTION} disabled>
          — verschieden —
        </option>
      )}
      {children}
    </Select>
  )
}

/** Text input that leaves differing values untouched until the user actually types. */
function MultiInput({ id, value, onCommit, mono, type = 'text' }: { id: string; value: Mixed<string>; onCommit: (v: string) => void; mono?: boolean; type?: string }) {
  const mixed = value === MIXED
  const shown = mixed ? '' : value
  const [draft, setDraft] = useState(shown)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    setDraft(shown)
    setDirty(false)
  }, [shown, mixed])
  const commit = () => {
    if (!dirty || (!mixed && draft === shown)) return setDirty(false)
    onCommit(draft)
    setDirty(false)
  }
  return (
    <Input
      id={id}
      type={type}
      mono={mono}
      value={draft}
      placeholder={mixed ? 'Verschiedene Werte' : undefined}
      onChange={(e) => {
        setDraft(e.target.value)
        setDirty(true)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          setDraft(shown)
          setDirty(false)
        }
      }}
    />
  )
}

const num = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || !Number.isFinite(n) ? null : n
}
const str = (v: unknown) => (v == null ? '' : String(v))

function SymbolFields({ symbols }: { symbols: CadSymbol[] }) {
  const ids = symbols.map((s) => s.id)
  const kind = common(symbols.map((s) => s.kind))
  return (
    <Section title="Symbol">
      <Field label="Typ">
        <div className="text-[12px]">{kind === MIXED ? 'Gemischt' : kind}</div>
      </Field>
      <Field label="Drehung" htmlFor="m-rot">
        <MultiSelect id="m-rot" value={common(symbols.map((s) => String(s.rotation)))} onChange={(v) => updateObjects(ids, { rotation: Number(v) as Rotation }, `Drehung für ${ids.length} Symbole geändert`)}>
          {[0, 90, 180, 270].map((r) => (
            <option key={r} value={r}>
              {r}°
            </option>
          ))}
        </MultiSelect>
      </Field>
      <Field label="Beschriftungsposition" htmlFor="m-lside">
        <MultiSelect
          id="m-lside"
          value={common(symbols.map((s) => s.labelSide ?? 'left'))}
          onChange={(v) => {
            const labelSide = v as 'left' | 'right' | 'custom'
            updateObjectsWith(
              ids,
              (o) => {
                const s = o as CadSymbol
                if (labelSide !== 'custom') return { labelSide } as Partial<CadObject>
                const at = symbolLabelPosition(s)
                return { labelSide, labelOffset: s.labelOffset ?? { x: at.x - s.position.x, y: at.y - s.position.y }, labelAnchor: s.labelAnchor ?? at.anchor } as Partial<CadObject>
              },
              'Beschriftungsposition geändert',
            )
          }}
        >
          <option value="left">Links</option>
          <option value="right">Rechts</option>
          <option value="custom">Benutzerdefiniert</option>
        </MultiSelect>
      </Field>
      <Field label="Beschriftung" htmlFor="m-lrot">
        <MultiSelect id="m-lrot" value={common(symbols.map((s) => String(s.labelRotation ?? 0)))} onChange={(v) => updateObjects(ids, { labelRotation: Number(v) === 90 ? 90 : 0 } as Partial<CadObject>, 'Beschriftungsausrichtung geändert')}>
          <option value="0">Waagerecht</option>
          <option value="90">Senkrecht (90°)</option>
        </MultiSelect>
      </Field>
    </Section>
  )
}

function DeviceFields({ devices, symbols }: { devices: Device[]; symbols: CadSymbol[] }) {
  const ids = devices.map((d) => d.id)
  const up = (patch: Partial<Device>, label?: string) => updateDevices(ids, patch, label ?? `${ids.length} Betriebsmittel geändert`)
  const field = <K extends keyof Device>(key: K) => common(devices.map((d) => str(d[key])))
  const ek = common(symbols.map((s) => executionKind(s.kind)))
  const execution = ek !== MIXED ? ek : null
  return (
    <>
      {execution && (
        <Section title="Ausführung">
          {execution === 'breaker' && (
            <Field label="Charakteristik" htmlFor="m-char">
              <MultiSelect id="m-char" value={field('characteristic')} onChange={(v) => up({ characteristic: v || undefined }, 'Ausführung geändert')}>
                <option value="">—</option>
                {CHARACTERISTICS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </MultiSelect>
            </Field>
          )}
          {(execution === 'breaker' || execution === 'rcd') && (
            <Field label="Nennstrom (A)" htmlFor="m-in">
              <MultiInput id="m-in" mono value={common(devices.map((d) => str(d.nominalCurrent ?? d.ratedCurrent)))} onCommit={(v) => up({ nominalCurrent: num(v) }, 'Ausführung geändert')} />
            </Field>
          )}
          {execution === 'rcd' && (
            <Field label="Fehlerstrom (mA)" htmlFor="m-idn">
              <MultiInput id="m-idn" mono value={field('residualCurrent')} onCommit={(v) => up({ residualCurrent: num(v) }, 'Ausführung geändert')} />
            </Field>
          )}
          {execution === 'coil' && (
            <Field label="Spulenspannung" htmlFor="m-uc">
              <MultiInput id="m-uc" mono value={field('coilVoltage')} onCommit={(v) => up({ coilVoltage: v }, 'Ausführung geändert')} />
            </Field>
          )}
          {execution === 'motor' && (
            <Field label="Leistung (kW)" htmlFor="m-pw">
              <MultiInput id="m-pw" mono value={field('ac3Power')} onCommit={(v) => up({ ac3Power: num(v) }, 'Ausführung geändert')} />
            </Field>
          )}
        </Section>
      )}
      <Section title={`Betriebsmittel (${devices.length})`}>
        <Field label="BMK" htmlFor="m-bmk">
          <MultiInput id="m-bmk" mono value={field('bmk')} onCommit={(v) => up({ bmk: v })} />
        </Field>
        <Field label="Ort" htmlFor="m-loc">
          <MultiInput id="m-loc" mono value={field('location')} onCommit={(v) => up({ location: v })} />
        </Field>
        <Field label="Funktionstext" htmlFor="m-fn" className="col-span-2">
          <MultiInput id="m-fn" value={field('function')} onCommit={(v) => up({ function: v })} />
        </Field>
        <Field label="Verteiler" htmlFor="m-dist">
          <MultiInput id="m-dist" mono value={field('distributor')} onCommit={(v) => up({ distributor: v })} />
        </Field>
        <Field label="Montage" htmlFor="m-mount">
          <MultiSelect id="m-mount" value={field('mount')} onChange={(v) => up({ mount: v as Device['mount'] })}>
            <option value="rail">Hutschiene</option>
            <option value="door">Tür</option>
            <option value="field">Feld</option>
          </MultiSelect>
        </Field>
      </Section>
    </>
  )
}

function ConductorFields({ conductors }: { conductors: (CadWire | CadPotential)[] }) {
  const doc = useDocumentStore((s) => s.document)
  const presets = presetsOf(doc)
  const defs = potentialDefsOf(doc)
  const ids = conductors.map((c) => c.id)
  const n = ids.length
  const potential = common(conductors.map((c) => (c.type === 'wire' ? c.potential ?? '' : c.name)))
  const hasWire = conductors.some((c) => c.type === 'wire')
  const knownPotential = potential === MIXED || potential === '' || defs.some((d) => d.name === potential)
  const [customPotential, setCustomPotential] = useState(!knownPotential)
  const color = common(conductors.map((c) => c.color ?? 'auto'))
  const preset = common(conductors.map((c) => c.preset ?? ''))
  const setPotential = (v: string) =>
    updateObjectsWith(ids, (o) => (o.type === 'wire' ? { potential: v || null } : { name: v || (o as CadPotential).name }) as Partial<CadObject>, `Potential für ${n} Leiter geändert`)

  return (
    <Section title={`Verbindung (${n})`}>
      <div className="col-span-2">
        <div id="m-preset-label" className="mb-1 text-[11px] text-muted">
          Leiterstil-Vorlage{preset === MIXED ? ' · verschieden' : ''}
        </div>
        <div role="radiogroup" aria-labelledby="m-preset-label" className="flex flex-col gap-0.5">
          {presets.map((p) => {
            const on = preset === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => updateObjects(ids, presetPatch(p) as Partial<CadObject>, `Leiterstil für ${n} Leiter zugewiesen`)}
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
      <Field label="Potential" htmlFor="m-pot">
        {customPotential ? (
          <div className="flex gap-1">
            <MultiInput id="m-pot" mono value={potential} onCommit={setPotential} />
            <button type="button" className="shrink-0 rounded px-1.5 text-[11px] text-accent hover:bg-hover" onClick={() => setCustomPotential(false)} aria-label="Potential aus Liste wählen">
              Liste
            </button>
          </div>
        ) : (
          <MultiSelect id="m-pot" className="font-mono" value={potential} onChange={(v) => (v === CUSTOM_OPTION ? setCustomPotential(true) : setPotential(v))}>
            {hasWire && <option value="">— kein —</option>}
            {defs.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
                {d.description ? ` · ${d.description}` : ''}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Eigenes Potential…</option>
          </MultiSelect>
        )}
      </Field>
      <Field label="Beschriftung" htmlFor="m-lbl">
        <MultiInput id="m-lbl" mono value={common(conductors.map((c) => c.label ?? ''))} onCommit={(v) => updateObjects(ids, { label: v.trim() || undefined } as Partial<CadObject>, 'Beschriftung geändert')} />
      </Field>
      <Field label="Querschnitt" htmlFor="m-cs">
        <MultiInput id="m-cs" mono value={common(conductors.map((c) => c.crossSection ?? ''))} onCommit={(v) => updateObjects(ids, { crossSection: v } as Partial<CadObject>, 'Querschnitt geändert')} />
      </Field>
      <Field label="Farbe" htmlFor="m-col" className="col-span-2">
        <MultiSelect id="m-col" value={color} onChange={(v) => updateObjects(ids, { color: v as WireColor, preset: undefined } as Partial<CadObject>, 'Farbe geändert')}>
          {color !== MIXED && color.startsWith('#') && <option value={color}>Benutzerdefiniert ({color})</option>}
          {(Object.keys(WIRE_COLOR_LABELS) as WireColor[]).map((c) => (
            <option key={c} value={c}>
              {WIRE_COLOR_LABELS[c]}
            </option>
          ))}
        </MultiSelect>
      </Field>
      <Field label="Linienart" htmlFor="m-ls">
        <MultiSelect id="m-ls" value={common(conductors.map((c) => c.lineStyle ?? 'solid'))} onChange={(v) => updateObjects(ids, { lineStyle: v as LineStyle, preset: undefined } as Partial<CadObject>, 'Linienart geändert')}>
          {(Object.keys(LINE_STYLE_LABELS) as LineStyle[]).map((s) => (
            <option key={s} value={s}>
              {LINE_STYLE_LABELS[s]}
            </option>
          ))}
        </MultiSelect>
      </Field>
      <Field label="Stärke" htmlFor="m-lw">
        <MultiSelect id="m-lw" value={common(conductors.map((c) => c.weight ?? 'normal'))} onChange={(v) => updateObjects(ids, { weight: v as WireWeight, preset: undefined } as Partial<CadObject>, 'Linienstärke geändert')}>
          {(Object.keys(WIRE_WEIGHT_LABELS) as WireWeight[]).map((s) => (
            <option key={s} value={s}>
              {WIRE_WEIGHT_LABELS[s]}
            </option>
          ))}
        </MultiSelect>
      </Field>
    </Section>
  )
}

function TextFields({ texts }: { texts: CadText[] }) {
  const ids = texts.map((t) => t.id)
  const anchor = common(texts.map((t) => t.anchor))
  return (
    <Section title={`Text (${texts.length})`}>
      <Field label={`Ausrichtung${anchor === MIXED ? ' · verschieden' : ''}`} className="col-span-2">
        <Segmented
          label="Ausrichtung"
          value={(anchor === MIXED ? '' : anchor) as CadText['anchor']}
          onChange={(v) => updateObjects(ids, { anchor: v } as Partial<CadObject>, 'Ausrichtung geändert')}
          options={[
            { value: 'start', label: 'Links' },
            { value: 'middle', label: 'Zentriert' },
            { value: 'end', label: 'Rechts' },
          ]}
        />
      </Field>
      <Field label="Größe" htmlFor="m-ts">
        <MultiInput
          id="m-ts"
          mono
          type="number"
          value={common(texts.map((t) => String(t.size)))}
          onCommit={(v) => {
            const size = Number(v)
            if (Number.isFinite(size) && size >= 1) updateObjects(ids, { size } as Partial<CadObject>, 'Textgröße geändert')
          }}
        />
      </Field>
    </Section>
  )
}

const MOVE_HINT = 'Gemeinsam verschieben (Pfeiltasten), drehen (R) oder löschen (Entf).'

/** Shared properties for a multi-selection: differing values show as "verschieden" and are only overwritten when edited. */
export function MultiProperties({ objects }: { objects: CadObject[] }) {
  const devices = useDocumentStore((s) => s.document?.devices)
  const types = new Set(objects.map((o) => (o.type === 'potential' ? 'wire' : o.type === 'text' && o.style === 'xref' ? 'xref' : o.type)))
  const group = types.size === 1 ? [...types][0] : null

  const header = (
    <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
      <MousePointerClick className="size-3.5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-fg">{objects.length} Objekte ausgewählt</div>
        <div className="text-[11px] text-muted">Abweichende Werte bleiben erhalten, bis sie bearbeitet werden.</div>
      </div>
    </div>
  )

  if (group === 'symbol') {
    const symbols = objects as CadSymbol[]
    const deviceIds = new Set(symbols.map((s) => s.deviceId).filter(Boolean))
    const linked = devices?.filter((d) => deviceIds.has(d.id)) ?? []
    return (
      <div className="flex flex-col">
        {header}
        <SymbolFields symbols={symbols} />
        {linked.length > 0 && <DeviceFields devices={linked} symbols={symbols.filter((s) => s.deviceId)} />}
      </div>
    )
  }
  if (group === 'wire') {
    return (
      <div className="flex flex-col">
        {header}
        <ConductorFields conductors={objects as (CadWire | CadPotential)[]} />
      </div>
    )
  }
  if (group === 'text') {
    return (
      <div className="flex flex-col">
        {header}
        <TextFields texts={objects as CadText[]} />
      </div>
    )
  }
  return (
    <Empty icon={MousePointerClick} title={`${objects.length} Objekte ausgewählt`}>
      {`Unterschiedliche Objekttypen – keine gemeinsamen Eigenschaften. ${MOVE_HINT}`}
    </Empty>
  )
}
