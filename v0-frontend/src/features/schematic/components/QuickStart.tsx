import { ChevronDown, ChevronUp } from 'lucide-react'
import { runCommand } from '@/commands/registry'
import { useSettingsStore } from '@/stores/settingsStore'

const ENTRIES: { label: string; keys: string; command?: string }[] = [
  { label: 'Suchen / Befehl', keys: 'Ctrl K', command: 'help.palette' },
  { label: 'Einfügen', keys: 'I', command: 'insert.symbol' },
  { label: 'Leitung', keys: 'W', command: 'tool.wire' },
  { label: 'Kopieren / Einfügen', keys: 'Ctrl C / V' },
  { label: 'Rückgängig', keys: 'Ctrl Z', command: 'edit.undo' },
  { label: 'Ansicht wechseln', keys: 'Alt 1–5' },
]

export function QuickStart() {
  const open = useSettingsStore((s) => s.quickStart)
  const toggle = () => useSettingsStore.getState().toggle('quickStart')

  return (
    <section className="shrink-0 border-t border-line px-3 py-2" aria-label="Schnellstart">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center justify-between py-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted hover:text-fg">
        Schnellstart
        {open ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronUp className="size-3.5" aria-hidden />}
      </button>
      {open && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {ENTRIES.map((e) => (
            <li key={e.label}>
              <button
                type="button"
                disabled={!e.command}
                onClick={() => e.command && runCommand(e.command)}
                className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-[12.5px] text-fg-2 enabled:hover:bg-hover disabled:cursor-default"
              >
                <span>{e.label}</span>
                <kbd className="rounded border border-line bg-panel-2 px-1.5 py-px font-mono text-[10.5px] text-muted">{e.keys}</kbd>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
