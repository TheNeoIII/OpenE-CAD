import { useLibraryStore } from '@/stores/libraryStore'
import { wireStroke } from '@/features/schematic/models/wireStyles'
import { fieldCls } from './fields'

export function ConductorColorSelect({ color, onChange }: { color?: string; onChange: (color: string) => void }) {
  const presets = useLibraryStore((s) => s.wirePresets)
  const match = presets.find((p) => wireStroke(p.color) === color)
  return <label className="flex flex-col gap-1 text-[11px] text-muted">
    Farbe aus Leitervorlage
    <select className={fieldCls} value={match?.id ?? ''} onChange={(e) => {
      const preset = presets.find((p) => p.id === e.target.value)
      if (preset) onChange(wireStroke(preset.color))
    }}>
      <option value="" disabled>Vorlage auswählen …</option>
      {presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
    </select>
    <span>Übernimmt die ansichtsabhängige Leiterfarbe. Stärke und Linienart bleiben unverändert.</span>
  </label>
}
