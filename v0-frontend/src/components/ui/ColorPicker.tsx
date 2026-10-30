import { Check, Copy } from 'lucide-react'
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { Dialog } from './Dialog'
import { Button } from './primitives'

type Hsv = { h: number; s: number; v: number }
type Rgb = [number, number, number]

const palette = ['#ffffff', '#9ca3af', '#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#8b5a2b']

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))
const round = Math.round

function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, '')
  const full = /^[0-9a-f]{3}$/i.test(raw) ? raw.split('').map((c) => c + c).join('') : raw
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return [0, 1, 2].map((i) => parseInt(full.slice(i * 2, i * 2 + 2), 16)) as Rgb
}
const rgbToHex = (rgb: Rgb) => '#' + rgb.map((c) => round(c).toString(16).padStart(2, '0')).join('')

function rgbToHsv([r, g, b]: Rgb, fallbackHue = 0): Hsv {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const d = max - Math.min(rn, gn, bn)
  let h = fallbackHue
  if (d) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}
function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255
  }
  return [f(5), f(3), f(1)]
}
const hsvToHsl = ({ h, s, v }: Hsv) => {
  const l = v * (1 - s / 2)
  return { h, s: l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l }
}
const hslToHsv = (h: number, s: number, l: number): Hsv => {
  const v = l + s * Math.min(l, 1 - l)
  return { h, s: v ? 2 * (1 - l / v) : 0, v }
}
const rgbToCmyk = ([r, g, b]: Rgb) => {
  const k = 1 - Math.max(r, g, b) / 255
  if (k === 1) return [0, 0, 0, 1]
  return [r, g, b].map((c) => (1 - c / 255 - k) / (1 - k)).concat(k)
}

const numbers = (text: string) => (text.match(/-?\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')))
const inRange = (list: number[], max: number[]) => list.length === max.length && list.every((n, i) => n >= 0 && n <= max[i])

function ColorField({ label, value, onCommit, className, mono = true }: { label: string; value: string; onCommit: (text: string) => boolean; className?: string; mono?: boolean }) {
  const [text, setText] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const commit = () => {
    if (text === null) return
    const ok = onCommit(text)
    setInvalid(!ok)
    if (ok) setText(null)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      commit()
    }
  }
  return (
    <label className={cn('relative block', className)}>
      <span className="pointer-events-none absolute -top-2 left-2 bg-panel px-1 text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <input
        aria-label={`${label}-Wert`}
        aria-invalid={invalid}
        spellCheck={false}
        value={text ?? value}
        onFocus={(e) => { setText(value); e.currentTarget.select() }}
        onChange={(e) => { setText(e.target.value); setInvalid(false) }}
        onBlur={() => { commit(); setText(null); setInvalid(false) }}
        onKeyDown={onKeyDown}
        className={cn('h-9 w-full rounded-md border bg-app px-2.5 pt-0.5 text-[12px] text-fg outline-none focus:border-accent', mono && 'font-mono', invalid ? 'border-error' : 'border-line')}
      />
    </label>
  )
}

function useDrag(onPick: (x: number, y: number) => void) {
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onPick(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height))
  }
  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus(); pick(e) },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e) },
  }
}

