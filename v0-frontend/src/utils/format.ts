let counter = 0

export function uid(prefix: string) {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

const numberFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })
const dateTimeFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' })
const dateFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })
const timeFmt = new Intl.DateTimeFormat('de-DE', { timeStyle: 'short' })

export const fmtNumber = (n: number | null | undefined) => (n == null ? '—' : numberFmt.format(n))
export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso))
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso))
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso))

/** Deterministic PRNG so generated mock data is stable across reloads. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}
