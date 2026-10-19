import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Badge, Button, Field, Input } from '@/components/ui/primitives'

export function ImportProjectDialog({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const nativeCandidate = file?.name.toLowerCase().endsWith('.oecad')
  return <Dialog title="Projekt importieren" description="Importvorbereitung — noch kein Parser oder Upload verfügbar." onClose={onClose} footer={<Button disabled>Import bestätigen · noch nicht verfügbar</Button>}>
    <div className="space-y-4 text-sm">
      <ol className="flex flex-wrap gap-2 text-xs text-muted" aria-label="Importablauf"><li>1 · Datei</li><li>2 · Analyse</li><li>3 · Vorschau / Mapping</li><li>4 · Bestätigen</li></ol>
      <div className="rounded-lg border border-dashed border-line-strong bg-app p-5" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setFile(event.dataTransfer.files[0] ?? null) }}>
        <Upload className="mb-3 size-5 text-accent" aria-hidden /><Field htmlFor="import-file" label="Datei auswählen oder hier ablegen"><Input id="import-file" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field>
      </div>
      {file && <div role="status" className="rounded-md border border-line p-3"><p className="break-all font-medium">{file.name}</p><p className="mt-1 text-xs text-muted">{file.size.toLocaleString('de-DE')} Bytes · {nativeCandidate ? 'OpenE-CAD-Kandidat anhand der Endung; Inhalt nicht geprüft.' : 'Unbekanntes / nicht unterstütztes Format.'}</p><p className="mt-2 text-xs text-warn">Keine Analyse durchgeführt. Kein Upload, keine Änderung der Originaldatei und kein Projekt angelegt.</p></div>}
      <div className="flex flex-wrap gap-2"><Badge>.oecad · vorgesehen</Badge><Badge>ELCAD · geplant</Badge><Badge>EPLAN · geplant</Badge></div>
      <p className="text-xs text-muted">Mapping, Warnungen und bestätigter Import folgen nach verifizierten Parsern und serverseitiger Staging-Pipeline. Dateiendungen allein belegen kein unterstütztes Format.</p>
    </div>
  </Dialog>
}