function PickerBody({ initial, hsv, setHsv }: { initial: string; hsv: Hsv; setHsv: (next: Hsv | ((prev: Hsv) => Hsv)) => void }) {
  const [copied, setCopied] = useState(false)
  const rgb = hsvToRgb(hsv)
  const hex = rgbToHex(rgb)
  const hsl = hsvToHsl(hsv)
  const cmyk = rgbToCmyk(rgb)
  const pct = (n: number) => `${round(n * 100)}%`
  const setFromRgb = (next: Rgb) => setHsv((prev) => rgbToHsv(next, prev.h))

  const svDrag = useDrag((x, y) => setHsv((prev) => ({ ...prev, s: x, v: 1 - y })))
  const hueDrag = useDrag((x) => setHsv((prev) => ({ ...prev, h: x * 360 })))

  const step = (e: KeyboardEvent) => (e.shiftKey ? 0.1 : 0.01)
  const svKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = step(e)
    const delta = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key]
    if (!delta) return
    e.preventDefault()
    setHsv((prev) => ({ ...prev, s: clamp(prev.s + delta[0]), v: clamp(prev.v + delta[1]) }))
  }
  const hueKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = (e.shiftKey ? 10 : 1) * ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key] ?? 0)
    if (!d) return
    e.preventDefault()
    setHsv((prev) => ({ ...prev, h: clamp(prev.h + d, 0, 360) }))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-44 overflow-hidden rounded-md border border-line">
        <div className="flex w-1/3 shrink-0 flex-col">
          <div className="flex flex-1 items-end p-1.5" style={{ backgroundColor: initial }} title={`Bisher ${initial}`}>
            <span className="rounded bg-black/65 px-1 text-[10px] text-white">Bisher</span>
          </div>
          <div className="flex flex-[2] items-end p-1.5" style={{ backgroundColor: hex }}>
            <span className="rounded bg-black/65 px-1 text-[10px] text-white">Neu</span>
          </div>
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Sättigung und Helligkeit"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={round(hsv.s * 100)}
          aria-valuetext={`Sättigung ${pct(hsv.s)}, Helligkeit ${pct(hsv.v)}`}
          {...svDrag}
          onKeyDown={svKeys}
          className="relative flex-1 cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)`, backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)' }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hex }}
          />
        </div>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Farbton"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={round(hsv.h)}
        aria-valuetext={`${round(hsv.h)} Grad`}
        {...hueDrag}
        onKeyDown={hueKeys}
        className="relative mx-2 h-3 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        />
      </div>

      <div className="flex items-stretch gap-2 pt-1">
        <ColorField
          label="HEX"
          className="flex-1"
          value={hex}
          onCommit={(text) => {
            const next = hexToRgb(text)
            if (next) setFromRgb(next)
            return !!next
          }}
        />
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'HEX-Wert kopiert' : 'HEX-Wert kopieren'}
          title="HEX-Wert kopieren"
          className="inline-flex w-9 items-center justify-center rounded-md border border-line text-muted hover:text-fg focus-visible:outline focus-visible:outline-accent"
        >
          {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-3.5">
        <ColorField
          label="RGB"
          value={rgb.map(round).join(', ')}
          onCommit={(text) => {
            const n = numbers(text)
            if (!inRange(n, [255, 255, 255])) return false
            setFromRgb(n as Rgb)
            return true
          }}
        />
        <ColorField
          label="CMYK"
          value={cmyk.map(pct).join(', ')}
          onCommit={(text) => {
            const n = numbers(text)
            if (!inRange(n, [100, 100, 100, 100])) return false
            const [c, m, y, k] = n.map((v) => v / 100)
            setFromRgb([c, m, y].map((v) => 255 * (1 - v) * (1 - k)) as Rgb)
            return true
          }}
        />
        <ColorField
          label="HSV"
          value={`${round(hsv.h)}°, ${pct(hsv.s)}, ${pct(hsv.v)}`}
          onCommit={(text) => {
            const n = numbers(text)
            if (!inRange(n, [360, 100, 100])) return false
            setHsv({ h: n[0], s: n[1] / 100, v: n[2] / 100 })
            return true
          }}
        />
        <ColorField
          label="HSL"
          value={`${round(hsl.h)}°, ${pct(hsl.s)}, ${pct(hsl.l)}`}
          onCommit={(text) => {
            const n = numbers(text)
            if (!inRange(n, [360, 100, 100])) return false
            setHsv(hslToHsv(n[0], n[1] / 100, n[2] / 100))
            return true
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schnellauswahl">
        {palette.map((c) => (
          <button
            type="button"
            key={c}
            aria-label={`Farbe ${c}`}
            aria-pressed={hex === c}
            onClick={() => setFromRgb(hexToRgb(c)!)}
            className={cn('size-6 rounded border focus-visible:outline focus-visible:outline-accent', hex === c ? 'border-accent ring-1 ring-accent' : 'border-white/20')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * `onPreview` receives every intermediate colour while the dialog is open; `onCancel` must then restore the original.
 * Without them only the applied colour is reported.
 */
export function ColorPicker({ value, onChange, onPreview, onCancel, label, children }: { value: string; onChange: (color: string) => void; onPreview?: (color: string) => void; onCancel?: () => void; label: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState(() => (hexToRgb(value) ? value : '#ffffff'))
  const [hsv, setHsvState] = useState<Hsv>(() => rgbToHsv(hexToRgb(initial)!))
  const setHsv = (next: Hsv | ((prev: Hsv) => Hsv)) => {
    const resolved = typeof next === 'function' ? next(hsv) : next
    setHsvState(resolved)
    onPreview?.(rgbToHex(hsvToRgb(resolved)))
  }
  const close = () => {
    onCancel?.()
    setOpen(false)
  }
  const apply = () => {
    onChange(rgbToHex(hsvToRgb(hsv)))
    setOpen(false)
  }
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        title={label}
        onClick={() => {
          const start = hexToRgb(value) ? value : '#ffffff'
          setInitial(start)
          setHsvState(rgbToHsv(hexToRgb(start)!))
          setOpen(true)
        }}
        className="inline-flex min-h-7 items-center justify-center rounded border border-line p-1 focus-visible:outline focus-visible:outline-accent"
      >
        {children ?? <span className="h-5 w-10 rounded-sm border border-white/20" style={{ backgroundColor: value }} />}
      </button>
      {open &&
        createPortal(
          <Dialog
            title={label}
            description="Farbe im Feld wählen oder HEX-, RGB-, CMYK-, HSV- bzw. HSL-Werte direkt eingeben."
            width="md"
            onClose={close}
            onSubmit={apply}
            footer={<><Button onClick={close}>Abbrechen</Button><Button onClick={apply}>Übernehmen</Button></>}
          >
            <PickerBody initial={initial} hsv={hsv} setHsv={setHsv} />
          </Dialog>,
          document.body,
        )}
    </>
  )
}
